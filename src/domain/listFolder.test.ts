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
        isDirectory: false,
        size: 1234,
        modifiedAt: new Date('2026-08-06T00:00:00Z'),
        classification: { kind: 'renderable', format: 'stl' }
      }
    ])
  })

  it('classifies directories as other, regardless of name', () => {
    return listFolder(
      '/Projects',
      fakeReader({
        readEntries: async () => [{ name: 'Robot Arm.stl', isDirectory: true }]
      })
    ).then((entries) => {
      expect(entries[0]).toMatchObject({ isDirectory: true, classification: { kind: 'other' } })
    })
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
        isDirectory: false,
        size: 1200,
        modifiedAt: new Date('2026-08-01T00:00:00Z'),
        classification: { kind: 'renderable', format: 'stl' }
      },
      {
        name: 'gripper_v3.step',
        path: '/Projects/Robot Arm/gripper_v3.step',
        isDirectory: false,
        size: 620,
        modifiedAt: new Date('2026-08-02T00:00:00Z'),
        classification: { kind: 'listed', format: 'step' }
      },
      {
        name: 'notes.txt',
        path: '/Projects/Robot Arm/notes.txt',
        isDirectory: false,
        size: 48,
        modifiedAt: new Date('2026-08-03T00:00:00Z'),
        classification: { kind: 'other' }
      }
    ])
  })

  it('sorts entries by name', async () => {
    const reader = fakeReader({
      readEntries: async () => [
        { name: 'wrist_bracket.scad', isDirectory: false },
        { name: 'base_plate.stl', isDirectory: false },
        { name: 'gripper_v3.step', isDirectory: false }
      ]
    })

    const entries = await listFolder('/Projects/Robot Arm', reader)

    expect(entries.map((e) => e.name)).toEqual([
      'base_plate.stl',
      'gripper_v3.step',
      'wrist_bracket.scad'
    ])
  })
})
