import type { FileEntry } from '../types'
import { FileCard } from './FileCard'

interface FileGridProps {
  entries: FileEntry[]
  selectedPath: string | null
  onSelect: (entry: FileEntry) => void
  onOpenFolder: (entry: FileEntry) => void
}

export function FileGrid({
  entries,
  selectedPath,
  onSelect,
  onOpenFolder
}: FileGridProps): React.JSX.Element {
  return (
    <div className="file-grid">
      <div className="file-grid__header">
        <span>{entries.length} items</span>
        <div className="file-grid__view-options">
          <span>View: Thumbnails</span>
          <span>Sort: Name</span>
        </div>
      </div>
      <div className="file-grid__cards">
        {entries.map((entry) => (
          <FileCard
            key={entry.path}
            entry={entry}
            isSelected={entry.path === selectedPath}
            onSelect={() => onSelect(entry)}
            onOpenFolder={() => onOpenFolder(entry)}
          />
        ))}
      </div>
    </div>
  )
}
