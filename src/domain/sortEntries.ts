import type { FileEntry } from './listFolder'
import { typeLabel } from './formats'

export type SortColumn = 'name' | 'modifiedAt' | 'type' | 'size'
export type SortDirection = 'asc' | 'desc'

const COMPARATORS: Record<SortColumn, (a: FileEntry, b: FileEntry) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  size: (a, b) => a.size - b.size,
  modifiedAt: (a, b) => a.modifiedAt.getTime() - b.modifiedAt.getTime(),
  type: (a, b) => typeLabel(a.classification).localeCompare(typeLabel(b.classification))
}

export function sortEntries(
  entries: FileEntry[],
  column: SortColumn,
  direction: SortDirection
): FileEntry[] {
  const sorted = [...entries].sort(COMPARATORS[column])

  return direction === 'asc' ? sorted : sorted.reverse()
}
