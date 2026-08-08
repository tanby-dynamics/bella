import { app, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { canSelfUpdate, isNewerVersion } from '../domain'
import type { UpdateCheckResult, UpdateDownloadStatus } from '../shared/ipc'

const REPO = 'tanby-dynamics/bella'
const RELEASES_URL = `https://github.com/${REPO}/releases`

// We drive downloads ourselves (see startDownload) rather than letting
// electron-updater auto-download/auto-install on its own schedule - the
// Update Prompt's "Update now" action is what should trigger a download,
// not a background timer.
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false

/** An Update Check (see CONTEXT.md): asks the GitHub API for the repo's
 * latest published Release directly, rather than going through
 * electron-updater's own check - that keeps the "is there a newer
 * Version" question independent of per-platform update-feed quirks (it
 * works identically, including on macOS, which doesn't get to
 * self-update). electron-updater is only used afterwards, for the actual
 * download on platforms that support self-update. */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
  // A 404 here just means the repo has no published releases yet.
  if (!response.ok) return { available: false }

  const release = (await response.json()) as { tag_name: string }
  const latestVersion = release.tag_name.replace(/^v/, '')

  if (!isNewerVersion(app.getVersion(), latestVersion)) {
    return { available: false }
  }

  return {
    available: true,
    version: latestVersion,
    canSelfUpdate: canSelfUpdate(process.platform, process.env.APPIMAGE)
  }
}

/** Starts a self-update download, reporting progress/completion/errors via
 * `onStatus`. Only meaningful when canSelfUpdate() is true - the Update
 * Prompt doesn't offer this action on macOS. */
export function startDownload(onStatus: (status: UpdateDownloadStatus) => void): void {
  autoUpdater.removeAllListeners('download-progress')
  autoUpdater.removeAllListeners('update-downloaded')
  autoUpdater.removeAllListeners('error')

  autoUpdater.on('download-progress', (progress) => {
    onStatus({ status: 'progress', percent: Math.round(progress.percent) })
  })
  autoUpdater.once('update-downloaded', () => {
    onStatus({ status: 'complete' })
  })
  autoUpdater.once('error', (error) => {
    onStatus({ status: 'error', message: error.message })
  })

  // electron-updater requires its own checkForUpdates() before
  // downloadUpdate() will work - it's what populates the update info the
  // download step needs. This duplicates the network round-trip
  // checkForUpdate() above already made, but keeps us on electron-updater's
  // supported API surface rather than reaching into its internals.
  autoUpdater
    .checkForUpdates()
    .then((result) => {
      if (!result) {
        onStatus({ status: 'error', message: 'No update available to download.' })
        return undefined
      }
      return autoUpdater.downloadUpdate()
    })
    .catch((error: unknown) => {
      onStatus({ status: 'error', message: error instanceof Error ? error.message : String(error) })
    })
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall()
}

export function openReleasesPage(): Promise<void> {
  return shell.openExternal(RELEASES_URL)
}
