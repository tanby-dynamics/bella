import { useEffect, useRef, useState } from 'react'
import {
  COLOR_PRESETS,
  type FileEntry,
  type Project,
  type RenderMode,
  type Settings,
  type UpdateCheckResult,
  type UpdateDownloadStatus
} from './types'
import type { PreviewState } from './preview'
import { parentFolderPath } from './paths'
import { Sidebar, type RenameRequest } from './components/Sidebar'
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
  const [projects, setProjects] = useState<Project[]>([])
  // The Active Project's path, if any - see CONTEXT.md. Kept separately
  // from `projects` (rather than storing the whole Project inline) so a
  // rename/relocate that only touches the `projects` array doesn't need to
  // also reconcile a duplicate copy of the active one.
  const [activeProjectPath, setActiveProjectPath] = useState<string | null>(null)
  // Projects whose directory failed to load the last time they were
  // activated - see CONTEXT.md's "missing directory" decision. Cleared
  // optimistically on every (re-)activation attempt; re-added if that
  // attempt's root fetch fails again - see handleLoadError.
  const [missingProjectPaths, setMissingProjectPaths] = useState<Set<string>>(new Set())
  // The Active Project's own persisted expand-state - see ProjectState and
  // LocationTreeNode. Reset (not merged) on every activateProject call,
  // since it belongs to whichever Project is active.
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  // Tells the Locations tree to expand down to and scroll to a path - set
  // on Project activation, when restoring that Project's persisted
  // selected file. Purely an expand-and-scroll signal in itself; it never
  // carries highlight information - that's a separate setState call. See
  // LocationTreeNode.
  const [revealRequest, setRevealRequest] = useState<RevealRequest | null>(null)
  // Tells the PROJECTS list to open a freshly-added Project's row in
  // inline rename mode - see RenameRequest.
  const [renameRequest, setRenameRequest] = useState<RenameRequest | null>(null)
  const [highlighted, setHighlighted] = useState<Highlighted | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<FileEntry | null>(null)
  const [preview, setPreview] = useState<PreviewState>({ status: 'empty' })
  const [renderMode, setRenderMode] = useState<RenderMode>('shaded')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState<AvailableUpdate | null>(null)
  const [downloadStatus, setDownloadStatus] = useState<UpdateDownloadStatus | null>(null)
  const [checkingForUpdates, setCheckingForUpdates] = useState(false)
  const [updateCheckMessage, setUpdateCheckMessage] = useState<string | null>(null)
  // A monotonic counter, incremented at the start of every selectFile call -
  // the source of truth for "which selection is current" that both this
  // component and the main process (see requestId in parseWorkerClient.ts)
  // check against. Parsing runs on a worker_thread on the main side rather
  // than blocking it, so clicking a second file before the first finishes
  // loading is exactly the point - both requests are genuinely in flight
  // together (the main process actively preempts the earlier one - see
  // parseWorkerClient.ts), and whichever settles last should never win just
  // because it was slower or arrived out of order. A ref rather than state
  // since this is read inside an async callback, never rendered.
  const requestSeqRef = useRef(0)

  const sidebarWidth = settings?.sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH
  const renderColor = settings?.renderColor ?? COLOR_PRESETS[0]

  // Expands + scrolls the tree to `path`, without touching what's
  // highlighted. `align` defaults to 'nearest' - see RevealRequest.
  function revealInTree(path: string, align?: RevealRequest['align']): void {
    setRevealRequest((current) => ({ path, nonce: (current?.nonce ?? 0) + 1, align }))
  }

  // Makes `project` the Active Project: persists the switch, resets
  // whatever was highlighted/previewed (it belonged to the previous
  // Project), then restores this Project's own remembered state -
  // expanded folders, and its selected file if it still exists (silently
  // ignored otherwise - see CONTEXT.md's "missing file" decision). Also
  // used to (re-)activate the same Project, e.g. clicking its row again to
  // retry after a missing-directory error.
  async function activateProject(project: Project): Promise<void> {
    setHighlighted(null)
    setSelectedEntry(null)
    setPreview({ status: 'empty' })
    // Optimistic clear - re-added below (via handleLoadError, fired by the
    // freshly-mounted root tree node) if the directory still can't be found.
    setMissingProjectPaths((current) => {
      if (!current.has(project.path)) return current
      const next = new Set(current)
      next.delete(project.path)
      return next
    })

    // Fetched *before* setActiveProjectPath below, and applied together
    // with it - setActiveProjectPath is what makes Sidebar mount the tree
    // (see the `activeProject &&` check), and LocationTreeNode decides its
    // *initial* expanded state once, at mount, from the expandedPaths prop
    // it's given right then. Setting activeProjectPath first (with
    // expandedPaths still the previous Project's, or empty) would mount
    // the tree collapsed no matter what this Project's own persisted
    // expand-state says - too late for a later setExpandedPaths call to
    // undo.
    const state = await window.api.getProjectState(project.path)
    setExpandedPaths(new Set(state.expandedPaths))
    setActiveProjectPath(project.path)
    void window.api.setActiveProjectPath(project.path)

    if (!state.selectedFilePath) return

    try {
      const parentContents = await window.api.listFolderContents(
        parentFolderPath(state.selectedFilePath)
      )
      const entry = parentContents.files.find((file) => file.path === state.selectedFilePath)
      if (entry) {
        await selectFile(entry)
        revealInTree(state.selectedFilePath, 'start')
      }
      // No matching entry: the file was deleted/moved while Bella was
      // closed - silently leave nothing selected, per CONTEXT.md.
    } catch {
      // The containing folder itself is gone too - same silent treatment.
      // A missing Project *directory* specifically still surfaces via the
      // tree's own root-node error state (see handleLoadError).
    }
  }

  useEffect(() => {
    let cancelled = false

    async function init(): Promise<void> {
      const [loadedSettings, loadedProjects, activePath, lastRenderMode, version] =
        await Promise.all([
          window.api.getSettings(),
          window.api.listProjects(),
          window.api.getActiveProjectPath(),
          window.api.getLastRenderMode(),
          window.api.getAppVersion()
        ])

      if (cancelled) return

      setSettings(loadedSettings)
      setRenderMode(lastRenderMode)
      applyTheme(loadedSettings.theme)
      applyAccentColor(loadedSettings.accentColor)
      setProjects(loadedProjects)
      setAppVersion(version)

      const activeProject = loadedProjects.find((project) => project.path === activePath)
      if (activeProject) await activateProject(activeProject)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // clicks/expands never clear it. Also becomes the Active Project's own
  // remembered selected file, so reopening this Project resumes here - see
  // CONTEXT.md.
  async function selectFile(entry: FileEntry): Promise<void> {
    // Re-clicking the already-selected file is a no-op - it's already
    // highlighted, already remembered, and already loaded (or loading);
    // nothing about its state should change, so there's nothing to
    // re-fetch or re-parse. Guards against a real cost too: a second parse
    // of an expensive file (STEP) would preempt/kill the worker mid-render
    // for no reason - see parseWorkerClient.ts.
    if (entry.path === selectedEntry?.path) return

    const seq = ++requestSeqRef.current
    setHighlighted({ path: entry.path, kind: 'file' })
    setSelectedEntry(entry)
    if (activeProjectPath) {
      await window.api.setProjectState(activeProjectPath, { selectedFilePath: entry.path })
    }
    // Another selectFile may have started (and possibly already finished)
    // during that await - see requestSeqRef. If so, this call is stale:
    // applying anything below now would flash the wrong file's preview in
    // over whatever the newer selection already showed, or is still
    // loading.
    if (seq !== requestSeqRef.current) return

    if (entry.classification.kind !== 'renderable') {
      setPreview({ status: 'not-available' })
      return
    }

    setPreview({ status: 'loading' })
    const result = await window.api.parseRenderableFile(entry.path, seq)
    if (seq !== requestSeqRef.current) return
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

  async function showSelectedInExplorer(): Promise<void> {
    if (!selectedEntry) return
    await window.api.showItemInFolder(selectedEntry.path)
  }

  // The PROJECTS section's "+" button (or the empty-state's "Add Project")
  // - the only way a Project gets created, see CONTEXT.md. Opens the
  // native directory picker; a canceled pick is a no-op. A genuinely new
  // Project is both activated immediately and dropped into inline rename
  // mode; picking an already-known directory just activates that existing
  // entry (see addOrActivateProject in the domain layer).
  async function addProject(): Promise<void> {
    const result = await window.api.pickAndAddProject()
    if (!result) return

    setProjects(result.projects)
    const project = result.projects.find((p) => p.path === result.activeProjectPath)
    if (!project) return

    await activateProject(project)
    if (result.added) {
      setRenameRequest((current) => ({ path: project.path, nonce: (current?.nonce ?? 0) + 1 }))
    }
  }

  async function removeProject(path: string): Promise<void> {
    await window.api.removeProject(path)
    setProjects((current) => current.filter((project) => project.path !== path))
    setMissingProjectPaths((current) => {
      if (!current.has(path)) return current
      const next = new Set(current)
      next.delete(path)
      return next
    })

    if (path === activeProjectPath) {
      setActiveProjectPath(null)
      setHighlighted(null)
      setSelectedEntry(null)
      setPreview({ status: 'empty' })
      setExpandedPaths(new Set())
    }
  }

  async function renameProject(path: string, name: string): Promise<void> {
    await window.api.renameProject(path, name)
    setProjects((current) =>
      current.map((project) => (project.path === path ? { ...project, name } : project))
    )
  }

  async function reorderProjects(orderedPaths: string[]): Promise<void> {
    await window.api.reorderProjects(orderedPaths)
    setProjects((current) => {
      const byPath = new Map(current.map((project) => [project.path, project]))
      return orderedPaths
        .map((path) => byPath.get(path))
        .filter((project): project is Project => project !== undefined)
    })
  }

  // "Relocate…" from a Project's context menu - repoints it at a
  // newly-chosen directory via the same picker used to add a Project,
  // keeping its name and position. Reactivates it at the new path
  // afterward, since a relocated Project is almost always the one that was
  // just missing. A canceled pick is a no-op.
  async function relocateProject(path: string): Promise<void> {
    const relocated = await window.api.relocateProject(path)
    if (!relocated) return

    setProjects((current) =>
      current.map((project) => (project.path === path ? relocated : project))
    )
    await activateProject(relocated)
  }

  // Fired whenever a Locations-tree node's own expanded state changes -
  // keeps the Active Project's persisted expand-state in sync immediately,
  // not just at a checkpoint like switching Projects. See CONTEXT.md.
  function toggleExpand(path: string, isExpanded: boolean): void {
    const next = new Set(expandedPaths)
    if (isExpanded) next.add(path)
    else next.delete(path)
    setExpandedPaths(next)
    if (activeProjectPath) {
      void window.api.setProjectState(activeProjectPath, { expandedPaths: Array.from(next) })
    }
  }

  // Fired if the Active Project's own root folder-listing fails - see
  // LocationTreeNode. Ignores failures from any other (inactive) node's
  // subfolder - only the root, at the Active Project's own path, means the
  // Project itself can't be found.
  function handleLoadError(path: string): void {
    if (path !== activeProjectPath) return
    setMissingProjectPaths((current) => new Set(current).add(path))
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
    setProjects(defaults.projects)
    setActiveProjectPath(defaults.activeProjectPath)
    setMissingProjectPaths(new Set())
    setExpandedPaths(new Set())
    setHighlighted(null)
    setSelectedEntry(null)
    setPreview({ status: 'empty' })
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
          projects={projects}
          activeProjectPath={activeProjectPath}
          missingProjectPaths={missingProjectPaths}
          highlighted={highlighted}
          expandedPaths={expandedPaths}
          revealRequest={revealRequest}
          renameRequest={renameRequest}
          onSelectProject={activateProject}
          onAddProject={addProject}
          onRemoveProject={removeProject}
          onRenameProject={renameProject}
          onRelocateProject={relocateProject}
          onReorderProjects={reorderProjects}
          onSelectFolder={selectFolder}
          onSelectFile={selectFile}
          onToggleExpand={toggleExpand}
          onLoadError={handleLoadError}
          width={sidebarWidth}
          onWidthChange={changeSidebarWidth}
        />
        <PreviewPanel
          selectedEntry={selectedEntry}
          preview={preview}
          renderMode={renderMode}
          onRenderModeChange={changeRenderMode}
          onOpen={openSelected}
          onShowInExplorer={showSelectedInExplorer}
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
