import { execFile } from 'node:child_process'
import { readdir, stat } from 'node:fs/promises'
import { promisify } from 'node:util'
import type { DirectoryReader } from '../../domain'

const execFileAsync = promisify(execFile)

/** Names, among one directory's immediate children, that carry the Windows
 * Hidden file attribute - the half of "hidden" that isn't just a dotfile
 * naming convention (see listFolderContents' isDotfile), and that has no
 * equivalent on macOS/Linux. Queried once per directory via PowerShell
 * (bundled with every supported Windows version - no native addon needed)
 * rather than once per entry, since a per-entry shell-out would make every
 * large folder expand noticeably slower. */
async function readWindowsHiddenNames(path: string): Promise<Set<string>> {
  if (process.platform !== 'win32') return new Set()

  // PowerShell single-quoted strings escape an embedded ' by doubling it.
  const escapedPath = path.replace(/'/g, "''")
  const script = `Get-ChildItem -LiteralPath '${escapedPath}' -Force -Attributes Hidden | Select-Object -ExpandProperty Name`

  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      script
    ])
    return new Set(
      stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    )
  } catch {
    // Best-effort: if PowerShell is unavailable, or the directory can't be
    // queried this way (e.g. permissions), fall back to reporting nothing
    // hidden rather than failing the whole listing - dotfile filtering
    // still applies regardless.
    return new Set()
  }
}

/** Real filesystem-backed implementation of the domain layer's DirectoryReader seam. */
export const fsDirectoryReader: DirectoryReader = {
  async readEntries(path) {
    const [dirents, hiddenNames] = await Promise.all([
      readdir(path, { withFileTypes: true }),
      readWindowsHiddenNames(path)
    ])
    return dirents.map((dirent) => ({
      name: dirent.name,
      isDirectory: dirent.isDirectory(),
      isHidden: hiddenNames.has(dirent.name)
    }))
  },

  async stat(entryPath) {
    const stats = await stat(entryPath)
    return { size: stats.size, modifiedAt: stats.mtime }
  }
}
