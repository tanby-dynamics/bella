import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import {
  IPC,
  type ParseRenderableFileResult,
  type PickAndAddProjectResult,
  type RelocateProjectResult,
  type UpdateCheckResult,
  type UpdateDownloadStatus
} from '../shared/ipc'
import type { FolderContents } from '../domain/listFolderContents'
import type { Project, ProjectState } from '../domain/projects'
import type { RenderMode, Settings, StoreData } from '../domain/store'

const api = {
  listFolderContents: (path: string): Promise<FolderContents> =>
    ipcRenderer.invoke(IPC.listFolderContents, path),
  // requestId: App.tsx's own monotonic selection counter - lets the main
  // process (see parseWorkerClient.ts) recognize a request as superseded
  // and preempt whatever's still running for an earlier selection. See
  // requestSeqRef in App.tsx's selectFile.
  parseRenderableFile: (path: string, requestId: number): Promise<ParseRenderableFileResult> =>
    ipcRenderer.invoke(IPC.parseRenderableFile, path, requestId),
  openExternal: (path: string): Promise<string> => ipcRenderer.invoke(IPC.openExternal, path),
  showItemInFolder: (path: string): Promise<void> => ipcRenderer.invoke(IPC.showItemInFolder, path),
  listProjects: (): Promise<Project[]> => ipcRenderer.invoke(IPC.listProjects),
  pickAndAddProject: (): Promise<PickAndAddProjectResult> =>
    ipcRenderer.invoke(IPC.pickAndAddProject),
  removeProject: (path: string): Promise<void> => ipcRenderer.invoke(IPC.removeProject, path),
  renameProject: (path: string, name: string): Promise<void> =>
    ipcRenderer.invoke(IPC.renameProject, path, name),
  reorderProjects: (orderedPaths: string[]): Promise<void> =>
    ipcRenderer.invoke(IPC.reorderProjects, orderedPaths),
  relocateProject: (path: string): Promise<RelocateProjectResult> =>
    ipcRenderer.invoke(IPC.relocateProject, path),
  getActiveProjectPath: (): Promise<string | null> => ipcRenderer.invoke(IPC.getActiveProjectPath),
  setActiveProjectPath: (path: string | null): Promise<void> =>
    ipcRenderer.invoke(IPC.setActiveProjectPath, path),
  getProjectState: (path: string): Promise<ProjectState> =>
    ipcRenderer.invoke(IPC.getProjectState, path),
  setProjectState: (path: string, patch: Partial<ProjectState>): Promise<void> =>
    ipcRenderer.invoke(IPC.setProjectState, path, patch),
  getLastRenderMode: (): Promise<RenderMode> => ipcRenderer.invoke(IPC.getLastRenderMode),
  setLastRenderMode: (mode: RenderMode): Promise<void> =>
    ipcRenderer.invoke(IPC.setLastRenderMode, mode),
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
