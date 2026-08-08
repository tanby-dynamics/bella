import type { FileEntry } from '../types'
import { formatFileSize } from '../paths'

interface StatusBarProps {
  selectedEntry: FileEntry | null
  currentFolder: string | null
}

export function StatusBar({ selectedEntry, currentFolder }: StatusBarProps): React.JSX.Element {
  const line = selectedEntry
    ? `${selectedEntry.name}  ·  ${formatFileSize(selectedEntry.size)}  ·  ${currentFolder ?? ''}`
    : (currentFolder ?? '')

  return <div className="status-bar">{line}</div>
}
