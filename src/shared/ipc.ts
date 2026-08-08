import type { StlParseResult } from '../domain'

export const IPC = {
  homeDirectory: 'fs:homeDirectory',
  listFolder: 'fs:listFolder',
  parseRenderableFile: 'fs:parseRenderableFile',
  openExternal: 'fs:openExternal',
  listLocations: 'locations:list',
  listFavorites: 'favorites:list',
  addFavorite: 'favorites:add',
  removeFavorite: 'favorites:remove',
  getLastOpenedFolder: 'session:getLastOpenedFolder',
  setLastOpenedFolder: 'session:setLastOpenedFolder',
  getSettings: 'settings:get',
  setSettings: 'settings:set'
} as const

/** Result of asking the main process to parse a file the renderer believes is
 * Renderable. Distinguished from a plain StlParseResult because the file may
 * have changed underneath the renderer (e.g. no longer classifies as
 * Renderable) between listing and selection. */
export type ParseRenderableFileResult = StlParseResult | { ok: false; error: 'not-renderable' }
