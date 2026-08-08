import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { homedir } from 'node:os'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  listFolder,
  parseRenderable,
  enumerateLocations,
  createStore,
  classifyFormat
} from '../domain'
import { fsDirectoryReader } from './adapters/fsDirectoryReader'
import { osDriveLister } from './adapters/osDriveLister'
import { fileStoreBackend } from './adapters/fileStoreBackend'
import { IPC, type ParseRenderableFileResult } from '../shared/ipc'
import { readFile } from 'node:fs/promises'

const store = createStore(fileStoreBackend)

function registerIpcHandlers(): void {
  ipcMain.handle(IPC.homeDirectory, () => homedir())

  ipcMain.handle(IPC.listFolder, (_event, path: string) => listFolder(path, fsDirectoryReader))

  ipcMain.handle(
    IPC.parseRenderableFile,
    async (_event, path: string): Promise<ParseRenderableFileResult> => {
      const classification = classifyFormat(path)
      if (classification.kind !== 'renderable') {
        return { ok: false, error: 'not-renderable' }
      }
      const bytes = await readFile(path)
      return parseRenderable(classification.format, bytes)
    }
  )

  ipcMain.handle(IPC.openExternal, (_event, path: string) => shell.openPath(path))

  ipcMain.handle(IPC.listLocations, () => enumerateLocations(osDriveLister))

  ipcMain.handle(IPC.listFavorites, () => store.getFavorites())
  ipcMain.handle(IPC.addFavorite, (_event, favorite: { name: string; path: string }) =>
    store.addFavorite(favorite)
  )
  ipcMain.handle(IPC.removeFavorite, (_event, path: string) => store.removeFavorite(path))

  ipcMain.handle(IPC.getLastOpenedFolder, () => store.getLastOpenedFolder())
  ipcMain.handle(IPC.setLastOpenedFolder, (_event, path: string) => store.setLastOpenedFolder(path))

  ipcMain.handle(IPC.getSettings, () => store.getSettings())
  ipcMain.handle(IPC.setSettings, async (_event, patch) => {
    await store.setSettings(patch)
    return store.getSettings()
  })

  ipcMain.handle('dialog:pickFolder', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return null
    const result = await dialog.showOpenDialog(window, { properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 860,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    title: 'Bella',
    backgroundColor: '#0b0c0e',
    ...(process.platform === 'linux' ? { icon } : {}),
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
