import { useRef, useState } from 'react'
import {
  typeLabel,
  type ColumnWidths,
  type FileEntry,
  type SortColumn,
  type SortDirection
} from '../types'
import { FORMAT_BADGES } from '../formatBadges'
import { formatDate, formatFileSize } from '../paths'

type ResizableColumn = keyof ColumnWidths

const MIN_COLUMN_WIDTH = 50

interface Column {
  key: SortColumn
  label: string
  resizable: boolean
}

const COLUMNS: Column[] = [
  { key: 'name', label: 'Name', resizable: false },
  { key: 'modifiedAt', label: 'Date modified', resizable: true },
  { key: 'type', label: 'Type', resizable: true },
  { key: 'size', label: 'Size', resizable: true }
]

function gridTemplateColumns(widths: ColumnWidths): string {
  return `minmax(0, 1fr) ${widths.modifiedAt}px ${widths.type}px ${widths.size}px`
}

interface FileListProps {
  entries: FileEntry[]
  selectedPath: string | null
  onSelect: (entry: FileEntry) => void
  sort: { column: SortColumn; direction: SortDirection }
  onSortChange: (column: SortColumn) => void
  columnWidths: ColumnWidths
  onColumnWidthsChange: (widths: ColumnWidths) => void
}

function SortArrowIcon({ direction }: { direction: SortDirection }): React.JSX.Element {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: direction === 'desc' ? 'rotate(180deg)' : undefined }}
    >
      <path
        d="M12 5v14M6 11l6-6 6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function FileIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M6 2h8l4 4v16H6V2z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function CubeIcon({ color }: { color: string }): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2z" stroke={color} strokeWidth="1.4" />
      <path d="M12 2v18M4 6.5L12 11l8-4.5" stroke={color} strokeWidth="1.4" />
    </svg>
  )
}

function FileListRow({
  entry,
  isSelected,
  onSelect,
  columnWidths
}: {
  entry: FileEntry
  isSelected: boolean
  onSelect: () => void
  columnWidths: ColumnWidths
}): React.JSX.Element {
  const badge =
    entry.classification.kind !== 'other' ? FORMAT_BADGES[entry.classification.format] : undefined

  return (
    <div
      className={`file-list__row${isSelected ? ' is-selected' : ''}`}
      style={{ gridTemplateColumns: gridTemplateColumns(columnWidths) }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      <span className="file-list__col file-list__col--name">
        {badge ? <CubeIcon color={isSelected ? 'var(--accent)' : badge.color} /> : <FileIcon />}
        <span className="file-list__name-text">{entry.name}</span>
      </span>
      <span className="file-list__col file-list__col--modified">
        {formatDate(entry.modifiedAt)}
      </span>
      <span className="file-list__col file-list__col--type">{typeLabel(entry.classification)}</span>
      <span className="file-list__col file-list__col--size">{formatFileSize(entry.size)}</span>
    </div>
  )
}

export function FileList({
  entries,
  selectedPath,
  onSelect,
  sort,
  onSortChange,
  columnWidths,
  onColumnWidthsChange
}: FileListProps): React.JSX.Element {
  // Only set while a drag is in progress - overrides the persisted
  // columnWidths prop for live visual feedback without writing to the store
  // on every pixel of mouse movement. null the rest of the time, so the
  // persisted prop is always the source of truth outside of an active drag
  // (no prop->state sync effect needed).
  const [dragWidths, setDragWidths] = useState<ColumnWidths | null>(null)
  const dragRef = useRef<{ column: ResizableColumn; startX: number; startWidth: number } | null>(
    null
  )
  const widths = dragWidths ?? columnWidths

  function startResize(event: React.MouseEvent, column: ResizableColumn): void {
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = { column, startX: event.clientX, startWidth: columnWidths[column] }
    setDragWidths(columnWidths)

    function onMouseMove(moveEvent: MouseEvent): void {
      const drag = dragRef.current
      if (!drag) return
      const next = Math.max(MIN_COLUMN_WIDTH, drag.startWidth + (moveEvent.clientX - drag.startX))
      setDragWidths((current) => ({ ...(current ?? columnWidths), [drag.column]: next }))
    }

    function onMouseUp(): void {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      dragRef.current = null
      setDragWidths((current) => {
        if (current) onColumnWidthsChange(current)
        return null
      })
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div className="file-list">
      <div className="file-list__header">
        <span>{entries.length} items</span>
      </div>
      {/* Header row and data rows share this one scroll container (with the
          header pinned via position: sticky) rather than scrolling
          independently - otherwise the body's scrollbar gutter narrows its
          rows without narrowing the header, and the columns drift apart. */}
      <div className="file-list__scroll">
        <div
          className="file-list__row file-list__row--head"
          style={{ gridTemplateColumns: gridTemplateColumns(widths) }}
        >
          {COLUMNS.map((column) => (
            <div key={column.key} className={`file-list__col file-list__col--${column.key}`}>
              <button
                type="button"
                className={`file-list__sort-btn${sort.column === column.key ? ' is-active' : ''}`}
                onClick={() => onSortChange(column.key)}
              >
                <span>{column.label}</span>
                {sort.column === column.key && <SortArrowIcon direction={sort.direction} />}
              </button>
              {column.resizable && (
                <div
                  className="file-list__col-resizer"
                  onMouseDown={(event) => startResize(event, column.key as ResizableColumn)}
                />
              )}
            </div>
          ))}
        </div>
        {entries.length === 0 ? (
          <div className="file-list__empty">This folder is empty</div>
        ) : (
          entries.map((entry) => (
            <FileListRow
              key={entry.path}
              entry={entry}
              isSelected={entry.path === selectedPath}
              onSelect={() => onSelect(entry)}
              columnWidths={widths}
            />
          ))
        )}
      </div>
    </div>
  )
}
