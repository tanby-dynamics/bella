import type { SortColumn, SortDirection } from './sortEntries'

export interface Favorite {
  name: string
  path: string
}

export type Theme = 'light' | 'dark' | 'system'
export type RenderMode = 'shaded' | 'wireframe' | 'xray'

/** Persisted pixel widths for the file list's resizable columns. Name has
 * no entry - it always fills the remaining space. */
export interface ColumnWidths {
  modifiedAt: number
  type: number
  size: number
}

export interface Settings {
  theme: Theme
  defaultRenderMode: RenderMode
  /** Single global sort, applied to the file list across all folders -
   * not remembered per folder. See CONTEXT.md. */
  sort: { column: SortColumn; direction: SortDirection }
  columnWidths: ColumnWidths
  /** Whether an Update Check runs automatically on startup. Does not affect
   * the manual "Check for updates" action, which always runs. See
   * CONTEXT.md. */
  checkForUpdatesOnStartup: boolean
}

export interface StoreData {
  favorites: Favorite[]
  lastOpenedFolder: string | null
  settings: Settings
  /** The Skipped Version, if any - not a user-facing Setting, just
   * app-remembered state (same treatment as lastOpenedFolder). See
   * CONTEXT.md. */
  skippedUpdateVersion: string | null
}

export const DEFAULT_STORE_DATA: StoreData = {
  favorites: [],
  lastOpenedFolder: null,
  settings: {
    theme: 'system',
    defaultRenderMode: 'shaded',
    sort: { column: 'name', direction: 'asc' },
    columnWidths: { modifiedAt: 108, type: 92, size: 68 },
    checkForUpdatesOnStartup: true
  },
  skippedUpdateVersion: null
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
  /** Clears all stored configuration (favorites, last-opened folder,
   * settings, skipped update version) back to defaults and returns the
   * reset data, so callers can apply it immediately without a separate
   * round of reads. */
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

    async resetAll() {
      await backend.write(DEFAULT_STORE_DATA)
      return DEFAULT_STORE_DATA
    }
  }
}
