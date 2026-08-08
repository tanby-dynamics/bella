import type { FileEntry } from '../types'
import { FORMAT_BADGES } from '../formatBadges'
import { formatFileSize } from '../paths'

interface FileCardProps {
  entry: FileEntry
  isSelected: boolean
  onSelect: () => void
  onOpenFolder: () => void
}

function FolderIcon(): React.JSX.Element {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  )
}

function CubeIcon({ color }: { color: string }): React.JSX.Element {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2z" stroke={color} strokeWidth="1.4" />
      <path d="M12 2v18M4 6.5L12 11l8-4.5" stroke={color} strokeWidth="1.4" />
    </svg>
  )
}

function FileIcon(): React.JSX.Element {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M6 2h8l4 4v16H6V2z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

export function FileCard({
  entry,
  isSelected,
  onSelect,
  onOpenFolder
}: FileCardProps): React.JSX.Element {
  const badge =
    entry.classification.kind !== 'other' ? FORMAT_BADGES[entry.classification.format] : undefined

  return (
    <div
      className={`file-card${isSelected ? ' is-selected' : ''}`}
      onClick={entry.isDirectory ? onOpenFolder : onSelect}
      onDoubleClick={entry.isDirectory ? onOpenFolder : undefined}
      role="button"
      tabIndex={0}
    >
      <div className="file-card__thumb">
        {entry.isDirectory ? (
          <FolderIcon />
        ) : badge ? (
          <CubeIcon color={isSelected ? 'var(--accent)' : badge.color} />
        ) : (
          <FileIcon />
        )}
      </div>
      <div className="file-card__name">{entry.name}</div>
      {!entry.isDirectory && (
        <div className="file-card__meta">
          {badge && (
            <span className="file-card__badge" style={{ background: badge.bg, color: badge.color }}>
              {badge.label}
            </span>
          )}
          <span className="file-card__size">{formatFileSize(entry.size)}</span>
        </div>
      )}
    </div>
  )
}
