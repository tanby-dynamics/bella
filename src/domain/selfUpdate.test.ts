import { describe, expect, it } from 'vitest'
import { canSelfUpdate } from './selfUpdate'

describe('canSelfUpdate', () => {
  it('is true on Windows', () => {
    expect(canSelfUpdate('win32', undefined)).toBe(true)
  })

  it('is true on Linux when running as an AppImage', () => {
    expect(canSelfUpdate('linux', '/path/to/Bella.AppImage')).toBe(true)
  })

  it('is false on Linux when not running as an AppImage (e.g. a deb or snap install)', () => {
    expect(canSelfUpdate('linux', undefined)).toBe(false)
  })

  it('is false on macOS, regardless of the AppImage env var', () => {
    expect(canSelfUpdate('darwin', undefined)).toBe(false)
    expect(canSelfUpdate('darwin', '/path/to/Bella.AppImage')).toBe(false)
  })
})
