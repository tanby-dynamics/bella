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
    const { size, modifiedAt } = await reader.stat(path)
    entries.push({
      name: rawEntry.name,
      path,
      isDirectory: rawEntry.isDirectory,
      size,
      modifiedAt,
      classification: rawEntry.isDirectory ? { kind: 'other' } : classifyFormat(rawEntry.name)
    })
  }

  entries.sort((a, b) => a.name.localeCompare(b.name))

  return entries
}
