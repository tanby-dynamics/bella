/** One version's worth of Release Notes (see CONTEXT.md) - the text under a
 * single `## v<semver>` heading in release-notes.md. */
export interface ReleaseNotesEntry {
  version: string
  /** The free-text remainder of the heading line after the version, e.g.
   * "2026-08-08" - not parsed/validated, just carried through. */
  date: string | null
  body: string
}

// Matches "## v1.2.3" or "## v1.2.3 - 2026-08-08" headings. Requires a full
// x.y.z version (not just "v1") so a stray "## v-next" placeholder heading
// doesn't get mistaken for an entry.
const HEADING = /^##[ \t]+v(\d+\.\d+\.\d+)(?:[ \t]*-[ \t]*(.+?))?[ \t]*$/gm

/** Splits release-notes.md's Keep-a-Changelog-style content into entries,
 * in file order (by convention, newest first - see CONTEXT.md). Content
 * before the first heading (e.g. a "# Release Notes" title) is ignored. */
export function parseReleaseNotes(markdown: string): ReleaseNotesEntry[] {
  const headings = [...markdown.matchAll(HEADING)]

  return headings.map((match, i) => {
    // matchAll always populates `index` for a global regex match - the `?`
    // in RegExpMatchArray's type only accounts for non-global matches.
    const bodyStart = match.index! + match[0].length
    const bodyEnd = i + 1 < headings.length ? headings[i + 1].index! : markdown.length

    return {
      version: match[1],
      date: match[2] ?? null,
      body: markdown.slice(bodyStart, bodyEnd).trim()
    }
  })
}

/** The most recent entry - the one a release's changelog update is expected
 * to add at the top. Null if release-notes.md has no entries yet. */
export function getLatestEntry(markdown: string): ReleaseNotesEntry | null {
  return parseReleaseNotes(markdown)[0] ?? null
}
