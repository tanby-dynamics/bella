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

  it('has default settings (system theme, shaded render mode, name-ascending sort)', async () => {
    const store = createStore(fakeBackend())

    expect(await store.getSettings()).toEqual({
      theme: 'system',
      defaultRenderMode: 'shaded',
      sort: { column: 'name', direction: 'asc' }
    })
  })

  it('updates only the given settings fields, leaving the rest untouched', async () => {
    const store = createStore(fakeBackend())

    await store.setSettings({ theme: 'dark' })

    expect(await store.getSettings()).toEqual({
      theme: 'dark',
      defaultRenderMode: 'shaded',
      sort: { column: 'name', direction: 'asc' }
    })
  })

  it('updates the sort setting independently, leaving the rest untouched', async () => {
    const store = createStore(fakeBackend())

    await store.setSettings({ sort: { column: 'size', direction: 'desc' } })

    expect(await store.getSettings()).toEqual({
      theme: 'system',
      defaultRenderMode: 'shaded',
      sort: { column: 'size', direction: 'desc' }
    })
  })
})
