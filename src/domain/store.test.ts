import { describe, expect, it } from 'vitest'
import { createStore, DEFAULT_STORE_DATA, type StoreBackend, type StoreData } from './store'

function fakeBackend(initial?: StoreData): StoreBackend {
  let data: StoreData | undefined = initial
  return {
    read: async () => data,
    write: async (next) => {
      data = next
    }
  }
}

describe('store', () => {
  it('has no favorites by default', async () => {
    const store = createStore(fakeBackend())

    expect(await store.getFavorites()).toEqual([])
  })

  it('adds a favorite and persists it', async () => {
    const store = createStore(fakeBackend())

    await store.addFavorite({ name: '3D Projects', path: 'D:\\3D Projects' })

    expect(await store.getFavorites()).toEqual([{ name: '3D Projects', path: 'D:\\3D Projects' }])
  })

  it('removes a favorite by path', async () => {
    const store = createStore(
      fakeBackend({
        ...DEFAULT_STORE_DATA,
        favorites: [
          { name: 'Desktop', path: 'C:\\Desktop' },
          { name: '3D Projects', path: 'D:\\3D Projects' }
        ]
      })
    )

    await store.removeFavorite('C:\\Desktop')

    expect(await store.getFavorites()).toEqual([{ name: '3D Projects', path: 'D:\\3D Projects' }])
  })

  it('has no last-opened folder by default', async () => {
    const store = createStore(fakeBackend())

    expect(await store.getLastOpenedFolder()).toBeNull()
  })

  it('sets and gets the last-opened folder', async () => {
    const store = createStore(fakeBackend())

    await store.setLastOpenedFolder('D:\\Projects\\Robot Arm')

    expect(await store.getLastOpenedFolder()).toBe('D:\\Projects\\Robot Arm')
  })

  it('has default settings (system theme, shaded render mode, name-ascending sort, update checks on)', async () => {
    const store = createStore(fakeBackend())

    expect(await store.getSettings()).toEqual({
      theme: 'system',
      defaultRenderMode: 'shaded',
      sort: { column: 'name', direction: 'asc' },
      columnWidths: { modifiedAt: 108, type: 92, size: 68 },
      checkForUpdatesOnStartup: true
    })
  })

  it('updates only the given settings fields, leaving the rest untouched', async () => {
    const store = createStore(fakeBackend())

    await store.setSettings({ theme: 'dark' })

    expect(await store.getSettings()).toEqual({
      theme: 'dark',
      defaultRenderMode: 'shaded',
      sort: { column: 'name', direction: 'asc' },
      columnWidths: { modifiedAt: 108, type: 92, size: 68 },
      checkForUpdatesOnStartup: true
    })
  })

  it('updates the sort setting independently, leaving the rest untouched', async () => {
    const store = createStore(fakeBackend())

    await store.setSettings({ sort: { column: 'size', direction: 'desc' } })

    expect(await store.getSettings()).toEqual({
      theme: 'system',
      defaultRenderMode: 'shaded',
      sort: { column: 'size', direction: 'desc' },
      columnWidths: { modifiedAt: 108, type: 92, size: 68 },
      checkForUpdatesOnStartup: true
    })
  })

  it('has default column widths', async () => {
    const store = createStore(fakeBackend())

    expect((await store.getSettings()).columnWidths).toEqual({
      modifiedAt: 108,
      type: 92,
      size: 68
    })
  })

  it('updates the column widths independently, leaving the rest untouched', async () => {
    const store = createStore(fakeBackend())

    await store.setSettings({ columnWidths: { modifiedAt: 140, type: 92, size: 68 } })

    expect(await store.getSettings()).toEqual({
      theme: 'system',
      defaultRenderMode: 'shaded',
      sort: { column: 'name', direction: 'asc' },
      columnWidths: { modifiedAt: 140, type: 92, size: 68 },
      checkForUpdatesOnStartup: true
    })
  })

  it('updates the checkForUpdatesOnStartup setting independently, leaving the rest untouched', async () => {
    const store = createStore(fakeBackend())

    await store.setSettings({ checkForUpdatesOnStartup: false })

    expect(await store.getSettings()).toEqual({
      theme: 'system',
      defaultRenderMode: 'shaded',
      sort: { column: 'name', direction: 'asc' },
      columnWidths: { modifiedAt: 108, type: 92, size: 68 },
      checkForUpdatesOnStartup: false
    })
  })

  it('resetAll clears favorites, last-opened folder, settings, and skipped update version back to defaults', async () => {
    const store = createStore(
      fakeBackend({
        favorites: [{ name: '3D Projects', path: 'D:\\3D Projects' }],
        lastOpenedFolder: 'D:\\3D Projects',
        settings: {
          theme: 'dark',
          defaultRenderMode: 'wireframe',
          sort: { column: 'size', direction: 'desc' },
          columnWidths: { modifiedAt: 140, type: 92, size: 68 },
          checkForUpdatesOnStartup: false
        },
        skippedUpdateVersion: '0.2.0'
      })
    )

    const result = await store.resetAll()

    expect(result).toEqual(DEFAULT_STORE_DATA)
    expect(await store.getFavorites()).toEqual([])
    expect(await store.getLastOpenedFolder()).toBeNull()
    expect(await store.getSettings()).toEqual(DEFAULT_STORE_DATA.settings)
    expect(await store.getSkippedUpdateVersion()).toBeNull()
  })
})

describe('store - Skipped Version', () => {
  it('has no skipped update version by default', async () => {
    const store = createStore(fakeBackend())

    expect(await store.getSkippedUpdateVersion()).toBeNull()
  })

  it('sets and gets the skipped update version', async () => {
    const store = createStore(fakeBackend())

    await store.setSkippedUpdateVersion('0.2.0')

    expect(await store.getSkippedUpdateVersion()).toBe('0.2.0')
  })

  it('clears the skipped update version by setting it to null', async () => {
    const store = createStore(fakeBackend({ ...DEFAULT_STORE_DATA, skippedUpdateVersion: '0.2.0' }))

    await store.setSkippedUpdateVersion(null)

    expect(await store.getSkippedUpdateVersion()).toBeNull()
  })

  it('fills in defaults for fields missing from an older on-disk config', async () => {
    // Simulates a config file written before checkForUpdatesOnStartup /
    // skippedUpdateVersion existed.
    const store = createStore(
      fakeBackend({
        favorites: [],
        lastOpenedFolder: null,
        settings: {
          theme: 'dark',
          defaultRenderMode: 'shaded',
          sort: { column: 'name', direction: 'asc' },
          columnWidths: { modifiedAt: 108, type: 92, size: 68 }
        }
      } as unknown as StoreData)
    )

    expect(await store.getSkippedUpdateVersion()).toBeNull()
    expect((await store.getSettings()).checkForUpdatesOnStartup).toBe(true)
    // Fields the old config did have are preserved, not clobbered by defaults.
    expect((await store.getSettings()).theme).toBe('dark')
  })
})
