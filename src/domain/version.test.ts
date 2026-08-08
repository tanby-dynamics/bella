import { describe, expect, it } from 'vitest'
import { isNewerVersion } from './version'

describe('isNewerVersion', () => {
  it('is true when the candidate has a higher patch version', () => {
    expect(isNewerVersion('1.2.3', '1.2.4')).toBe(true)
  })

  it('is true when the candidate has a higher minor version', () => {
    expect(isNewerVersion('1.2.3', '1.3.0')).toBe(true)
  })

  it('is true when the candidate has a higher major version', () => {
    expect(isNewerVersion('1.2.3', '2.0.0')).toBe(true)
  })

  it('is false when the candidate is older', () => {
    expect(isNewerVersion('1.2.3', '1.2.2')).toBe(false)
  })

  it('is false when the versions are equal', () => {
    expect(isNewerVersion('1.2.3', '1.2.3')).toBe(false)
  })

  it('ignores an optional leading "v" on either side', () => {
    expect(isNewerVersion('v1.2.3', 'v1.2.4')).toBe(true)
    expect(isNewerVersion('1.2.3', 'v1.2.4')).toBe(true)
  })

  it('does not let a higher minor version be masked by a lower patch', () => {
    expect(isNewerVersion('1.9.9', '2.0.0')).toBe(true)
  })

  it('throws on a malformed version string', () => {
    expect(() => isNewerVersion('1.2.3', 'not-a-version')).toThrow(
      'Not a valid version string: "not-a-version"'
    )
  })
})
