import { describe, expect, it } from 'vitest'
import { listFolder, type DirectoryReader } from './listFolder'

function fakeReader(overrides: Partial<DirectoryReader>): DirectoryReader {
  return {
    readEntries: async () => [],
    stat: async () => ({ size: 0, modifiedAt: new Date(0) }),
    ...overrides
  }
}

describe('listFolder', () => {
  it('classifies each entry by its CAD format', async () => {
    const reader = fakeReader({
      readEntries: async () => [{ name: 'base_plate.stl', isDirectory: false }],
      stat: async () => ({ size: 1234, modifiedAt: new Date('2026-08-06T00:00:00Z') })
    })

    const entries = await listFolder('/Projects/Robot Arm', reader)

    expect(entries).toEqual([
      {
        name: 'base_plate.stl',
        path: '/Projects/Robot Arm/base_plate.stl',
        size: 1234,
        modifiedAt: new Date('2026-08-06T00:00:00Z'),
        classification: { kind: 'renderable', format: 'stl' }
      }
    ])
  })

  it('excludes directory entries — the file panel lists files only, see ADR 0001', async () => {
    const reader = fakeReader({
      readEntries: async () => [
        { name: 'Robot Arm', isDirectory: true },
        { name: 'base_plate.stl', isDirectory: false }
      ]
    })

    const entries = await listFolder('/Projects', reader)

    expect(entries.map((e) => e.name)).toEqual(['base_plate.stl'])
  })

  it('attaches size/modified metadata to every entry in a mixed folder, including non-CAD files', async () => {
    const statByName: Record<string, { size: number; modifiedAt: Date }> = {
      'base_plate.stl': { size: 1200, modifiedAt: new Date('2026-08-01T00:00:00Z') },
      'gripper_v3.step': { size: 620, modifiedAt: new Date('2026-08-02T00:00:00Z') },
      'notes.txt': { size: 48, modifiedAt: new Date('2026-08-03T00:00:00Z') }
    }
    const reader = fakeReader({
      readEntries: async () => [
        { name: 'base_plate.stl', isDirectory: false },
        { name: 'gripper_v3.step', isDirectory: false },
        { name: 'notes.txt', isDirectory: false }
      ],
      stat: async (entryPath) => statByName[entryPath.split('/').pop()!]
    })

    const entries = await listFolder('/Projects/Robot Arm', reader)

    expect(entries).toEqual([
      {
        name: 'base_plate.stl',
        path: '/Projects/Robot Arm/base_plate.stl',
        size: 1200,
        modifiedAt: new Date('2026-08-01T00:00:00Z'),
        classification: { kind: 'renderable', format: 'stl' }
      },
      {
        name: 'gripper_v3.step',
        path: '/Projects/Robot Arm/gripper_v3.step',
        size: 620,
        modifiedAt: new Date('2026-08-02T00:00:00Z'),
        classification: { kind: 'listed', format: 'step' }
      },
      {
        name: 'notes.txt',
        path: '/Projects/Robot Arm/notes.txt',
        size: 48,
        modifiedAt: new Date('2026-08-03T00:00:00Z'),
        classification: { kind: 'other' }
      }
    ])
  })

  it('omits an entry whose metadata cannot be read, instead of failing the whole listing', async () => {
    // Real folders - especially drive roots - can contain files an
    // ordinary user process isn't permitted to stat (system/locked files),
    // e.g. Windows' C:\DumpStack.log.tmp raising EPERM.
    const reader = fakeReader({
      readEntries: async () => [
        { name: 'base_plate.stl', isDirectory: false },
        { name: 'DumpStack.log.tmp', isDirectory: false }
      ],
      stat: async (entryPath) => {
        if (entryPath.endsWith('DumpStack.log.tmp')) {
          throw Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' })
        }
        return { size: 1200, modifiedAt: new Date('2026-08-01T00:00:00Z') }
      }
    })

    const entries = await listFolder('/Projects/Robot Arm', reader)

    expect(entries.map((e) => e.name)).toEqual(['base_plate.stl'])
  })
})
