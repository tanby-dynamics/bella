import type { StlParseResult } from '../domain'
import type { Project } from '../domain/projects'

export const IPC = {
  listFolderContents: 'fs:listFolderContents',
  parseRenderableFile: 'fs:parseRenderableFile',
  openExternal: 'fs:openExternal',
  showItemInFolder: 'fs:showItemInFolder',
  listProjects: 'projects:list',
  pickAndAddProject: 'projects:pickAndAdd',
  removeProject: 'projects:remove',
  renameProject: 'projects:rename',
  reorderProjects: 'projects:reorder',
  relocateProject: 'projects:relocate',
  getActiveProjectPath: 'projects:getActive',
  setActiveProjectPath: 'projects:setActive',
  getProjectState: 'projects:getState',
  setProjectState: 'projects:setState',
  getLastRenderMode: 'session:getLastRenderMode',
  setLastRenderMode: 'session:setLastRenderMode',
  getSettings: 'settings:get',
  setSettings: 'settings:set',
  resetConfig: 'config:reset',
  getAppVersion: 'update:getAppVersion',
  checkForUpdate: 'update:check',
  startUpdateDownload: 'update:startDownload',
  updateDownloadStatus: 'update:downloadStatus',
  quitAndInstallUpdate: 'update:quitAndInstall',
  skipUpdateVersion: 'update:skipVersion',
  openReleasesPage: 'update:openReleasesPage'
} as const

/** Result of asking the main process to parse a file the renderer believes is
 * Renderable. Distinguished from a plain StlParseResult because the file may
 * have changed underneath the renderer (e.g. no longer classifies as
 * Renderable) between listing and selection. */
export type ParseRenderableFileResult = StlParseResult | { ok: false; error: 'not-renderable' }

/** Result of picking a directory to add as a Project (see
 * projects:pickAndAdd) - null if the user cancels the native dialog.
 * `added` distinguishes a genuinely new Project (whose row should open in
 * rename mode - see CONTEXT.md) from picking a directory that was already
 * a Project, which just activates the existing entry. */
export type PickAndAddProjectResult = {
  projects: Project[]
  activeProjectPath: string
  added: boolean
} | null

/** Result of the "Relocate..." action (see projects:relocate) - the
 * Project's updated `path` (same name, same position), or null if the
 * user cancels the native dialog. */
export type RelocateProjectResult = Project | null

/** Result of an Update Check (see CONTEXT.md). `canSelfUpdate` is false on
 * macOS, where self-update is unsupported until the app is signed - see
 * ADR 0003. */
export type UpdateCheckResult =
  { available: false } | { available: true; version: string; canSelfUpdate: boolean }

/** Pushed from the main process (via the updateDownloadStatus channel) while
 * a self-update download triggered by startUpdateDownload is in progress. */
export type UpdateDownloadStatus =
  | { status: 'progress'; percent: number }
  | { status: 'complete' }
  | { status: 'error'; message: string }
