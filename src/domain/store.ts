import {
  DEFAULT_PROJECT_STATE,
  reorderProjects,
  relocateProject,
  type Project,
  type ProjectState
} from './projects'

export type Theme = 'light' | 'dark' | 'system'
export type RenderMode = 'shaded' | 'wireframe' | 'xray'

/** Preset choices offered alongside the free-form hex/color-picker input,
 * shared by every color Setting (accent color, render color, ...) - not an
 * exhaustive set, just the app's suggested starting points. The first entry
 * doubles as each Setting's own default (see DEFAULT_STORE_DATA). */
export const COLOR_PRESETS = ['#f5a623', '#4fd1c5', '#ff8a9d', '#9aa3ff'] as const

export interface Settings {
  theme: Theme
  /** Persisted pixel width of the sidebar/Locations-tree panel. The sole
   * survivor of the old resizable-columns persistence (see the removed
   * ColumnWidths) now that the file list - and its per-column widths -
   * has been folded into the tree. See ADR 0004. */
  sidebarWidth: number
  /** Whether an Update Check runs automatically on startup. Does not affect
   * the manual "Check for updates" action, which always runs. See
   * CONTEXT.md. */
  checkForUpdatesOnStartup: boolean
  /** The single accent color used for highlights/emphasis across the whole
   * app (buttons, active states, icons, etc.) - not per-file-type, just one
   * app-wide choice. A hex string, either one of COLOR_PRESETS or a
   * user-supplied custom color. Distinct from renderColor, the 3D viewer's
   * mesh color. */
  accentColor: string
  /** The mesh color the 3D viewer falls back to for a Renderable-format
   * file, same choices as accentColor (COLOR_PRESETS or custom) but
   * configured and persisted independently. A format that carries its own
   * color info takes precedence over this fallback - STL has none, so it
   * always uses this setting; OBJ uses it only when it (or its resolved MTL)
   * supplies no material color of its own. See StlParseSuccess.colors. */
  renderColor: string
}

export interface StoreData {
  projects: Project[]
  /** The Active Project's path, if any - see CONTEXT.md. Not necessarily
   * present in `projects` (e.g. briefly, mid-removal) - callers should
   * treat a dangling reference the same as no Active Project. */
  activeProjectPath: string | null
  /** Each known Project's own remembered browsing state, keyed by its
   * exact `path` - see ProjectState. Absent entries read as
   * DEFAULT_PROJECT_STATE (a brand-new Project that hasn't been browsed
   * yet). */
  projectState: Record<string, ProjectState>
  settings: Settings
  /** The Skipped Version, if any - not a user-facing Setting, just
   * app-remembered state (same treatment as the Active Project). See
   * CONTEXT.md. */
  skippedUpdateVersion: string | null
  /** The most recently selected Render mode - not a user-facing Setting,
   * just app-remembered state (same treatment as Skipped Version), so the
   * preview reopens in whatever mode it was last left in rather than a
   * configured default. See CONTEXT.md. */
  lastRenderMode: RenderMode
}

export const DEFAULT_STORE_DATA: StoreData = {
  projects: [],
  activeProjectPath: null,
  projectState: {},
  settings: {
    theme: 'system',
    sidebarWidth: 220,
    checkForUpdatesOnStartup: true,
    accentColor: COLOR_PRESETS[0],
    renderColor: COLOR_PRESETS[0]
  },
  skippedUpdateVersion: null,
  lastRenderMode: 'shaded'
}

/** Backing storage for the store's data - swappable independently of the
 * store's own get/set interface. The real adapter persists to a local
 * app-config file; tests use an in-memory fake. */
export interface StoreBackend {
  read(): Promise<StoreData | undefined>
  write(data: StoreData): Promise<void>
}

export interface Store {
  getProjects(): Promise<Project[]>
  /** Appends `project` to the end of the list - the decision of whether to
   * add at all (vs. activating an existing duplicate) is made by the
   * caller via `addOrActivateProject` (see projects.ts), not here. */
  addProject(project: Project): Promise<void>
  /** Removes a Project and its per-project state together - see the
   * "removing a Project deletes its state immediately" decision in
   * CONTEXT.md. Also clears the Active Project if it was the one removed,
   * rather than silently activating whatever's left. */
  removeProject(path: string): Promise<void>
  renameProject(path: string, name: string): Promise<void>
  reorderProjects(orderedPaths: string[]): Promise<void>
  /** Repoints a Project at `newPath` (the "Relocate" action) and discards
   * its old per-project state - see relocateProject in projects.ts. */
  relocateProject(path: string, newPath: string): Promise<void>
  getActiveProjectPath(): Promise<string | null>
  setActiveProjectPath(path: string | null): Promise<void>
  getProjectState(path: string): Promise<ProjectState>
  setProjectState(path: string, patch: Partial<ProjectState>): Promise<void>
  getSettings(): Promise<Settings>
  setSettings(patch: Partial<Settings>): Promise<void>
  getSkippedUpdateVersion(): Promise<string | null>
  setSkippedUpdateVersion(version: string | null): Promise<void>
  getLastRenderMode(): Promise<RenderMode>
  setLastRenderMode(mode: RenderMode): Promise<void>
  /** Clears all stored configuration (projects, project state, settings,
   * skipped update version, last render mode) back to defaults and returns
   * the reset data, so callers can apply it immediately without a separate
   * round of reads. */
  resetAll(): Promise<StoreData>
}

export function createStore(backend: StoreBackend): Store {
  // Merges in top-level and settings defaults rather than trusting the
  // backend's shape outright, so a config file written by an older version
  // of Bella (missing fields this version added, e.g. checkForUpdatesOnStartup,
  // or predating Projects entirely - see ADR 0005) still reads as complete
  // instead of leaving those fields undefined. An older config's `favorites`/
  // `lastOpenedFolder` fields, if present, are simply never read by any
  // method below - dropped rather than migrated, per that ADR.
  async function readData(): Promise<StoreData> {
    const data = await backend.read()
    if (!data) return DEFAULT_STORE_DATA

    return {
      ...DEFAULT_STORE_DATA,
      ...data,
      settings: { ...DEFAULT_STORE_DATA.settings, ...data.settings }
    }
  }

  return {
    async getProjects() {
      const data = await readData()
      return data.projects
    },

    async addProject(project) {
      const data = await readData()
      await backend.write({ ...data, projects: [...data.projects, project] })
    },

    async removeProject(path) {
      const data = await readData()
      const remainingState = { ...data.projectState }
      delete remainingState[path]
      await backend.write({
        ...data,
        projects: data.projects.filter((project) => project.path !== path),
        activeProjectPath: data.activeProjectPath === path ? null : data.activeProjectPath,
        projectState: remainingState
      })
    },

    async renameProject(path, name) {
      const data = await readData()
      await backend.write({
        ...data,
        projects: data.projects.map((project) =>
          project.path === path ? { ...project, name } : project
        )
      })
    },

    async reorderProjects(orderedPaths) {
      const data = await readData()
      await backend.write({ ...data, projects: reorderProjects(data.projects, orderedPaths) })
    },

    async relocateProject(path, newPath) {
      const data = await readData()
      const remainingState = { ...data.projectState }
      delete remainingState[path]
      await backend.write({
        ...data,
        projects: relocateProject(data.projects, path, newPath),
        activeProjectPath: data.activeProjectPath === path ? newPath : data.activeProjectPath,
        projectState: {
          ...remainingState,
          [newPath]: { ...DEFAULT_PROJECT_STATE, expandedPaths: [newPath] }
        }
      })
    },

    async getActiveProjectPath() {
      const data = await readData()
      return data.activeProjectPath
    },

    async setActiveProjectPath(path) {
      const data = await readData()
      await backend.write({ ...data, activeProjectPath: path })
    },

    async getProjectState(path) {
      const data = await readData()
      return data.projectState[path] ?? DEFAULT_PROJECT_STATE
    },

    async setProjectState(path, patch) {
      const data = await readData()
      const current = data.projectState[path] ?? DEFAULT_PROJECT_STATE
      await backend.write({
        ...data,
        projectState: { ...data.projectState, [path]: { ...current, ...patch } }
      })
    },

    async getSettings() {
      const data = await readData()
      return data.settings
    },

    async setSettings(patch) {
      const data = await readData()
      await backend.write({ ...data, settings: { ...data.settings, ...patch } })
    },

    async getSkippedUpdateVersion() {
      const data = await readData()
      return data.skippedUpdateVersion
    },

    async setSkippedUpdateVersion(version) {
      const data = await readData()
      await backend.write({ ...data, skippedUpdateVersion: version })
    },

    async getLastRenderMode() {
      const data = await readData()
      return data.lastRenderMode
    },

    async setLastRenderMode(mode) {
      const data = await readData()
      await backend.write({ ...data, lastRenderMode: mode })
    },

    async resetAll() {
      await backend.write(DEFAULT_STORE_DATA)
      return DEFAULT_STORE_DATA
    }
  }
}
