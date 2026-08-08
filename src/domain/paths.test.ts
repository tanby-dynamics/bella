import { describe, expect, it } from 'vitest'
import { joinPath } from './paths'

describe('joinPath', () => {
  it('joins with forward slash for unix-style paths', () => {
    expect(joinPath('/Projects', 'Robot Arm')).toBe('/Projects/Robot Arm')
  })

  it('joins with backslash for a Windows drive root', () => {
    expect(joinPath('C:\\', 'Users')).toBe('C:\\Users')
  })

  it('joins with backslash for a Windows subfolder', () => {
    expect(joinPath('C:\\Users\\me', 'Documents')).toBe('C:\\Users\\me\\Documents')
  })

  it('does not double up a trailing separator', () => {
    expect(joinPath('/Volumes/External/', 'Projects')).toBe('/Volumes/External/Projects')
  })
})
