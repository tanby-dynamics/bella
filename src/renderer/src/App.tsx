import { useEffect, useMemo, useState } from 'react'
import type {
  Favorite,
  FileEntry,
  Location,
  RenderMode,
  Settings,
  UpdateCheckResult,
  UpdateDownloadStatus
} from './types'
import type { PreviewState } from './preview'
import { fileNameFromPath, parentFolderPath } from './paths'
import { Toolbar } from './components/Toolbar'
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

function App(): React.JSX.Element {
  // The folder Bella opened at startup - captured once and never updated
  // again, so the Locations tree only auto-expands to it on initial mount.
  // Also the breadcrumb's fallback before anything's been highlighted. See
  // LocationTreeNode.
  const [initialFolder, setInitialFolder] = useState<string | null>(null)
  // Set by a breadcrumb click or a Favorite click - tells the Locations
  // tree to expand down to and scroll to that folder, without changing
  // what's highlighted. See LocationTreeNode.
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

  // The breadcrumb tracks whatever's currently highlighted in the tree -
  // a folder's own path, or a file's containing folder - not specifically
  // the previewed file, so highlighting a folder (which never touches the
  // preview) still updates "where am I" correctly. There's no separate
  // "current folder" left to read it from otherwise (see ADR 0004). Before
  // anything's been highlighted, it falls back to the folder Bella opened
  // at startup.
  const breadcrumbPath = useMemo(() => {
    if (!highlighted) return initialFolder
    return highlighted.kind === 'folder' ? highlighted.path : parentFolderPath(highlighted.path)
  }, [highlighted, initialFolder])

  useEffect(() => {
    let cancelled = false

    async function init(): Promise<void> {
      const [
        loadedSettings,
        loadedFavorites,
        loadedLocations,
        lastOpenedFolder,
        homeDirectory,
        version
      ] = await Promise.all([
        window.api.getSettings(),
        window.api.listFavorites(),
        window.api.listLocations(),
        window.api.getLastOpenedFolder(),
        window.api.getHomeDirectory(),
        window.api.getAppVersion()
      ])

      if (cancelled) return

      setSettings(loadedSettings)
      setRenderMode(loadedSettings.defaultRenderMode)
      applyTheme(loadedSettings.theme)
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
  // folder" for next startup's auto-expand/breadcrumb fallback, since
  // there's no other "current folder" signal left to persist.
  async function selectFile(entry: FileEntry): Promise<void> {
    setHighlighted({ path: entry.path, kind: 'file' })
    setSelectedEntry(entry)
    setRenderMode(settings?.defaultRenderMode ?? 'shaded')
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

  // A Favorite click - reveals (expands + scrolls to) that folder in the
  // tree, same as a breadcrumb segment, and highlights it as if its own row
  // had been clicked directly (unlike a breadcrumb reveal, which leaves the
  // highlight untouched - a Favorite click is a deliberate "go to this
  // folder", not just an aid for locating the already-selected file).
  function selectFavorite(path: string): void {
    setHighlighted({ path, kind: 'folder' })
    revealInTree(path)
  }

  // Breadcrumb segment click - expands and scrolls the tree to that
  // ancestor folder without changing what's highlighted or previewed.
  function revealInTree(path: string): void {
    setRevealRequest((current) => ({ path, nonce: (current?.nonce ?? 0) + 1 }))
  }

  async function openSelected(): Promise<void> {
    if (!selectedEntry) return
    await window.api.openExternal(selectedEntry.path)
  }

  async function addHighlightedFolderAsFavorite(): Promise<void> {
    if (highlighted?.kind !== 'folder') return
    await window.api.addFavorite({
      name: fileNameFromPath(highlighted.path),
      path: highlighted.path
    })
    setFavorites(await window.api.listFavorites())
  }

  async function removeFavorite(path: string): Promise<void> {
    await window.api.removeFavorite(path)
    setFavorites(await window.api.listFavorites())
  }

  async function changeSettings(patch: Partial<Settings>): Promise<void> {
    const updated = await window.api.setSettings(patch)
    setSettings(updated)
    if (patch.theme) applyTheme(updated.theme)
  }

  async function resetConfiguration(): Promise<void> {
    const defaults = await window.api.resetConfig()
    setSettings(defaults.settings)
    setRenderMode(defaults.settings.defaultRenderMode)
    applyTheme(defaults.settings.theme)
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
      <Toolbar
        breadcrumbPath={breadcrumbPath}
        onRevealPath={revealInTree}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="app__body">
        <Sidebar
          favorites={favorites}
          locations={locations}
          highlighted={highlighted}
          initialFolder={initialFolder}
          revealRequest={revealRequest}
          onSelectFavorite={selectFavorite}
          onSelectFolder={selectFolder}
          onSelectFile={selectFile}
          onAddHighlightedFolderAsFavorite={addHighlightedFolderAsFavorite}
          onRemoveFavorite={removeFavorite}
          width={sidebarWidth}
          onWidthChange={changeSidebarWidth}
        />
        <PreviewPanel
          selectedEntry={selectedEntry}
          preview={preview}
          renderMode={renderMode}
          onRenderModeChange={setRenderMode}
          onOpen={openSelected}
        />
      </div>
      <StatusBar
        selectedEntry={selectedEntry}
        appVersion={appVersion}
        onOpenReleaseNotes={() => setReleaseNotesOpen(true)}
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
