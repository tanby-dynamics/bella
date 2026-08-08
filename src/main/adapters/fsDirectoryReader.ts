import { readdir, stat } from 'node:fs/promises'
import type { DirectoryReader } from '../../domain'

/** Real filesystem-backed implementation of the domain layer's DirectoryReader seam. */
export const fsDirectoryReader: DirectoryReader = {
  async readEntries(path) {
    const dirents = await readdir(path, { withFileTypes: true })
    return dirents.map((dirent) => ({ name: dirent.name, isDirectory: dirent.isDirectory() }))
  },

  async stat(entryPath) {
    const stats = await stat(entryPath)
    return { size: stats.size, modifiedAt: stats.mtime }
  }
}
