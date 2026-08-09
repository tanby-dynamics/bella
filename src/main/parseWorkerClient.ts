import { Worker } from 'node:worker_threads'
import { join } from 'node:path'
import type { ParseRenderableExtra, RenderableFormatId, StlParseResult } from '../domain'

/** Runs each file's parse (see parseWorker.ts) on a dedicated worker_thread
 * instead of inline on the main process. STEP tessellation (occt-import-js)
 * and large OBJ/3MF parses are CPU-bound and, once started, run to
 * completion synchronously - done inline, a parse blocks the main process's
 * single event loop for as long as it takes, and that event loop is what
 * every other ipcMain handler (listFolderContents, projects, ...) runs on
 * too. That froze the whole app: the user couldn't browse to, let alone
 * select, a different file until the current one finished loading.
 * Offloading just the parse here keeps the main process free to keep
 * answering those calls while a file loads in the background.
 *
 * A new selection also needs to preempt whatever's currently loading - only
 * one file is ever previewed at a time (see CONTEXT.md), so a slow file's
 * parse is worthless the instant a different file gets selected, and
 * clicking a small file right after a large one should show the small file
 * immediately rather than queue behind it. A worker stuck inside a
 * synchronous, uninterruptible call (occt-import-js's WASM tessellation has
 * no way to yield) can't be asked to abandon that call - the only way to
 * free it up immediately is to kill the thread outright, so
 * `parseInBackground` terminates and respawns the worker whenever a new
 * request arrives while one is still active. The respawned worker does
 * re-pay occt-import-js's WASM instantiation cost (see loadOcct in
 * stepParser.ts) on its next STEP parse, but that only happens when a
 * parse was actually superseded - back-to-back loads that each run to
 * completion still share and reuse one worker, so the common case
 * (browsing normally, one file at a time) keeps the "load once"
 * optimization intact. */

interface ParseResponse {
  id: number
  result: StlParseResult
}

function supersededResult(): StlParseResult {
  return { ok: false, error: 'parse-error', message: 'Superseded by a newer selection' }
}

let worker: Worker | null = null
// The `sequence` a caller passes in - see parseInBackground - doubles as
// this module's request-correlation id, since by construction only a
// strictly-increasing sequence is ever dispatched to the worker (an
// out-of-order/duplicate one is resolved as superseded before it gets
// that far). No separate incrementing id is needed on top of it.
let activeSequence: number | null = null
// The highest sequence number seen so far, regardless of whether it ended
// up dispatched or not. Guards against the renderer's own requests
// reaching here out of order - selectFile (App.tsx) awaits
// setLastOpenedFolder before calling parseRenderableFile, and that's a
// separate IPC round trip whose latency can vary, so a later selection's
// call can in principle arrive here before an earlier selection's does.
let highestSequenceSeen = 0
const pending = new Map<
  number,
  { resolve: (result: StlParseResult) => void; reject: (error: Error) => void }
>()

function spawnWorker(): Worker {
  const created = new Worker(join(__dirname, 'parseWorker.js'))

  created.on('message', ({ id, result }: ParseResponse) => {
    pending.get(id)?.resolve(result)
    pending.delete(id)
    if (activeSequence === id) activeSequence = null
  })

  created.on('error', (error) => {
    // A worker-level error (as opposed to a per-file parse failure, which
    // arrives as a normal message - see parseWorker.ts's catch) takes the
    // whole thread down, so whatever's still waiting on it needs to be
    // rejected rather than left hanging, and the next parse should spawn a
    // fresh worker rather than retry a dead one.
    for (const { reject } of pending.values()) reject(error)
    pending.clear()
    if (worker === created) worker = null
    activeSequence = null
  })

  created.on('exit', () => {
    if (worker === created) worker = null
  })

  return created
}

function getWorker(): Worker {
  if (!worker) worker = spawnWorker()
  return worker
}

export function parseInBackground(
  format: RenderableFormatId,
  bytes: Buffer,
  sequence: number,
  extra: ParseRenderableExtra = {}
): Promise<StlParseResult> {
  if (sequence <= highestSequenceSeen) {
    // Arrived out of order behind a request App.tsx issued later - already
    // moot, and never touches the worker.
    return Promise.resolve(supersededResult())
  }
  highestSequenceSeen = sequence

  if (worker && activeSequence !== null) {
    // Something's still running - it's now stale, so settle its promise
    // (its caller's own stale-response check, requestSeqRef in App.tsx,
    // would discard the result anyway, but this avoids leaving that call
    // hanging) and kill the worker to free it up immediately for this
    // request rather than letting this one queue up behind it.
    pending.get(activeSequence)?.resolve(supersededResult())
    pending.delete(activeSequence)
    worker.terminate()
    worker = null
  }

  activeSequence = sequence
  return new Promise((resolve, reject) => {
    pending.set(sequence, { resolve, reject })
    getWorker().postMessage({
      id: sequence,
      format,
      bytes,
      materialSources: extra.materialSources
    })
  })
}
