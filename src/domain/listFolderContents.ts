import { classifyFormat, type FormatClassification } from './formats'
import { joinPath } from './paths'

export interface DirectoryReader {
  readEntries(path: string): Promise<Array<{ name: string; isDirectory: boolean }>>
  stat(entryPath: string): Promise<{ size: number; modifiedAt: Date }>
}

export interface FileEntry {
  name: string
  path: string
  size: number
  modifiedAt: Date
  classification: FormatClassification
}

export interface Subfolder {
  name: string
  path: string
}

export interface FolderContents {
  subfolders: Subfolder[]
  files: FileEntry[]
}

/** Lists a folder's immediate children - subfolders and files together -
 * for a single Locations-tree node's lazy expansion. Replaces the old
 * listFolder/listSubfolders split (see ADR 0004, which superseded ADR
 * 0001's files-only file panel): the tree is now the sole browsing
 * surface, so every expand needs both groups at once rather than a
 * separate files-only panel.
 *
 * Subfolders get no stat() call (the tree only needs name/path for them,
 * same as the old listSubfolders); files get full metadata, same as the
 * old listFolder - including omitting a file whose metadata can't be read
 * rather than failing the whole listing. Both groups are pre-sorted by
 * name, case-insensitively - the tree renders subfolders before files
 * within a node, so no combined ordering is needed here. */
export async function listFolderContents(
  folderPath: string,
  reader: DirectoryReader
): Promise<FolderContents> {
  const rawEntries = await reader.readEntries(folderPath)
  const subfolders: Subfolder[] = []
  const files: FileEntry[] = []

  for (const rawEntry of rawEntries) {
    const path = joinPath(folderPath, rawEntry.name)

    if (rawEntry.isDirectory) {
      subfolders.push({ name: rawEntry.name, path })
      continue
    }

    let stat: { size: number; modifiedAt: Date }
    try {
      stat = await reader.stat(path)
    } catch {
      // Real folders - especially drive roots - can contain files an
      // ordinary user process isn't permitted to read metadata for
      // (system/locked files). Omit rather than fail the whole listing.
      continue
    }

    files.push({
      name: rawEntry.name,
      path,
      size: stat.size,
      modifiedAt: stat.modifiedAt,
      classification: classifyFormat(rawEntry.name)
    })
  }

  subfolders.sort((a, b) => a.name.localeCompare(b.name))
  files.sort((a, b) => a.name.localeCompare(b.name))

  return { subfolders, files }
}
