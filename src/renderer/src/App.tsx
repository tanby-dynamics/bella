import { useEffect, useState } from 'react'
import {
  COLOR_PRESETS,
  type Favorite,
  type FileEntry,
  type Location,
  type RenderMode,
  type Settings,
  type UpdateCheckResult,
  type UpdateDownloadStatus
} from './types'
import type { PreviewState } from './preview'
import { parentFolderPath } from './paths'
import { Sidebar } from './components/Sidebar'
import type { Highlighted, RevealRequest } from './components/LocationTree'
import { PreviewPanel } from './components/PreviewPanel'
import { StatusBar } from './components/StatusBar'
import { SettingsPanel } from './components/SettingsPanel'
import { ReleaseNotesModal } from './components/ReleaseNotesModal'
import { UpdatePrompt } from './components/UpdatePrompt'

type AvailableUpdate = Extract<UpdateCheckResult, { available: true }>

// Fallback sidebar width before Settings has loaded - matches
// DEFAULT_STORE_DATA in src/domain/store.ts.
const DEFAULT_SIDEBAR_WIDTH = 220

function applyTheme(theme: Settings['theme']): void {
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme
  document.documentElement.dataset.theme = resolved
}

// Overrides base.css's --accent default with the persisted/chosen Setting.
// The single accent used app-wide - not the (separate, future) 3D-viewer
// render color. See CONTEXT.md.
function applyAccentColor(color: string): void {
  document.documentElement.style.setProperty('--accent', color)
}

function App(): React.JSX.Element {
  // The folder Bella opened at startup - captured once and never updated
  // again, so the Locations tree only auto-expands to it on initial mount.
  // See LocationTreeNode.
  const [initialFolder, setInitialFolder] = useState<string | null>(null)
  // Tells the Locations tree to expand down to and scroll to a folder -
  // set on startup (see init below), and by revealInTree/
  // selectFolderAndReveal (Favorite clicks). Purely an expand-and-scroll
  // signal in itself; it never carries highlight information -
  // selectFolderAndReveal happens to also highlight the folder, but that's
  // a separate setState call, not something this causes. See
  // LocationTreeNode.
  const [revealRequest, setRevealRequest] = useState<RevealRequest | null>(null)
  const [highlighted, setHighlighted] = useState<Highlighted | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<FileEntry | null>(null)
  const [preview, setPreview] = useState<PreviewState>({ status: 'empty' })
  const [renderMode, setRenderMode] = useState<RenderMode>('shaded')
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState<AvailableUpdate | null>(null)
  const [downloadStatus, setDownloadStatus] = useState<UpdateDownloadStatus | null>(null)
  const [checkingForUpdates, setCheckingForUpdates] = useState(false)
  const [updateCheckMessage, setUpdateCheckMessage] = useState<string | null>(null)

  const sidebarWidth = settings?.sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH
  const renderColor = settings?.renderColor ?? COLOR_PRESETS[0]

  // Expands + scrolls the tree to `path`, without touching what's
  // highlighted - used for the one-off startup reveal (see init below),
  // where nothing's been clicked yet so nothing should be highlighted.
  // `align` defaults to 'nearest' - see RevealRequest.
  function revealInTree(path: string, align?: RevealRequest['align']): void {
    setRevealRequest((current) => ({ path, nonce: (current?.nonce ?? 0) + 1, align }))
  }

  useEffect(() => {
    let cancelled = false

    async function init(): Promise<void> {
      const [
        loadedSettings,
        loadedFavorites,
        loadedLocations,
        lastOpenedFolder,
        lastRenderMode,
        homeDirectory,
        version
      ] = await Promise.all([
        window.api.getSettings(),
        window.api.listFavorites(),
        window.api.listLocations(),
        window.api.getLastOpenedFolder(),
        window.api.getLastRenderMode(),
        window.api.getHomeDirectory(),
        window.api.getAppVersion()
      ])

      if (cancelled) return

      setSettings(loadedSettings)
      setRenderMode(lastRenderMode)
      applyTheme(loadedSettings.theme)
      applyAccentColor(loadedSettings.accentColor)
      setFavorites(loadedFavorites)
      setLocations(loadedLocations)
      setAppVersion(version)
      const startFolder = lastOpenedFolder ?? homeDirectory
      setInitialFolder(startFolder)
      // The tree auto-expands down to startFolder synchronously (see
      // LocationTreeNode's shouldAutoExpand, driven by initialFolder/
      // autoExpandPath) - that alone doesn't scroll it into view, though.
      // Reveal reuses the same ancestor-chain check, finds those nodes
      // already expanded, and just does the scroll. See ADR 0004 / user
      // story 15.
      revealInTree(startFolder)

      // Silent startup Update Check - never surfaces an error, and honours
      // a previously Skipped Version (bypassSkip: false). See CONTEXT.md.
      if (loadedSettings.checkForUpdatesOnStartup) {
        try {
          const result = await window.api.checkForUpdate(false)
          if (!cancelled && result.available) setUpdateAvailable(result)
        } catch {
          // Offline / GitHub unreachable - no error surfaced to the user.
        }
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return window.api.onUpdateDownloadStatus(setDownloadStatus)
  }, [])

  // A folder row's click - highlights it, but never touches the preview.
  // Expand/collapse is handled locally by the tree node itself.
  function selectFolder(path: string): void {
    setHighlighted({ path, kind: 'folder' })
  }

  // A file row's click - highlights it and loads it into the preview. The
  // only interaction that changes what's previewed (see ADR 0004): folder
  // clicks/expands never clear it. Also becomes the new "last opened
  // folder" for next startup's auto-expand, since there's no other
  // "current folder" signal left to persist.
  async function selectFile(entry: FileEntry): Promise<void> {
    setHighlighted({ path: entry.path, kind: 'file' })
    setSelectedEntry(entry)
    await window.api.setLastOpenedFolder(parentFolderPath(entry.path))

    if (entry.classification.kind !== 'renderable') {
      setPreview({ status: 'not-available' })
      return
    }

    setPreview({ status: 'loading' })
    const result = await window.api.parseRenderableFile(entry.path)
    if (result.ok) {
      setPreview({ status: 'ready', data: result })
    } else if (result.error === 'parse-error') {
      setPreview({ status: 'error', message: result.message })
    } else {
      setPreview({ status: 'not-available' })
    }
  }

  // A Favorite click - means "go to this folder": highlight it, as if its
  // own row had been clicked directly in the tree, and reveal (expand +
  // scroll to) it, even if the tree was never expanded down to it. Scrolls
  // it to the top of the sidebar (align: 'start') rather than the minimal
  // "nearest" scroll, since the user just asked to jump there. Never
  // touches the preview - selecting a folder this way is exactly like
  // selecting one by clicking its row.
  function selectFolderAndReveal(path: string): void {
    setHighlighted({ path, kind: 'folder' })
    revealInTree(path, 'start')
  }

  async function openSelected(): Promise<void> {
    if (!selectedEntry) return
    await window.api.openExternal(selectedEntry.path)
  }

  async function removeFavorite(path: string): Promise<void> {
    await window.api.removeFavorite(path)
    setFavorites(await window.api.listFavorites())
  }

  // "Make favorite"/"Unfavorite" from a Locations-tree folder's right-click
  // menu - see LocationTreeNode. Which one it means is decided here, from
  // current favorites state, rather than by the tree node itself.
  async function toggleFavorite(item: { name: string; path: string }): Promise<void> {
    if (favorites.some((f) => f.path === item.path)) {
      await window.api.removeFavorite(item.path)
    } else {
      await window.api.addFavorite(item)
    }
    setFavorites(await window.api.listFavorites())
  }

  async function changeSettings(patch: Partial<Settings>): Promise<void> {
    const updated = await window.api.setSettings(patch)
    setSettings(updated)
    if (patch.theme) applyTheme(updated.theme)
    if (patch.accentColor) applyAccentColor(updated.accentColor)
  }

  // Persists the newly picked Render mode as well as reflecting it in
  // state, so the preview reopens in whatever mode it was last left in -
  // not a configured default. See CONTEXT.md.
  async function changeRenderMode(mode: RenderMode): Promise<void> {
    setRenderMode(mode)
    await window.api.setLastRenderMode(mode)
  }

  async function resetConfiguration(): Promise<void> {
    const defaults = await window.api.resetConfig()
    setSettings(defaults.settings)
    setRenderMode(defaults.lastRenderMode)
    applyTheme(defaults.settings.theme)
    applyAccentColor(defaults.settings.accentColor)
    setFavorites(defaults.favorites)
  }

  async function changeSidebarWidth(width: number): Promise<void> {
    await changeSettings({ sidebarWidth: width })
  }

  async function checkForUpdatesManually(): Promise<void> {
    setCheckingForUpdates(true)
    setUpdateCheckMessage(null)
    try {
      const result = await window.api.checkForUpdate(true)
      if (result.available) {
        setSettingsOpen(false)
        setUpdateAvailable(result)
      } else {
        setUpdateCheckMessage("You're up to date.")
      }
    } catch {
      setUpdateCheckMessage("Couldn't check for updates - check your connection and try again.")
    } finally {
      setCheckingForUpdates(false)
    }
  }

  function updateNow(): void {
    if (updateAvailable?.canSelfUpdate) {
      setDownloadStatus(null)
      window.api.startUpdateDownload()
    } else {
      window.api.openReleasesPage()
      setUpdateAvailable(null)
    }
  }

  function restartAndInstall(): void {
    window.api.quitAndInstallUpdate()
  }

  function remindLater(): void {
    setUpdateAvailable(null)
    setDownloadStatus(null)
  }

  async function skipUpdate(): Promise<void> {
    if (!updateAvailable) return
    await window.api.skipUpdateVersion(updateAvailable.version)
    setUpdateAvailable(null)
    setDownloadStatus(null)
  }

  return (
    <div className="app">
      <div className="app__body">
        <Sidebar
          favorites={favorites}
          locations={locations}
          highlighted={highlighted}
          initialFolder={initialFolder}
          revealRequest={revealRequest}
          onSelectFavorite={selectFolderAndReveal}
          onSelectFolder={selectFolder}
          onSelectFile={selectFile}
          onRemoveFavorite={removeFavorite}
          onToggleFavorite={toggleFavorite}
          width={sidebarWidth}
          onWidthChange={changeSidebarWidth}
        />
        <PreviewPanel
          selectedEntry={selectedEntry}
          preview={preview}
          renderMode={renderMode}
          onRenderModeChange={changeRenderMode}
          onOpen={openSelected}
          renderColor={renderColor}
        />
      </div>
      <StatusBar
        selectedEntry={selectedEntry}
        appVersion={appVersion}
        onOpenReleaseNotes={() => setReleaseNotesOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {settingsOpen && settings && (
        <SettingsPanel
          settings={settings}
          onChange={changeSettings}
          onReset={resetConfiguration}
          onClose={() => setSettingsOpen(false)}
          onCheckForUpdates={checkForUpdatesManually}
          checkingForUpdates={checkingForUpdates}
          updateCheckMessage={updateCheckMessage}
        />
      )}

      {releaseNotesOpen && <ReleaseNotesModal onClose={() => setReleaseNotesOpen(false)} />}

      {updateAvailable && (
        <UpdatePrompt
          version={updateAvailable.version}
          canSelfUpdate={updateAvailable.canSelfUpdate}
          downloadStatus={downloadStatus}
          onUpdateNow={updateNow}
          onRestartAndInstall={restartAndInstall}
          onRemindLater={remindLater}
          onSkip={skipUpdate}
        />
      )}
    </div>
  )
}

export default App
