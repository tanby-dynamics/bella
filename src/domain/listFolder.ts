import { classifyFormat, type FormatClassification } from './formats'

export interface DirectoryReader {
  readEntries(path: string): Promise<Array<{ name: string; isDirectory: boolean }>>
  stat(entryPath: string): Promise<{ size: number; modifiedAt: Date }>
}

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modifiedAt: Date
  classification: FormatClassification
}

function joinPath(folderPath: string, name: string): string {
  return `${folderPath}/${name}`
}

export async function listFolder(
  folderPath: string,
  reader: DirectoryReader
): Promise<FileEntry[]> {
  const rawEntries = await reader.readEntries(folderPath)
  const entries: FileEntry[] = []

  for (const rawEntry of rawEntries) {
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
      isDirectory: rawEntry.isDirectory,
      size: stat.size,
      modifiedAt: stat.modifiedAt,
      classification: rawEntry.isDirectory ? { kind: 'other' } : classifyFormat(rawEntry.name)
    })
  }

  entries.sort((a, b) => a.name.localeCompare(b.name))

  return entries
}
