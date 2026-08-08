import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC, type ParseRenderableFileResult } from '../shared/ipc'
import type { FileEntry } from '../domain/listFolder'
import type { Location } from '../domain/locations'
import type { Favorite, Settings } from '../domain/store'

const api = {
  getHomeDirectory: (): Promise<string> => ipcRenderer.invoke(IPC.homeDirectory),
  listFolder: (path: string): Promise<FileEntry[]> => ipcRenderer.invoke(IPC.listFolder, path),
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
  pickFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:pickFolder')
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
