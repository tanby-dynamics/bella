import type { StlParseResult } from '../domain'

export const IPC = {
  homeDirectory: 'fs:homeDirectory',
  listFolderContents: 'fs:listFolderContents',
  parseRenderableFile: 'fs:parseRenderableFile',
  openExternal: 'fs:openExternal',
  listLocations: 'locations:list',
  listFavorites: 'favorites:list',
  addFavorite: 'favorites:add',
  removeFavorite: 'favorites:remove',
  getLastOpenedFolder: 'session:getLastOpenedFolder',
  setLastOpenedFolder: 'session:setLastOpenedFolder',
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

/** Result of an Update Check (see CONTEXT.md). `canSelfUpdate` is false on
 * macOS, where self-update is unsupported until the app is signed - see
 * ADR 0003. */
export type UpdateCheckResult =
  | { available: false }
  | { available: true; version: string; canSelfUpdate: boolean }

/** Pushed from the main process (via the updateDownloadStatus channel) while
 * a self-update download triggered by startUpdateDownload is in progress. */
export type UpdateDownloadStatus =
  | { status: 'progress'; percent: number }
  | { status: 'complete' }
  | { status: 'error'; message: string }
