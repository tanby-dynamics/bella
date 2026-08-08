import { describe, expect, it } from 'vitest'
import { getLatestEntry, parseReleaseNotes } from './releaseNotes'

describe('parseReleaseNotes', () => {
  it('returns no entries for an empty file', () => {
    expect(parseReleaseNotes('')).toEqual([])
  })

  it('returns no entries when there are no version headings', () => {
    expect(parseReleaseNotes('# Release Notes\n\nNothing here yet.')).toEqual([])
  })

  it('parses a single entry with a heading date', () => {
    const markdown = '## v0.1.0 - 2026-08-08\n- Initial release\n'

    expect(parseReleaseNotes(markdown)).toEqual([
      { version: '0.1.0', date: '2026-08-08', body: '- Initial release' }
    ])
  })

  it('parses a heading with no date as a null date', () => {
    const markdown = '## v0.1.0\n- Initial release\n'

    expect(parseReleaseNotes(markdown)).toEqual([
      { version: '0.1.0', date: null, body: '- Initial release' }
    ])
  })

  it('parses multiple entries in file order, each body stopping at the next heading', () => {
    const markdown = [
      '## v0.2.0 - 2026-08-08',
      '- Added thing',
      '',
      '## v0.1.0 - 2026-07-01',
      '- Initial release',
      ''
    ].join('\n')

    expect(parseReleaseNotes(markdown)).toEqual([
      { version: '0.2.0', date: '2026-08-08', body: '- Added thing' },
      { version: '0.1.0', date: '2026-07-01', body: '- Initial release' }
    ])
  })

  it('ignores content before the first heading', () => {
    const markdown = '# Release Notes\n\nSome preamble.\n\n## v0.1.0 - 2026-08-08\n- Initial release'

    expect(parseReleaseNotes(markdown)).toEqual([
      { version: '0.1.0', date: '2026-08-08', body: '- Initial release' }
    ])
  })

  it('trims surrounding whitespace from the body', () => {
    const markdown = '## v0.1.0 - 2026-08-08\n\n\n- Initial release\n\n\n'

    expect(parseReleaseNotes(markdown)[0].body).toBe('- Initial release')
  })
})

describe('getLatestEntry', () => {
  it('returns the first entry', () => {
    const markdown = '## v0.2.0 - 2026-08-08\n- Added thing\n\n## v0.1.0 - 2026-07-01\n- Initial release'

    expect(getLatestEntry(markdown)).toEqual({
      version: '0.2.0',
      date: '2026-08-08',
      body: '- Added thing'
    })
  })

  it('returns null when there are no entries', () => {
    expect(getLatestEntry('')).toBeNull()
  })
})
