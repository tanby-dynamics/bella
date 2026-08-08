import { breadcrumbSegments } from '../paths'

interface ToolbarProps {
  /** Whatever's currently highlighted in the tree - a folder's own path, or
   * a selected file's containing folder - or the last-opened folder before
   * anything's been highlighted. There's no "current folder" concept left
   * to read this from directly (see ADR 0004). */
  breadcrumbPath: string | null
  /** Clicking a segment highlights that folder in the Locations tree (same
   * as clicking its row directly) and reveals (expands + scrolls to) it -
   * it doesn't navigate anywhere, since the tree is the only browsing
   * surface now, but it does select, so the breadcrumb itself updates to
   * match. */
  onSelectPath: (path: string) => void
  onOpenSettings: () => void
}

function SettingsIcon(): React.JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.4 7.4 0 0 0-1.8-1l-.3-2.4h-4l-.3 2.4a7.4 7.4 0 0 0-1.8 1l-2.3-.9-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9c.5.4 1.1.7 1.8 1l.3 2.4h4l.3-2.4c.7-.3 1.3-.6 1.8-1l2.3.9 2-3.4-2-1.5z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  )
}

export function Toolbar({
  breadcrumbPath,
  onSelectPath,
  onOpenSettings
}: ToolbarProps): React.JSX.Element {
  const segments = breadcrumbPath ? breadcrumbSegments(breadcrumbPath) : []

  return (
    <div className="toolbar">
      <div className="toolbar__breadcrumb">
        {segments.map((segment, index) => (
          <span key={segment.path}>
            {index > 0 && <span className="toolbar__breadcrumb-sep">&gt;</span>}
            <span
              className={
                index === segments.length - 1
                  ? 'toolbar__breadcrumb-current'
                  : 'toolbar__breadcrumb-link'
              }
              onClick={() => onSelectPath(segment.path)}
            >
              {segment.label}
            </span>
          </span>
        ))}
      </div>
      <div className="toolbar__spacer" />
      <button type="button" className="toolbar__settings" onClick={onOpenSettings}>
        <SettingsIcon />
        <span>Settings</span>
      </button>
    </div>
  )
}
