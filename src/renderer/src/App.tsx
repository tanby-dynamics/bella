import { useEffect, useMemo, useState } from 'react'
import {
  sortEntries,
  type Favorite,
  type FileEntry,
  type Location,
  type RenderMode,
  type Settings,
  type SortColumn,
  type SortDirection
} from './types'
import type { PreviewState } from './preview'
import { fileNameFromPath } from './paths'
import { Toolbar } from './components/Toolbar'
import { Sidebar } from './components/Sidebar'
import { FileList } from './components/FileList'
import { PreviewPanel } from './components/PreviewPanel'
import { StatusBar } from './components/StatusBar'
import { SettingsPanel } from './components/SettingsPanel'

// Single global sort setting, not remembered per folder (see CONTEXT.md) -
// this is the fallback before Settings has loaded from the store.
const DEFAULT_SORT: { column: SortColumn; direction: SortDirection } = {
  column: 'name',
  direction: 'asc'
}

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
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState>({ status: 'empty' })
  const [renderMode, setRenderMode] = useState<RenderMode>('shaded')
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

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

  useEffect(() => {
    let cancelled = false

    async function init(): Promise<void> {
      const [loadedSettings, loadedFavorites, loadedLocations, lastOpenedFolder, homeDirectory] =
        await Promise.all([
          window.api.getSettings(),
          window.api.listFavorites(),
          window.api.listLocations(),
          window.api.getLastOpenedFolder(),
          window.api.getHomeDirectory()
        ])

      if (cancelled) return

      setSettings(loadedSettings)
      setRenderMode(loadedSettings.defaultRenderMode)
      applyTheme(loadedSettings.theme)
      setFavorites(loadedFavorites)
      setLocations(loadedLocations)

      await navigate(lastOpenedFolder ?? homeDirectory)
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  async function navigate(path: string): Promise<void> {
    setCurrentFolder(path)
    setSelectedPath(null)
    setPreview({ status: 'empty' })
    const loadedEntries = await window.api.listFolder(path)
    setEntries(loadedEntries)
    await window.api.setLastOpenedFolder(path)
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

  async function changeSort(column: SortColumn): Promise<void> {
    const nextDirection: SortDirection =
      column === sort.column
        ? sort.direction === 'asc'
          ? 'desc'
          : 'asc'
        : DEFAULT_DIRECTION[column]
    await changeSettings({ sort: { column, direction: nextDirection } })
  }

  return (
    <div className="app">
      <Toolbar
        currentFolder={currentFolder}
        onNavigate={navigate}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="app__body">
        <Sidebar
          favorites={favorites}
          locations={locations}
          currentFolder={currentFolder}
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
        />
        <PreviewPanel
          selectedEntry={selectedEntry}
          preview={preview}
          renderMode={renderMode}
          onRenderModeChange={setRenderMode}
          onOpen={openSelected}
        />
      </div>
      <StatusBar selectedEntry={selectedEntry} currentFolder={currentFolder} />

      {settingsOpen && settings && (
        <SettingsPanel
          settings={settings}
          onChange={changeSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}

export default App
