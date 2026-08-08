import { describe, expect, it } from 'vitest'
import { breadcrumbSegments, fileNameFromPath, isAncestorPath } from './paths'

describe('breadcrumbSegments', () => {
  it('splits a unix-style path into segments with cumulative paths', () => {
    expect(breadcrumbSegments('/Projects/Robot Arm')).toEqual([
      { label: 'Projects', path: '/Projects' },
      { label: 'Robot Arm', path: '/Projects/Robot Arm' }
    ])
  })

  it('splits a Windows path without doubling the separator after the drive root', () => {
    expect(breadcrumbSegments('C:\\development\\tanby-dynamics\\bella')).toEqual([
      { label: 'C:', path: 'C:\\' },
      { label: 'development', path: 'C:\\development' },
      { label: 'tanby-dynamics', path: 'C:\\development\\tanby-dynamics' },
      { label: 'bella', path: 'C:\\development\\tanby-dynamics\\bella' }
    ])
  })

  it('handles a bare Windows drive root', () => {
    expect(breadcrumbSegments('C:\\')).toEqual([{ label: 'C:', path: 'C:\\' }])
  })
})

describe('isAncestorPath', () => {
  it('is true for the path itself', () => {
    expect(isAncestorPath('C:\\development', 'C:\\development')).toBe(true)
  })

  it('is true for a real ancestor', () => {
    expect(isAncestorPath('C:\\development', 'C:\\development\\bella')).toBe(true)
  })

  it('is false for a sibling with a matching prefix', () => {
    expect(isAncestorPath('/Projects', '/ProjectsOther')).toBe(false)
  })
})

describe('fileNameFromPath', () => {
  it('returns the last segment of a Windows path', () => {
    expect(fileNameFromPath('C:\\development\\bella')).toBe('bella')
  })
})
