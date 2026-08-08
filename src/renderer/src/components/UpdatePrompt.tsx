import type { UpdateDownloadStatus } from '../types'

interface UpdatePromptProps {
  version: string
  canSelfUpdate: boolean
  downloadStatus: UpdateDownloadStatus | null
  onUpdateNow: () => void
  onRestartAndInstall: () => void
  onRemindLater: () => void
  onSkip: () => void
}

export function UpdatePrompt({
  version,
  canSelfUpdate,
  downloadStatus,
  onUpdateNow,
  onRestartAndInstall,
  onRemindLater,
  onSkip
}: UpdatePromptProps): React.JSX.Element {
  const downloading = downloadStatus?.status === 'progress'
  const complete = downloadStatus?.status === 'complete'

  return (
    <div className="settings-overlay">
      <div className="update-prompt">
        <div className="update-prompt__title">Bella {version} is available</div>

        {!canSelfUpdate && (
          <p className="update-prompt__body">
            A new version is available. Bella can&apos;t install it automatically on this platform
            yet - download it from the Releases page instead.
          </p>
        )}

        {downloadStatus?.status === 'error' && (
          <p className="update-prompt__error">Update failed: {downloadStatus.message}</p>
        )}

        {downloading && (
          <p className="update-prompt__body">Downloading update… {downloadStatus.percent}%</p>
        )}

        {complete && (
          <p className="update-prompt__body">Update downloaded - restart Bella to install it.</p>
        )}

        <div className="update-prompt__actions">
          {complete ? (
            <button type="button" className="update-prompt__primary" onClick={onRestartAndInstall}>
              Restart &amp; install
            </button>
          ) : (
            <button
              type="button"
              className="update-prompt__primary"
              onClick={onUpdateNow}
              disabled={downloading}
            >
              {canSelfUpdate ? 'Update now' : 'View on GitHub'}
            </button>
          )}

          {!complete && (
            <>
              <button type="button" onClick={onRemindLater} disabled={downloading}>
                Remind me later
              </button>
              <button type="button" onClick={onSkip} disabled={downloading}>
                Skip this version
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
