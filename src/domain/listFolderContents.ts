import { classifyFormat, type FormatClassification } from './formats'
import { joinPath } from './paths'

export interface DirectoryReader {
  /** `isHidden` carries only what the OS itself flags as hidden (the
   * Windows Hidden attribute; always false on platforms without such a
   * concept) - the dot-prefix convention is a naming rule, not filesystem
   * metadata, so this domain layer applies that half of "hidden" itself via
   * isDotfile rather than asking the reader for it. */
  readEntries(
    path: string
  ): Promise<Array<{ name: string; isDirectory: boolean; isHidden: boolean }>>
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

/** A dotfile/dotfolder by the cross-platform naming convention (leading
 * `.`) - the other half of "hidden", alongside the OS-level Hidden
 * attribute a DirectoryReader reports per entry. Applied uniformly on every
 * platform, unlike the attribute, which is Windows-only. */
function isDotfile(name: string): boolean {
  return name.startsWith('.')
}

/** Lists a folder's immediate children - subfolders and files together -
 * for a single Locations-tree node's lazy expansion. Replaces the old
 * listFolder/listSubfolders split (see ADR 0004, which superseded ADR
 * 0001's files-only file panel): the tree is now the sole browsing
 * surface, so every expand needs both groups at once rather than a
 * separate files-only panel.
 *
 * Two kinds of entry never make it into the result: hidden entries
 * (dotfiles/dotfolders, or OS-hidden on Windows - see isDotfile and
 * DirectoryReader.readEntries), and any file without a 3D preview - only a
 * Renderable format (FormatClassification 'renderable', STL/OBJ) has one;
 * Listed formats (STEP/FCStd/SCAD/MTL - recognized, but "preview not
 * available") and unrecognized files are both filtered before the stat()
 * call rather than listed with a badge/generic icon nothing then lets you
 * view.
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
    if (rawEntry.isHidden || isDotfile(rawEntry.name)) continue

    const path = joinPath(folderPath, rawEntry.name)

    if (rawEntry.isDirectory) {
      subfolders.push({ name: rawEntry.name, path })
      continue
    }

    const classification = classifyFormat(rawEntry.name)
    if (classification.kind !== 'renderable') continue

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
      classification
    })
  }

  subfolders.sort((a, b) => a.name.localeCompare(b.name))
  files.sort((a, b) => a.name.localeCompare(b.name))

  return { subfolders, files }
}
