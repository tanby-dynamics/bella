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
        { name: 'Robot Arm', isDirectory: true, isHidden: false },
        { name: 'base_plate.stl', isDirectory: false, isHidden: false }
      ]
    })

    const { subfolders, files } = await listFolderContents('/Projects', reader)

    expect(subfolders).toEqual([{ name: 'Robot Arm', path: '/Projects/Robot Arm' }])
    expect(files.map((f) => f.name)).toEqual(['base_plate.stl'])
  })

  it('does not stat subfolders - the tree only needs name/path for them', async () => {
    const reader = fakeReader({
      readEntries: async () => [{ name: 'Robot Arm', isDirectory: true, isHidden: false }],
      stat: async () => {
        throw new Error('must not stat a directory entry')
      }
    })

    const { subfolders } = await listFolderContents('/Projects', reader)

    expect(subfolders).toEqual([{ name: 'Robot Arm', path: '/Projects/Robot Arm' }])
  })

  it('classifies a Renderable-format file and attaches size/modified metadata', async () => {
    const reader = fakeReader({
      readEntries: async () => [{ name: 'base_plate.stl', isDirectory: false, isHidden: false }],
      stat: async () => ({ size: 1200, modifiedAt: new Date('2026-08-01T00:00:00Z') })
    })

    const { files } = await listFolderContents('/Projects/Robot Arm', reader)

    expect(files).toEqual([
      {
        name: 'base_plate.stl',
        path: '/Projects/Robot Arm/base_plate.stl',
        size: 1200,
        modifiedAt: new Date('2026-08-01T00:00:00Z'),
        classification: { kind: 'renderable', format: 'stl' }
      }
    ])
  })

  it('omits a file whose metadata cannot be read, instead of failing the whole listing', async () => {
    // Real folders - especially drive roots - can contain files an
    // ordinary user process isn't permitted to stat (system/locked files),
    // e.g. Windows' C:\DumpStack.log.tmp raising EPERM.
    const reader = fakeReader({
      readEntries: async () => [
        { name: 'base_plate.stl', isDirectory: false, isHidden: false },
        { name: 'locked.stl', isDirectory: false, isHidden: false }
      ],
      stat: async (entryPath) => {
        if (entryPath.endsWith('locked.stl')) {
          throw Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' })
        }
        return { size: 1200, modifiedAt: new Date('2026-08-01T00:00:00Z') }
      }
    })

    const { files } = await listFolderContents('/Projects/Robot Arm', reader)

    expect(files.map((f) => f.name)).toEqual(['base_plate.stl'])
  })

  it('omits any file without a 3D preview - Listed formats and unrecognized files alike - before even statting it', async () => {
    // Only a Renderable format (STL/OBJ/3MF/STEP) has a preview - Listed
    // formats (FCStd/SCAD) are recognized but show "preview not available"
    // if ever selected, and unrecognized files show nothing at all, so
    // neither belongs in a tree whose whole point is browsing to a
    // previewable file.
    const reader = fakeReader({
      readEntries: async () => [
        { name: 'base_plate.stl', isDirectory: false, isHidden: false },
        { name: 'forearm_link.FCStd', isDirectory: false, isHidden: false },
        { name: 'notes.txt', isDirectory: false, isHidden: false }
      ],
      stat: async (entryPath) => {
        if (!entryPath.endsWith('base_plate.stl')) {
          throw new Error('must not stat a file without a preview')
        }
        return { size: 1200, modifiedAt: new Date('2026-08-01T00:00:00Z') }
      }
    })

    const { files } = await listFolderContents('/Projects/Robot Arm', reader)

    expect(files.map((f) => f.name)).toEqual(['base_plate.stl'])
  })

  it('omits dotfiles and dotfolders on every platform', async () => {
    const reader = fakeReader({
      readEntries: async () => [
        { name: '.git', isDirectory: true, isHidden: false },
        { name: '.gitignore', isDirectory: false, isHidden: false },
        { name: 'Robot Arm', isDirectory: true, isHidden: false },
        { name: 'base_plate.stl', isDirectory: false, isHidden: false }
      ]
    })

    const { subfolders, files } = await listFolderContents('/Projects', reader)

    expect(subfolders.map((s) => s.name)).toEqual(['Robot Arm'])
    expect(files.map((f) => f.name)).toEqual(['base_plate.stl'])
  })

  it('omits entries the reader reports as OS-hidden (e.g. Windows Hidden attribute)', async () => {
    const reader = fakeReader({
      readEntries: async () => [
        { name: 'System Volume Information', isDirectory: true, isHidden: true },
        { name: 'thumbs.db', isDirectory: false, isHidden: true },
        { name: 'Robot Arm', isDirectory: true, isHidden: false }
      ]
    })

    const { subfolders, files } = await listFolderContents('/Projects', reader)

    expect(subfolders.map((s) => s.name)).toEqual(['Robot Arm'])
    expect(files).toEqual([])
  })

  it('returns empty subfolders and files for an empty folder', async () => {
    const reader = fakeReader({ readEntries: async () => [] })

    expect(await listFolderContents('/Projects', reader)).toEqual({ subfolders: [], files: [] })
  })

  it('sorts subfolders by name, case-insensitively', async () => {
    const reader = fakeReader({
      readEntries: async () => [
        { name: 'wrist', isDirectory: true, isHidden: false },
        { name: 'Base', isDirectory: true, isHidden: false },
        { name: 'Gripper', isDirectory: true, isHidden: false }
      ]
    })

    const { subfolders } = await listFolderContents('/Projects', reader)

    expect(subfolders.map((s) => s.name)).toEqual(['Base', 'Gripper', 'wrist'])
  })

  it('sorts files by name, case-insensitively', async () => {
    const reader = fakeReader({
      readEntries: async () => [
        { name: 'wrist.stl', isDirectory: false, isHidden: false },
        { name: 'Base.stl', isDirectory: false, isHidden: false },
        { name: 'Gripper.stl', isDirectory: false, isHidden: false }
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
        { name: 'aaa.stl', isDirectory: false, isHidden: false },
        { name: 'zzz-folder', isDirectory: true, isHidden: false }
      ],
      stat: async () => ({ size: 10, modifiedAt: new Date('2026-08-01T00:00:00Z') })
    })

    const { subfolders, files } = await listFolderContents('/Projects', reader)
    const renderOrder = [...subfolders, ...files].map((e) => e.name)

    expect(renderOrder).toEqual(['zzz-folder', 'aaa.stl'])
  })
})
