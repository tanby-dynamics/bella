import { useEffect, useRef, useState } from 'react'
import type { Subfolder } from '../types'
import { isAncestorPath } from '../paths'

interface TreeItem {
  name: string
  path: string
}

interface LocationTreeNodeProps {
  item: TreeItem
  depth: number
  currentFolder: string | null
  onNavigate: (path: string) => void
  /** The folder Bella opened at startup (last-opened folder, or home if
   * none) - captured once and never updated, so this only ever drives
   * auto-expansion on initial mount, not on every later navigation. See
   * CONTEXT.md: the tree otherwise never auto-syncs to the current folder. */
  autoExpandPath: string | null
}

export function ChevronIcon({ expanded }: { expanded: boolean }): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
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
 * label (navigate) are separate click targets, per the confirmed seam -
 * but clicking the label also expands the node (if not already), so
 * navigating into a folder always reveals its subfolders too. */
export function LocationTreeNode({
  item,
  depth,
  currentFolder,
  onNavigate,
  autoExpandPath
}: LocationTreeNodeProps): React.JSX.Element {
  // Computed once per node (autoExpandPath/item.path are both stable for a
  // given node instance) - drives the *initial* state directly rather than
  // being applied via a post-mount setState, so mounting on the path to the
  // startup folder doesn't need an effect to flip expanded/loading on.
  const shouldAutoExpand = autoExpandPath !== null && isAncestorPath(item.path, autoExpandPath)

  const [expanded, setExpanded] = useState(shouldAutoExpand)
  const [children, setChildren] = useState<Subfolder[] | null>(null)
  const [loading, setLoading] = useState(shouldAutoExpand)
  const fetchStartedRef = useRef(false)

  async function loadChildren(): Promise<Subfolder[]> {
    const subfolders = await window.api.listSubfolders(item.path)
    setChildren(subfolders)
    setLoading(false)
    return subfolders
  }

  async function expand(): Promise<void> {
    if (children === null) {
      setLoading(true)
      await loadChildren()
    }
    setExpanded(true)
  }

  async function toggleExpand(event: React.MouseEvent): Promise<void> {
    event.stopPropagation()
    if (expanded) {
      setExpanded(false)
    } else {
      await expand()
    }
  }

  useEffect(() => {
    if (fetchStartedRef.current || !shouldAutoExpand) return
    fetchStartedRef.current = true

    async function fetchInitialChildren(): Promise<void> {
      // `loading` is already true from initial state.
      const subfolders = await window.api.listSubfolders(item.path)
      setChildren(subfolders)
      setLoading(false)
    }

    fetchInitialChildren()
  }, [shouldAutoExpand, item.path])

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
        <span
          className="sidebar__tree-label"
          onClick={() => {
            onNavigate(item.path)
            if (!expanded) void expand()
          }}
        >
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
              autoExpandPath={autoExpandPath}
            />
          ))}
        </div>
      )}
    </div>
  )
}
