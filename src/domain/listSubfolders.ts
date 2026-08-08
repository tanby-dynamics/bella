import type { DirectoryReader } from './listFolder'
import { joinPath } from './paths'

export interface Subfolder {
  name: string
  path: string
}

/** Lists a folder's immediate subfolders only, for lazy tree expansion -
 * no stat() calls, since the tree only needs name/path. One level deep;
 * callers expand further levels with their own calls as the user drills
 * into the tree. */
export async function listSubfolders(
  folderPath: string,
  reader: DirectoryReader
): Promise<Subfolder[]> {
  const rawEntries = await reader.readEntries(folderPath)

  return rawEntries
    .filter((entry) => entry.isDirectory)
    .map((entry) => ({ name: entry.name, path: joinPath(folderPath, entry.name) }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
