import { parentPort } from 'node:worker_threads'
import { parseRenderable, type ParseRenderableExtra, type RenderableFormatId } from '../domain'
import type { StlParseResult } from '../domain'

/** The worker_threads counterpart to parseWorkerClient.ts - runs the actual
 * CPU-bound parse (occt-import-js tessellation for STEP, the hand-rolled
 * OBJ/3MF/STL parsers) off the main process's event loop. See
 * parseWorkerClient.ts for why this exists; this file only knows how to
 * answer one request at a time on its message channel, not the pooling/
 * lifecycle concerns that live with the client.
 *
 * Only the parse itself happens here - reading the file (and, for OBJ, its
 * MTL sidecars) stays on the main process, since that's already
 * non-blocking async I/O and domain code deliberately has no filesystem
 * access of its own (see resolveMtlSources in index.ts). */

interface ParseRequest {
  id: number
  format: RenderableFormatId
  bytes: Uint8Array
  materialSources?: Map<string, string>
}

interface ParseResponse {
  id: number
  result: StlParseResult
}

if (!parentPort) {
  throw new Error('parseWorker.ts must be run as a worker_thread, not imported directly')
}

const port = parentPort

port.on('message', async ({ id, format, bytes, materialSources }: ParseRequest) => {
  const extra: ParseRenderableExtra = materialSources ? { materialSources } : {}

  let result: StlParseResult
  try {
    result = await parseRenderable(format, bytes, extra)
  } catch (error) {
    // Mirrors what an uncaught throw from parseRenderable would have done
    // when this ran inline in the ipcMain handler (a rejected invoke
    // promise) - see parseWorkerClient.ts's error handling.
    result = {
      ok: false,
      error: 'parse-error',
      message: error instanceof Error ? error.message : String(error)
    }
  }

  const response: ParseResponse = { id, result }
  port.postMessage(response)
})
