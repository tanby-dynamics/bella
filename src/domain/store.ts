export interface Favorite {
  name: string
  path: string
}

export type Theme = 'light' | 'dark' | 'system'
export type RenderMode = 'shaded' | 'wireframe' | 'xray'

/** Preset choices offered alongside the free-form hex/color-picker input -
 * not an exhaustive set, just the app's suggested starting points. The
 * first entry doubles as the default accent (see DEFAULT_STORE_DATA). */
export const ACCENT_COLOR_PRESETS = ['#f5a623', '#4fd1c5', '#ff8a9d', '#9aa3ff'] as const

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
   * app-wide choice. A hex string, either one of ACCENT_COLOR_PRESETS or a
   * user-supplied custom color. Distinct from any future 3D-viewer render
   * color - that's a separate, format-aware Setting. */
  accentColor: string
}

export interface StoreData {
  favorites: Favorite[]
  lastOpenedFolder: string | null
  settings: Settings
  /** The Skipped Version, if any - not a user-facing Setting, just
   * app-remembered state (same treatment as lastOpenedFolder). See
   * CONTEXT.md. */
  skippedUpdateVersion: string | null
  /** The most recently selected Render mode - not a user-facing Setting,
   * just app-remembered state (same treatment as lastOpenedFolder /
   * skippedUpdateVersion), so the preview reopens in whatever mode it was
   * last left in rather than a configured default. See CONTEXT.md. */
  lastRenderMode: RenderMode
}

export const DEFAULT_STORE_DATA: StoreData = {
  favorites: [],
  lastOpenedFolder: null,
  settings: {
    theme: 'system',
    sidebarWidth: 220,
    checkForUpdatesOnStartup: true,
    accentColor: ACCENT_COLOR_PRESETS[0]
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
  getFavorites(): Promise<Favorite[]>
  addFavorite(favorite: Favorite): Promise<void>
  removeFavorite(path: string): Promise<void>
  getLastOpenedFolder(): Promise<string | null>
  setLastOpenedFolder(path: string): Promise<void>
  getSettings(): Promise<Settings>
  setSettings(patch: Partial<Settings>): Promise<void>
  getSkippedUpdateVersion(): Promise<string | null>
  setSkippedUpdateVersion(version: string | null): Promise<void>
  getLastRenderMode(): Promise<RenderMode>
  setLastRenderMode(mode: RenderMode): Promise<void>
  /** Clears all stored configuration (favorites, last-opened folder,
   * settings, skipped update version, last render mode) back to defaults
   * and returns the reset data, so callers can apply it immediately
   * without a separate round of reads. */
  resetAll(): Promise<StoreData>
}

export function createStore(backend: StoreBackend): Store {
  // Merges in top-level and settings defaults rather than trusting the
  // backend's shape outright, so a config file written by an older version
  // of Bella (missing fields this version added, e.g. checkForUpdatesOnStartup)
  // still reads as complete instead of leaving those fields undefined.
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
    async getFavorites() {
      const data = await readData()
      return data.favorites
    },

    async addFavorite(favorite) {
      const data = await readData()
      await backend.write({ ...data, favorites: [...data.favorites, favorite] })
    },

    async removeFavorite(path) {
      const data = await readData()
      await backend.write({
        ...data,
        favorites: data.favorites.filter((f) => f.path !== path)
      })
    },

    async getLastOpenedFolder() {
      const data = await readData()
      return data.lastOpenedFolder
    },

    async setLastOpenedFolder(path) {
      const data = await readData()
      await backend.write({ ...data, lastOpenedFolder: path })
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
