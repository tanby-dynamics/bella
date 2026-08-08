import { typeLabel, type FileEntry } from '../types'
import { formatFileSize } from '../paths'

interface StatusBarProps {
  selectedEntry: FileEntry | null
  appVersion: string | null
  onOpenReleaseNotes: () => void
  onOpenSettings: () => void
}

export function StatusBar({
  selectedEntry,
  appVersion,
  onOpenReleaseNotes,
  onOpenSettings
}: StatusBarProps): React.JSX.Element {
  // Modified date isn't shown here - it already lives in the metadata
  // panel, keyed off the same selectedEntry (see ADR 0004).
  const line = selectedEntry
    ? `${selectedEntry.name}  ·  ${typeLabel(selectedEntry.classification)}  ·  ${formatFileSize(selectedEntry.size)}`
    : ''

  return (
    <div className="status-bar">
      <span className="status-bar__line">{line}</span>
      <button type="button" className="status-bar__settings" onClick={onOpenSettings}>
        Settings
      </button>
      {appVersion && (
        <>
          <span className="status-bar__sep">·</span>
          <button type="button" className="status-bar__version" onClick={onOpenReleaseNotes}>
            v{appVersion}
          </button>
        </>
      )}
    </div>
  )
}
