import { useState } from 'react'
import type { Subfolder } from '../types'

interface TreeItem {
  name: string
  path: string
}

interface LocationTreeNodeProps {
  item: TreeItem
  depth: number
  currentFolder: string | null
  onNavigate: (path: string) => void
}

export function ChevronIcon({ expanded }: { expanded: boolean }): React.JSX.Element {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 0.1s' }}
    >
      <path d="M8 4l8 8-8 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

function DriveIcon(): React.JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="7" cy="15" r="0.8" fill="currentColor" />
    </svg>
  )
}

function FolderIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  )
}

/** One node of the Locations tree - a Location root (depth 0) or a plain
 * folder underneath one (depth > 0, not itself a Location, see CONTEXT.md).
 * Subfolders are fetched lazily on first expand, one level at a time, and
 * cached in local state for the life of the node - collapsing and
 * re-expanding doesn't re-fetch. The chevron (expand/collapse) and the
 * label (navigate) are separate click targets, per the confirmed seam. */
export function LocationTreeNode({
  item,
  depth,
  currentFolder,
  onNavigate
}: LocationTreeNodeProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<Subfolder[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function toggleExpand(event: React.MouseEvent): Promise<void> {
    event.stopPropagation()

    if (!expanded && children === null) {
      setLoading(true)
      const subfolders = await window.api.listSubfolders(item.path)
      setChildren(subfolders)
      setLoading(false)
    }

    setExpanded((current) => !current)
  }

  return (
    <div>
      <div
        className={`sidebar__item sidebar__tree-item${item.path === currentFolder ? ' is-active' : ''}`}
        style={{ paddingLeft: 10 + depth * 16 }}
      >
        <button
          type="button"
          className="sidebar__chevron"
          onClick={toggleExpand}
          aria-label={expanded ? `Collapse ${item.name}` : `Expand ${item.name}`}
          aria-expanded={expanded}
        >
          <ChevronIcon expanded={expanded} />
        </button>
        <span className="sidebar__tree-label" onClick={() => onNavigate(item.path)}>
          {depth === 0 ? <DriveIcon /> : <FolderIcon />}
          <span>{item.name}</span>
        </span>
      </div>
      {expanded && (
        <div className="sidebar__tree-children">
          {loading && <div className="sidebar__tree-loading">Loading…</div>}
          {children?.map((child) => (
            <LocationTreeNode
              key={child.path}
              item={child}
              depth={depth + 1}
              currentFolder={currentFolder}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
