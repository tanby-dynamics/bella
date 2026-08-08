import { describe, expect, it } from 'vitest'
import { listFolderContents, type DirectoryReader } from './listFolderContents'

function fakeReader(overrides: Partial<DirectoryReader>): DirectoryReader {
  return {
    readEntries: async () => [],
    stat: async () => ({ size: 0, modifiedAt: new Date(0) }),
    ...overrides
  }
}

describe('listFolderContents', () => {
  it('splits a mixed folder into subfolders and files', async () => {
    const reader = fakeReader({
      readEntries: async () => [
        { name: 'Robot Arm', isDirectory: true },
        { name: 'base_plate.stl', isDirectory: false }
      ]
    })

    const { subfolders, files } = await listFolderContents('/Projects', reader)

    expect(subfolders).toEqual([{ name: 'Robot Arm', path: '/Projects/Robot Arm' }])
    expect(files.map((f) => f.name)).toEqual(['base_plate.stl'])
  })

  it('does not stat subfolders - the tree only needs name/path for them', async () => {
    const reader = fakeReader({
      readEntries: async () => [{ name: 'Robot Arm', isDirectory: true }],
      stat: async () => {
        throw new Error('must not stat a directory entry')
      }
    })

    const { subfolders } = await listFolderContents('/Projects', reader)

    expect(subfolders).toEqual([{ name: 'Robot Arm', path: '/Projects/Robot Arm' }])
  })

  it('classifies each file by its CAD format and attaches size/modified metadata', async () => {
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

    const { files } = await listFolderContents('/Projects/Robot Arm', reader)

    expect(files).toEqual([
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

  it('omits a file whose metadata cannot be read, instead of failing the whole listing', async () => {
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

    const { files } = await listFolderContents('/Projects/Robot Arm', reader)

    expect(files.map((f) => f.name)).toEqual(['base_plate.stl'])
  })

  it('returns empty subfolders and files for an empty folder', async () => {
    const reader = fakeReader({ readEntries: async () => [] })

    expect(await listFolderContents('/Projects', reader)).toEqual({ subfolders: [], files: [] })
  })

  it('sorts subfolders by name, case-insensitively', async () => {
    const reader = fakeReader({
      readEntries: async () => [
        { name: 'wrist', isDirectory: true },
        { name: 'Base', isDirectory: true },
        { name: 'Gripper', isDirectory: true }
      ]
    })

    const { subfolders } = await listFolderContents('/Projects', reader)

    expect(subfolders.map((s) => s.name)).toEqual(['Base', 'Gripper', 'wrist'])
  })

  it('sorts files by name, case-insensitively', async () => {
    const reader = fakeReader({
      readEntries: async () => [
        { name: 'wrist.stl', isDirectory: false },
        { name: 'Base.stl', isDirectory: false },
        { name: 'Gripper.stl', isDirectory: false }
      ]
    })

    const { files } = await listFolderContents('/Projects', reader)

    expect(files.map((f) => f.name)).toEqual(['Base.stl', 'Gripper.stl', 'wrist.stl'])
  })

  it('keeps subfolders and files as separate pre-sorted groups, so a consumer rendering subfolders before files gets folders-first ordering', async () => {
    // Deliberately alphabetically-hostile: 'aaa.stl' sorts before
    // 'zzz-folder' on name alone, so this only passes if the tree renders
    // the whole subfolders group ahead of the whole files group, not a
    // single alphabetical merge of both.
    const reader = fakeReader({
      readEntries: async () => [
        { name: 'aaa.stl', isDirectory: false },
        { name: 'zzz-folder', isDirectory: true }
      ],
      stat: async () => ({ size: 10, modifiedAt: new Date('2026-08-01T00:00:00Z') })
    })

    const { subfolders, files } = await listFolderContents('/Projects', reader)
    const renderOrder = [...subfolders, ...files].map((e) => e.name)

    expect(renderOrder).toEqual(['zzz-folder', 'aaa.stl'])
  })
})
