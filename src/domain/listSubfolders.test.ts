import { describe, expect, it } from 'vitest'
import { listSubfolders } from './listSubfolders'
import type { DirectoryReader } from './listFolder'

function fakeReader(overrides: Partial<DirectoryReader>): DirectoryReader {
  return {
    readEntries: async () => [],
    stat: async () => {
      throw new Error('listSubfolders must not stat entries - the tree only needs name/path')
    },
    ...overrides
  }
}

describe('listSubfolders', () => {
  it('returns only directory entries, excluding files', async () => {
    const reader = fakeReader({
      readEntries: async () => [
        { name: 'Robot Arm', isDirectory: true },
        { name: 'base_plate.stl', isDirectory: false }
      ]
    })

    const subfolders = await listSubfolders('/Projects', reader)

    expect(subfolders).toEqual([{ name: 'Robot Arm', path: '/Projects/Robot Arm' }])
  })

  it('returns an empty list for a folder with no subfolders', async () => {
    const reader = fakeReader({
      readEntries: async () => [{ name: 'notes.txt', isDirectory: false }]
    })

    const subfolders = await listSubfolders('/Projects', reader)

    expect(subfolders).toEqual([])
  })

  it('sorts subfolders by name', async () => {
    const reader = fakeReader({
      readEntries: async () => [
        { name: 'Wrist', isDirectory: true },
        { name: 'Base', isDirectory: true },
        { name: 'Gripper', isDirectory: true }
      ]
    })

    const subfolders = await listSubfolders('/Projects', reader)

    expect(subfolders.map((s) => s.name)).toEqual(['Base', 'Gripper', 'Wrist'])
  })
})
