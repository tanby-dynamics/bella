import { describe, expect, it } from 'vitest'
import { enumerateLocations, type DriveLister } from './locations'

describe('enumerateLocations', () => {
  it('maps a labeled drive to a Location using its label as the name', async () => {
    const lister: DriveLister = {
      listDrives: async () => [{ path: 'D:\\', label: 'Projects (D:)' }]
    }

    const locations = await enumerateLocations(lister)

    expect(locations).toEqual([{ name: 'Projects (D:)', path: 'D:\\' }])
  })

  it('falls back to a path-derived name when a drive has no label', async () => {
    const lister: DriveLister = {
      listDrives: async () => [{ path: 'C:\\' }]
    }

    const locations = await enumerateLocations(lister)

    expect(locations).toEqual([{ name: 'C:', path: 'C:\\' }])
  })
})
