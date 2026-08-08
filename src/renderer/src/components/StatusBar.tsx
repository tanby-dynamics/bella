import type { FileEntry } from '../types'
import { formatFileSize } from '../paths'

interface StatusBarProps {
  selectedEntry: FileEntry | null
  currentFolder: string | null
  appVersion: string | null
  onOpenReleaseNotes: () => void
}

export function StatusBar({
  selectedEntry,
  currentFolder,
  appVersion,
  onOpenReleaseNotes
}: StatusBarProps): React.JSX.Element {
  const line = selectedEntry
    ? `${selectedEntry.name}  ·  ${formatFileSize(selectedEntry.size)}  ·  ${currentFolder ?? ''}`
    : (currentFolder ?? '')

  return (
    <div className="status-bar">
      <span className="status-bar__line">{line}</span>
      {appVersion && (
        <button type="button" className="status-bar__version" onClick={onOpenReleaseNotes}>
          v{appVersion}
        </button>
      )}
    </div>
  )
}
