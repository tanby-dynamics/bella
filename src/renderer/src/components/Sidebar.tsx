import type { Favorite, Location } from '../types'

interface SidebarProps {
  favorites: Favorite[]
  locations: Location[]
  currentFolder: string | null
  onNavigate: (path: string) => void
  onAddCurrentFolderAsFavorite: () => void
  onRemoveFavorite: (path: string) => void
}

function DriveIcon(): React.JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="7" cy="15" r="0.8" fill="currentColor" />
    </svg>
  )
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
  const isCurrentFolderFavorite = favorites.some((f) => f.path === currentFolder)

  return (
    <div className="sidebar">
      <div className="sidebar__section-header">
        <span>FAVORITES</span>
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
      {favorites.map((favorite) => (
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
        <div
          key={location.path}
          className={`sidebar__item${location.path === currentFolder ? ' is-active' : ''}`}
          onClick={() => onNavigate(location.path)}
        >
          <DriveIcon />
          <span>{location.name}</span>
        </div>
      ))}
    </div>
  )
}
