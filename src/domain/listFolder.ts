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

/** Lists the files (not folders) directly inside a folder, unsorted -
 * apply sortEntries to the result for display order. */
export async function listFolder(
  folderPath: string,
  reader: DirectoryReader
): Promise<FileEntry[]> {
  const rawEntries = await reader.readEntries(folderPath)
  const entries: FileEntry[] = []

  for (const rawEntry of rawEntries) {
    // The file panel lists files only - folder navigation lives in the
    // Locations tree instead. See ADR 0001 and listSubfolders.
    if (rawEntry.isDirectory) {
      continue
    }

    const path = joinPath(folderPath, rawEntry.name)

    let stat: { size: number; modifiedAt: Date }
    try {
      stat = await reader.stat(path)
    } catch {
      // Real folders - especially drive roots - can contain files an
      // ordinary user process isn't permitted to read metadata for
      // (system/locked files). Omit rather than fail the whole listing.
      continue
    }

    entries.push({
      name: rawEntry.name,
      path,
      size: stat.size,
      modifiedAt: stat.modifiedAt,
      classification: classifyFormat(rawEntry.name)
    })
  }

  return entries
}
