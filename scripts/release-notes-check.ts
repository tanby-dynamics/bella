/**
 * Release workflow guard rail (see ADR 0002 / CONTEXT.md "Release workflow
 * guards the changelog"). Run before building installers on a tag push:
 *
 *   tsx scripts/release-notes-check.ts <tag> [outputFile]
 *
 * - <tag> is the pushed git tag, e.g. "v0.2.0".
 * - Fails (exit 1) if release-notes.md's top entry doesn't match the tag's
 *   version - catches a release cut without updating the changelog.
 * - If [outputFile] is given, writes the matching entry's body to it, for
 *   the workflow to use as the draft GitHub Release's body.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getLatestEntry } from '../src/domain/releaseNotes'

function main(): void {
  const [tag, outputFile] = process.argv.slice(2)
  if (!tag) {
    console.error('Usage: tsx scripts/release-notes-check.ts <tag> [outputFile]')
    process.exit(1)
  }

  const tagVersion = tag.replace(/^v/, '')
  const releaseNotesPath = resolve(import.meta.dirname, '../release-notes.md')
  const markdown = readFileSync(releaseNotesPath, 'utf8')
  const latest = getLatestEntry(markdown)

  if (!latest) {
    console.error('release-notes.md has no entries.')
    process.exit(1)
  }

  if (latest.version !== tagVersion) {
    console.error(
      `release-notes.md's top entry is v${latest.version}, but the pushed tag is ${tag}. ` +
        `Add a "## v${tagVersion}" entry to release-notes.md before tagging a release.`
    )
    process.exit(1)
  }

  console.log(`release-notes.md's top entry matches tag ${tag}.`)

  if (outputFile) {
    writeFileSync(outputFile, latest.body, 'utf8')
    console.log(`Wrote release notes body to ${outputFile}.`)
  }
}

main()
