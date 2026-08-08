import { useState } from 'react'
import type { Favorite, Location } from '../types'
import { ChevronIcon, LocationTreeNode } from './LocationTree'

interface SidebarProps {
  favorites: Favorite[]
  locations: Location[]
  currentFolder: string | null
  onNavigate: (path: string) => void
  onAddCurrentFolderAsFavorite: () => void
  onRemoveFavorite: (path: string) => void
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
  currentFolder,
  onNavigate,
  onAddCurrentFolderAsFavorite,
  onRemoveFavorite
}: SidebarProps): React.JSX.Element {
  const [favoritesExpanded, setFavoritesExpanded] = useState(true)
  const isCurrentFolderFavorite = favorites.some((f) => f.path === currentFolder)

  return (
    <div className="sidebar">
      <div className="sidebar__section-header">
        <button
          type="button"
          className="sidebar__section-toggle"
          onClick={() => setFavoritesExpanded((current) => !current)}
          aria-expanded={favoritesExpanded}
        >
          <ChevronIcon expanded={favoritesExpanded} />
          <span>FAVORITES</span>
        </button>
        {currentFolder && !isCurrentFolderFavorite && (
          <button
            type="button"
            className="sidebar__add-favorite"
            title="Add current folder to Favorites"
            onClick={onAddCurrentFolderAsFavorite}
          >
            +
          </button>
        )}
      </div>
      {favoritesExpanded &&
        favorites.map((favorite) => (
          <div
            key={favorite.path}
            className={`sidebar__item${favorite.path === currentFolder ? ' is-active' : ''}`}
            onClick={() => onNavigate(favorite.path)}
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
              ×
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
          currentFolder={currentFolder}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  )
}
