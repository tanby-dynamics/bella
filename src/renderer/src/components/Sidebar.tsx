import { useRef, useState } from 'react'
import type { Favorite, FileEntry, Location } from '../types'
import { LocationTreeNode, type Highlighted, type RevealRequest } from './LocationTree'

const MIN_SIDEBAR_WIDTH = 180
const MAX_SIDEBAR_WIDTH = 560

interface SidebarProps {
  favorites: Favorite[]
  locations: Location[]
  /** The single row highlighted across the whole tree (file or folder) -
   * see Highlighted. Passed through as one value rather than split into
   * path/kind props, since both are needed together for the "add to
   * Favorites" affordance below (only makes sense for a folder). */
  highlighted: Highlighted | null
  /** The folder Bella opened at startup - see LocationTreeNode. */
  initialFolder: string | null
  /** Set on a Favorite click - see LocationTreeNode. */
  revealRequest: RevealRequest | null
  onSelectFavorite: (path: string) => void
  onSelectFolder: (path: string) => void
  onSelectFile: (entry: FileEntry) => void
  onRemoveFavorite: (path: string) => void
  /** Fired from a Locations-tree folder's right-click menu ("Make
   * favorite"/"Unfavorite") - see LocationTreeNode. Threaded down to every
   * tree node rather than computed here, since only the node handling the
   * click knows which folder it's for. */
  onToggleFavorite: (item: { name: string; path: string }) => void
  /** Persisted panel width in px, and the setter to commit a resize once
   * the drag ends - see ADR 0004 (the sole survivor of the old
   * resizable-columns persistence, now that files live in the tree). */
  width: number
  onWidthChange: (width: number) => void
}

function StarIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.9 6.4 20l1.4-6.2L3 9.5l6.4-.6L12 3z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  )
}

export function Sidebar({
  favorites,
  locations,
  highlighted,
  initialFolder,
  revealRequest,
  onSelectFavorite,
  onSelectFolder,
  onSelectFile,
  onRemoveFavorite,
  onToggleFavorite,
  width,
  onWidthChange
}: SidebarProps): React.JSX.Element {
  // Only set while a drag is in progress - overrides the persisted width
  // prop for live visual feedback without writing to the store on every
  // pixel of mouse movement, same pattern as FileList's old column resize.
  const [dragWidth, setDragWidth] = useState<number | null>(null)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const displayWidth = dragWidth ?? width
  // LocationTreeNode only ever needs the bare path for its own highlight
  // check.
  const highlightedPath = highlighted?.path ?? null
  // Membership-only view of favorites, for each tree node's own right-click
  // menu label - see LocationTreeNode.
  const favoritePaths = new Set(favorites.map((f) => f.path))

  function startResize(event: React.MouseEvent): void {
    event.preventDefault()
    dragRef.current = { startX: event.clientX, startWidth: width }
    setDragWidth(width)

    function onMouseMove(moveEvent: MouseEvent): void {
      const drag = dragRef.current
      if (!drag) return
      const next = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, drag.startWidth + (moveEvent.clientX - drag.startX))
      )
      setDragWidth(next)
    }

    function onMouseUp(): void {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      dragRef.current = null
      setDragWidth((current) => {
        if (current !== null) onWidthChange(current)
        return null
      })
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div className="sidebar" style={{ width: displayWidth }}>
      {/* Scroll (vertical only - see .sidebar__scroll) is scoped to this
          inner wrapper, not the outer .sidebar div, so the resizer below -
          positioned half outside the sidebar's own box - isn't clipped by
          an overflow:auto ancestor and stays draggable at any scroll
          position. */}
      <div className="sidebar__scroll">
        <div className="sidebar__section-header">
          <span>FAVORITES</span>
        </div>
        {favorites.map((favorite) => (
          <div
            key={favorite.path}
            className={`sidebar__item${favorite.path === highlightedPath ? ' is-active' : ''}`}
            onClick={() => onSelectFavorite(favorite.path)}
          >
            <StarIcon />
            <span>{favorite.name}</span>
            <button
              type="button"
              className="sidebar__remove"
              title="Remove from Favorites"
              onClick={(event) => {
                event.stopPropagation()
                onRemoveFavorite(favorite.path)
              }}
            >
              ✕
            </button>
          </div>
        ))}

        <div className="sidebar__section-header">
          <span>LOCATIONS</span>
        </div>
        {locations.map((location) => (
          <LocationTreeNode
            key={location.path}
            item={location}
            depth={0}
            highlightedPath={highlightedPath}
            onSelectFolder={onSelectFolder}
            onSelectFile={onSelectFile}
            autoExpandPath={initialFolder}
            revealRequest={revealRequest}
            favoritePaths={favoritePaths}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>

      <div className="sidebar__resizer" onMouseDown={startResize} />
    </div>
  )
}
