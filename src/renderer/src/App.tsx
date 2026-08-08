import { useEffect, useMemo, useState } from 'react'
import {
  sortEntries,
  type ColumnWidths,
  type Favorite,
  type FileEntry,
  type Location,
  type RenderMode,
  type Settings,
  type SortColumn,
  type SortDirection,
  type UpdateCheckResult,
  type UpdateDownloadStatus
} from './types'
import type { PreviewState } from './preview'
import { fileNameFromPath } from './paths'
import { Toolbar } from './components/Toolbar'
import { Sidebar } from './components/Sidebar'
import type { RevealRequest } from './components/LocationTree'
import { FileList } from './components/FileList'
import { PreviewPanel } from './components/PreviewPanel'
import { StatusBar } from './components/StatusBar'
import { SettingsPanel } from './components/SettingsPanel'
import { ReleaseNotesModal } from './components/ReleaseNotesModal'
import { UpdatePrompt } from './components/UpdatePrompt'

type AvailableUpdate = Extract<UpdateCheckResult, { available: true }>

// Single global sort setting, not remembered per folder (see CONTEXT.md) -
// this is the fallback before Settings has loaded from the store.
const DEFAULT_SORT: { column: SortColumn; direction: SortDirection } = {
  column: 'name',
  direction: 'asc'
}

// Fallback column widths before Settings has loaded - matches
// DEFAULT_STORE_DATA in src/domain/store.ts.
const DEFAULT_COLUMN_WIDTHS: ColumnWidths = { modifiedAt: 108, type: 92, size: 68 }

// Default direction when a column is first clicked (not yet the active
// sort) - Name/Type ascending, Date modified/Size descending, matching
// Explorer's own conventions. Clicking the already-active column toggles
// instead of falling back to this. See CONTEXT.md.
const DEFAULT_DIRECTION: Record<SortColumn, SortDirection> = {
  name: 'asc',
  type: 'asc',
  modifiedAt: 'desc',
  size: 'desc'
}

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
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  // The folder Bella opened at startup - captured once and never updated
  // again, so the Locations tree only auto-expands to it on initial mount,
  // not on every later navigation. See LocationTreeNode.
  const [initialFolder, setInitialFolder] = useState<string | null>(null)
  // Set only by breadcrumb clicks (see navigateFromBreadcrumb) - tells the
  // Locations tree to expand down to and scroll to that folder. Unlike
  // initialFolder this changes throughout the app's lifetime, so it's a
  // request object (nonce included) rather than a plain path, letting the
  // tree re-scroll even if the same segment is clicked twice in a row.
  const [revealRequest, setRevealRequest] = useState<RevealRequest | null>(null)
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
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

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.path === selectedPath) ?? null,
    [entries, selectedPath]
  )

  // Global sort - applies across every folder, not remembered per folder
  // (see CONTEXT.md) - so it lives in Settings alongside theme/render mode
  // rather than folder-scoped state.
  const sort = settings?.sort ?? DEFAULT_SORT
  const sortedEntries = useMemo(
    () => sortEntries(entries, sort.column, sort.direction),
    [entries, sort]
  )
  const columnWidths = settings?.columnWidths ?? DEFAULT_COLUMN_WIDTHS

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
      await navigate(startFolder)

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

  async function navigate(path: string): Promise<void> {
    setCurrentFolder(path)
    setSelectedPath(null)
    setPreview({ status: 'empty' })
    const loadedEntries = await window.api.listFolder(path)
    setEntries(loadedEntries)
    await window.api.setLastOpenedFolder(path)
  }

  // Breadcrumb click, specifically - reveals the target folder in the
  // Locations tree in addition to the plain navigate() every navigation
  // source triggers. Scoped to breadcrumb because it's the one nav path
  // that can jump to a folder the tree was never expanded down to
  // (Favorites can too, but only the breadcrumb was asked for here).
  async function navigateFromBreadcrumb(path: string): Promise<void> {
    await navigate(path)
    setRevealRequest((current) => ({ path, nonce: (current?.nonce ?? 0) + 1 }))
  }

  async function selectEntry(entry: FileEntry): Promise<void> {
    setSelectedPath(entry.path)
    setRenderMode(settings?.defaultRenderMode ?? 'shaded')

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

  async function openSelected(): Promise<void> {
    if (!selectedEntry) return
    await window.api.openExternal(selectedEntry.path)
  }

  async function addCurrentFolderAsFavorite(): Promise<void> {
    if (!currentFolder) return
    await window.api.addFavorite({ name: fileNameFromPath(currentFolder), path: currentFolder })
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

  async function changeSort(column: SortColumn): Promise<void> {
    const nextDirection: SortDirection =
      column === sort.column
        ? sort.direction === 'asc'
          ? 'desc'
          : 'asc'
        : DEFAULT_DIRECTION[column]
    await changeSettings({ sort: { column, direction: nextDirection } })
  }

  async function changeColumnWidths(widths: ColumnWidths): Promise<void> {
    await changeSettings({ columnWidths: widths })
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
        currentFolder={currentFolder}
        onNavigate={navigateFromBreadcrumb}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="app__body">
        <Sidebar
          favorites={favorites}
          locations={locations}
          currentFolder={currentFolder}
          initialFolder={initialFolder}
          revealRequest={revealRequest}
          onNavigate={navigate}
          onAddCurrentFolderAsFavorite={addCurrentFolderAsFavorite}
          onRemoveFavorite={removeFavorite}
        />
        <FileList
          entries={sortedEntries}
          selectedPath={selectedPath}
          onSelect={selectEntry}
          sort={sort}
          onSortChange={changeSort}
          columnWidths={columnWidths}
          onColumnWidthsChange={changeColumnWidths}
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
