import { describe, expect, it } from 'vitest'
import { sortEntries } from './sortEntries'
import type { FileEntry } from './listFolder'

function entry(overrides: Partial<FileEntry>): FileEntry {
  return {
    name: 'file.txt',
    path: `/Projects/${overrides.name ?? 'file.txt'}`,
    size: 0,
    modifiedAt: new Date(0),
    classification: { kind: 'other' },
    ...overrides
  }
}

describe('sortEntries', () => {
  it('sorts by name ascending', () => {
    const entries = [entry({ name: 'wrist_bracket.scad' }), entry({ name: 'base_plate.stl' })]

    const sorted = sortEntries(entries, 'name', 'asc')

    expect(sorted.map((e) => e.name)).toEqual(['base_plate.stl', 'wrist_bracket.scad'])
  })

  it('sorts by name descending', () => {
    const entries = [entry({ name: 'base_plate.stl' }), entry({ name: 'wrist_bracket.scad' })]

    const sorted = sortEntries(entries, 'name', 'desc')

    expect(sorted.map((e) => e.name)).toEqual(['wrist_bracket.scad', 'base_plate.stl'])
  })

  it('sorts by size ascending', () => {
    const entries = [
      entry({ name: 'big.stl', size: 5000 }),
      entry({ name: 'small.stl', size: 10 })
    ]

    const sorted = sortEntries(entries, 'size', 'asc')

    expect(sorted.map((e) => e.name)).toEqual(['small.stl', 'big.stl'])
  })

  it('sorts by size descending', () => {
    const entries = [
      entry({ name: 'small.stl', size: 10 }),
      entry({ name: 'big.stl', size: 5000 })
    ]

    const sorted = sortEntries(entries, 'size', 'desc')

    expect(sorted.map((e) => e.name)).toEqual(['big.stl', 'small.stl'])
  })

  it('sorts by modifiedAt ascending (oldest first)', () => {
    const entries = [
      entry({ name: 'new.stl', modifiedAt: new Date('2026-08-06') }),
      entry({ name: 'old.stl', modifiedAt: new Date('2026-01-01') })
    ]

    const sorted = sortEntries(entries, 'modifiedAt', 'asc')

    expect(sorted.map((e) => e.name)).toEqual(['old.stl', 'new.stl'])
  })

  it('sorts by modifiedAt descending (newest first)', () => {
    const entries = [
      entry({ name: 'old.stl', modifiedAt: new Date('2026-01-01') }),
      entry({ name: 'new.stl', modifiedAt: new Date('2026-08-06') })
    ]

    const sorted = sortEntries(entries, 'modifiedAt', 'desc')

    expect(sorted.map((e) => e.name)).toEqual(['new.stl', 'old.stl'])
  })

  it('sorts by type using the friendly type label, not the raw classification', () => {
    const entries = [
      entry({ name: 'gripper.step', classification: { kind: 'listed', format: 'step' } }), // "STEP File"
      entry({ name: 'base.stl', classification: { kind: 'renderable', format: 'stl' } }), // "STL File"
      entry({ name: 'notes.txt', classification: { kind: 'other' } }) // "File"
    ]

    const sorted = sortEntries(entries, 'type', 'asc')

    // Alphabetical by label: "File" < "STEP File" < "STL File"
    expect(sorted.map((e) => e.name)).toEqual(['notes.txt', 'gripper.step', 'base.stl'])
  })

  it('sorts by type descending', () => {
    const entries = [
      entry({ name: 'notes.txt', classification: { kind: 'other' } }), // "File"
      entry({ name: 'gripper.step', classification: { kind: 'listed', format: 'step' } }), // "STEP File"
      entry({ name: 'base.stl', classification: { kind: 'renderable', format: 'stl' } }) // "STL File"
    ]

    const sorted = sortEntries(entries, 'type', 'desc')

    expect(sorted.map((e) => e.name)).toEqual(['base.stl', 'gripper.step', 'notes.txt'])
  })

  it('sorts by name case-insensitively', () => {
    const entries = [entry({ name: 'Zebra.stl' }), entry({ name: 'apple.stl' })]

    const sorted = sortEntries(entries, 'name', 'asc')

    expect(sorted.map((e) => e.name)).toEqual(['apple.stl', 'Zebra.stl'])
  })

  it('breaks ties by keeping the original relative order (stable sort)', () => {
    const entries = [
      entry({ name: 'b.stl', size: 100 }),
      entry({ name: 'a.stl', size: 100 }),
      entry({ name: 'c.stl', size: 100 })
    ]

    const sorted = sortEntries(entries, 'size', 'asc')

    expect(sorted.map((e) => e.name)).toEqual(['b.stl', 'a.stl', 'c.stl'])
  })

  it('does not mutate the input array', () => {
    const entries = [entry({ name: 'wrist_bracket.scad' }), entry({ name: 'base_plate.stl' })]
    const original = [...entries]

    sortEntries(entries, 'name', 'asc')

    expect(entries).toEqual(original)
  })
})
