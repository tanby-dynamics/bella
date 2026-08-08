import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import {
  IPC,
  type ParseRenderableFileResult,
  type UpdateCheckResult,
  type UpdateDownloadStatus
} from '../shared/ipc'
import type { FolderContents } from '../domain/listFolderContents'
import type { Location } from '../domain/locations'
import type { Favorite, Settings, StoreData } from '../domain/store'

const api = {
  getHomeDirectory: (): Promise<string> => ipcRenderer.invoke(IPC.homeDirectory),
  listFolderContents: (path: string): Promise<FolderContents> =>
    ipcRenderer.invoke(IPC.listFolderContents, path),
  parseRenderableFile: (path: string): Promise<ParseRenderableFileResult> =>
    ipcRenderer.invoke(IPC.parseRenderableFile, path),
  openExternal: (path: string): Promise<string> => ipcRenderer.invoke(IPC.openExternal, path),
  listLocations: (): Promise<Location[]> => ipcRenderer.invoke(IPC.listLocations),
  listFavorites: (): Promise<Favorite[]> => ipcRenderer.invoke(IPC.listFavorites),
  addFavorite: (favorite: Favorite): Promise<void> => ipcRenderer.invoke(IPC.addFavorite, favorite),
  removeFavorite: (path: string): Promise<void> => ipcRenderer.invoke(IPC.removeFavorite, path),
  getLastOpenedFolder: (): Promise<string | null> => ipcRenderer.invoke(IPC.getLastOpenedFolder),
  setLastOpenedFolder: (path: string): Promise<void> =>
    ipcRenderer.invoke(IPC.setLastOpenedFolder, path),
  getSettings: (): Promise<Settings> => ipcRenderer.invoke(IPC.getSettings),
  setSettings: (patch: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke(IPC.setSettings, patch),
  resetConfig: (): Promise<StoreData> => ipcRenderer.invoke(IPC.resetConfig),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke(IPC.getAppVersion),
  // bypassSkip: true for a manual "Check for updates" click, which should
  // always surface the result even if the user previously skipped that
  // Version - false for the silent startup check. See CONTEXT.md.
  checkForUpdate: (bypassSkip: boolean): Promise<UpdateCheckResult> =>
    ipcRenderer.invoke(IPC.checkForUpdate, bypassSkip),
  startUpdateDownload: (): Promise<void> => ipcRenderer.invoke(IPC.startUpdateDownload),
  onUpdateDownloadStatus: (callback: (status: UpdateDownloadStatus) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: UpdateDownloadStatus): void =>
      callback(status)
    ipcRenderer.on(IPC.updateDownloadStatus, listener)
    return () => ipcRenderer.removeListener(IPC.updateDownloadStatus, listener)
  },
  quitAndInstallUpdate: (): Promise<void> => ipcRenderer.invoke(IPC.quitAndInstallUpdate),
  skipUpdateVersion: (version: string): Promise<void> =>
    ipcRenderer.invoke(IPC.skipUpdateVersion, version),
  openReleasesPage: (): Promise<void> => ipcRenderer.invoke(IPC.openReleasesPage)
}

export type BellaApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
