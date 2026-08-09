import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { basename, dirname, join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  listFolderContents,
  extractMtlLibNames,
  addOrActivateProject,
  createStore,
  classifyFormat,
  type RenderMode
} from '../domain'
import { fsDirectoryReader } from './adapters/fsDirectoryReader'
import { electronDirectoryPicker } from './adapters/electronDirectoryPicker'
import { fileStoreBackend } from './adapters/fileStoreBackend'
import {
  IPC,
  type ParseRenderableFileResult,
  type PickAndAddProjectResult,
  type RelocateProjectResult,
  type UpdateCheckResult
} from '../shared/ipc'
import { readFile } from 'node:fs/promises'
import { parseInBackground } from './parseWorkerClient'
import * as updater from './updater'

const store = createStore(fileStoreBackend)

/** Reads every MTL file an OBJ's `mtllib` directive(s) reference, resolved
 * relative to the OBJ's own directory (the only location OBJ exporters ever
 * write a relative mtllib path against). A missing/unreadable MTL is simply
 * left out of the map rather than failing the whole preview - parseObj
 * treats "no materials resolved" as "fall back to Settings.renderColor",
 * not an error. This is the one piece of OBJ+MTL handling that needs fs
 * access, which is why it lives here rather than in the pure domain parser -
 * see objParser.ts. */
async function resolveMtlSources(objPath: string, objBytes: Buffer): Promise<Map<string, string>> {
  const names = extractMtlLibNames(objBytes.toString('utf8'))
  const sources = new Map<string, string>()
  await Promise.all(
    names.map(async (name) => {
      try {
        const bytes = await readFile(join(dirname(objPath), name))
        sources.set(name, bytes.toString('utf8'))
      } catch {
        // Missing/unreadable MTL - the referenced faces fall back to the
        // neutral color (see objParser.ts) rather than the render failing.
      }
    })
  )
  return sources
}

function registerIpcHandlers(): void {
  ipcMain.handle(IPC.listFolderContents, (_event, path: string) =>
    listFolderContents(path, fsDirectoryReader)
  )

  ipcMain.handle(
    IPC.parseRenderableFile,
    // `requestId` is App.tsx's own monotonic selection counter (see
    // requestSeqRef in selectFile) - threaded through as-is so
    // parseWorkerClient can tell which of several in-flight requests is
    // actually the most recent selection, immune to this handler's own
    // awaits (or setProjectState's separate round trip beforehand)
    // reordering when things land here relative to when they were fired.
    async (_event, path: string, requestId: number): Promise<ParseRenderableFileResult> => {
      // classifyFormat is contracted to take a filename, not a full path
      // (see src/domain/formats.ts) - a folder segment containing a dot
      // (e.g. "archive.old") would otherwise be misread as an extension.
      const classification = classifyFormat(basename(path))
      if (classification.kind !== 'renderable') {
        return { ok: false, error: 'not-renderable' }
      }
      const bytes = await readFile(path)

      // The parse itself (not this read) is what's slow enough to matter -
      // see parseWorkerClient.ts for why it runs on a worker_thread rather
      // than inline here, and for how it preempts a still-running parse
      // for a since-superseded selection.
      if (classification.format === 'obj') {
        return parseInBackground('obj', bytes, requestId, {
          materialSources: await resolveMtlSources(path, bytes)
        })
      }

      return parseInBackground(classification.format, bytes, requestId)
    }
  )

  ipcMain.handle(IPC.openExternal, (_event, path: string) => shell.openPath(path))

  ipcMain.handle(IPC.showItemInFolder, (_event, path: string) => shell.showItemInFolder(path))

  ipcMain.handle(IPC.listProjects, () => store.getProjects())

  // Opens the native directory picker (the only way a Project is created -
  // see ADR 0005) and decides what to do with the result: activate an
  // existing Project if the chosen directory is already one (compared via
  // addOrActivateProject's normalized-path check), otherwise append a new
  // one - named from the directory's own basename - and seed its state
  // with the root itself already expanded, so a freshly added Project
  // immediately shows its own contents. Returns null if the user cancels.
  ipcMain.handle(IPC.pickAndAddProject, async (): Promise<PickAndAddProjectResult> => {
    const pickedPath = await electronDirectoryPicker.pickDirectory()
    if (!pickedPath) return null

    const existingProjects = await store.getProjects()
    const { projects, activePath, added } = addOrActivateProject(existingProjects, pickedPath)

    if (added) {
      const project = projects[projects.length - 1]
      await store.addProject(project)
      await store.setProjectState(project.path, { expandedPaths: [project.path] })
    }
    await store.setActiveProjectPath(activePath)

    return { projects, activeProjectPath: activePath, added }
  })

  ipcMain.handle(IPC.removeProject, (_event, path: string) => store.removeProject(path))
  ipcMain.handle(IPC.renameProject, (_event, path: string, name: string) =>
    store.renameProject(path, name)
  )
  ipcMain.handle(IPC.reorderProjects, (_event, orderedPaths: string[]) =>
    store.reorderProjects(orderedPaths)
  )

  // Repoints an existing Project at a newly-chosen directory (see
  // CONTEXT.md's "Relocate" action) - reuses the same picker as adding a
  // Project. Returns null if the user cancels, leaving the Project
  // untouched.
  ipcMain.handle(
    IPC.relocateProject,
    async (_event, path: string): Promise<RelocateProjectResult> => {
      const newPath = await electronDirectoryPicker.pickDirectory()
      if (!newPath) return null

      await store.relocateProject(path, newPath)
      const project = (await store.getProjects()).find((p) => p.path === newPath)
      return project ?? null
    }
  )

  ipcMain.handle(IPC.getActiveProjectPath, () => store.getActiveProjectPath())
  ipcMain.handle(IPC.setActiveProjectPath, (_event, path: string | null) =>
    store.setActiveProjectPath(path)
  )

  ipcMain.handle(IPC.getProjectState, (_event, path: string) => store.getProjectState(path))
  ipcMain.handle(IPC.setProjectState, (_event, path: string, patch) =>
    store.setProjectState(path, patch)
  )

  ipcMain.handle(IPC.getLastRenderMode, () => store.getLastRenderMode())
  ipcMain.handle(IPC.setLastRenderMode, (_event, mode: RenderMode) => store.setLastRenderMode(mode))

  ipcMain.handle(IPC.getSettings, () => store.getSettings())
  ipcMain.handle(IPC.setSettings, async (_event, patch) => {
    await store.setSettings(patch)
    return store.getSettings()
  })

  ipcMain.handle(IPC.resetConfig, () => store.resetAll())

  ipcMain.handle(IPC.getAppVersion, () => app.getVersion())

  ipcMain.handle(
    IPC.checkForUpdate,
    async (_event, bypassSkip: boolean): Promise<UpdateCheckResult> => {
      const result = await updater.checkForUpdate()

      // A manual "Check for updates" click always shows the result - only
      // the silent startup check honours a previously Skipped Version. See
      // CONTEXT.md.
      if (!bypassSkip && result.available) {
        const skipped = await store.getSkippedUpdateVersion()
        if (skipped === result.version) return { available: false }
      }

      return result
    }
  )

  ipcMain.handle(IPC.startUpdateDownload, (event) => {
    updater.startDownload((status) => {
      event.sender.send(IPC.updateDownloadStatus, status)
    })
  })

  ipcMain.handle(IPC.quitAndInstallUpdate, () => updater.quitAndInstall())

  ipcMain.handle(IPC.skipUpdateVersion, (_event, version: string) =>
    store.setSkippedUpdateVersion(version)
  )

  ipcMain.handle(IPC.openReleasesPage, () => updater.openReleasesPage())
}

function createWindow(): void {
  // Native window chrome on every platform (frame defaults to true) rather
  // than a frameless window with a custom-drawn titlebar. Still satisfies
  // "native OS window controls per platform" - macOS gets its native
  // traffic lights, Windows/Linux their native controls - without the
  // cross-platform drag-region/hit-testing work a frameless titlebar needs.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 860,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    title: 'Bella',
    backgroundColor: '#0b0c0e',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.tanbydynamics.bella')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
