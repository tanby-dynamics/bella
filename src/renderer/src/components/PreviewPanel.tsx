import type { FileEntry, RenderMode } from '../types'
import type { PreviewState } from '../preview'
import { Viewer3D } from './Viewer3D'
import { MetadataPanel } from './MetadataPanel'

const RENDER_MODES: { id: RenderMode; label: string }[] = [
  { id: 'shaded', label: 'Shaded' },
  { id: 'wireframe', label: 'Wireframe' },
  { id: 'xray', label: 'X-ray' }
]

interface PreviewPanelProps {
  selectedEntry: FileEntry | null
  preview: PreviewState
  renderMode: RenderMode
  onRenderModeChange: (mode: RenderMode) => void
  onOpen: () => void
  onShowInExplorer: () => void
  /** The configured Settings.renderColor - see Viewer3D. */
  renderColor: string
}

export function PreviewPanel({
  selectedEntry,
  preview,
  renderMode,
  onRenderModeChange,
  onOpen,
  onShowInExplorer,
  renderColor
}: PreviewPanelProps): React.JSX.Element {
  return (
    <div className="preview-panel">
      <div className="preview-panel__viewport">
        {selectedEntry && (
          <div className="preview-panel__header">
            <div className="preview-panel__file-info">
              <span className="preview-panel__file-name">{selectedEntry.name}</span>
              {' · '}
              <button type="button" className="preview-panel__open" onClick={onOpen}>
                Open in default app
              </button>
              {' · '}
              <button type="button" className="preview-panel__open" onClick={onShowInExplorer}>
                Open in Explorer
              </button>
            </div>
            {preview.status === 'ready' && (
              <div className="render-mode-toggle">
                {RENDER_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={mode.id === renderMode ? 'is-active' : ''}
                    onClick={() => onRenderModeChange(mode.id)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {preview.status === 'empty' && (
          <div className="preview-panel__empty">
            {selectedEntry ? 'This folder is empty' : 'No file selected'}
          </div>
        )}

        {preview.status === 'loading' && <div className="preview-panel__empty">Loading…</div>}

        {preview.status === 'not-available' && (
          <div className="preview-panel__empty">Preview not available for this file</div>
        )}

        {preview.status === 'error' && (
          <div className="preview-panel__empty preview-panel__empty--error">
            Couldn&apos;t load — file may be corrupted
          </div>
        )}

        {preview.status === 'ready' && (
          <Viewer3D
            vertices={preview.data.vertices}
            colors={preview.data.colors}
            boundingBox={preview.data.boundingBox}
            renderMode={renderMode}
            renderColor={renderColor}
          />
        )}
      </div>

      {selectedEntry && (
        <MetadataPanel
          entry={selectedEntry}
          renderable={preview.status === 'ready' ? preview.data : undefined}
        />
      )}
    </div>
  )
}
