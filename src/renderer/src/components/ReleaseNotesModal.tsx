import { useMemo } from 'react'
import { marked } from 'marked'
// release-notes.md is bundled into the app at build time and rendered
// entirely client-side - no network fetch, no per-version extraction. See
// ADR 0002.
import releaseNotesRaw from '../../../../release-notes.md?raw'

interface ReleaseNotesModalProps {
  onClose: () => void
}

export function ReleaseNotesModal({ onClose }: ReleaseNotesModalProps): React.JSX.Element {
  // Parsed once on mount, not on every render - release-notes.md is static
  // for the lifetime of a running build.
  const html = useMemo(() => marked.parse(releaseNotesRaw, { async: false }) as string, [])

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="release-notes-panel" onClick={(event) => event.stopPropagation()}>
        <div className="settings-panel__header">
          <span>Release notes</span>
          <button type="button" onClick={onClose} aria-label="Close release notes">
            ×
          </button>
        </div>
        <div
          className="release-notes-panel__body"
          // release-notes.md is authored by the project's own developers via
          // normal PR review, not user-supplied - safe to render directly.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
