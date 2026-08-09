import { BrowserWindow, dialog } from 'electron'
import type { DirectoryPicker } from '../../domain'

/** Real Electron-backed implementation of the domain layer's
 * DirectoryPicker seam - the only way a Project gets created (see ADR
 * 0005). Scoped to whichever window is currently focused so the native
 * dialog is modal to it, rather than to the app in general. */
export const electronDirectoryPicker: DirectoryPicker = {
  async pickDirectory() {
    const parent = BrowserWindow.getFocusedWindow() ?? undefined
    const result = parent
      ? await dialog.showOpenDialog(parent, { properties: ['openDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory'] })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  }
}
