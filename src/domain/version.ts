/** A semver-ish version string, e.g. "1.2.3" or "v1.2.3" - the `v` prefix
 * (used by git tags and Release Notes headings, see CONTEXT.md) is
 * optional and stripped before comparing. */
export type VersionString = string

function parse(version: VersionString): [number, number, number] {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version.trim())
  if (!match) {
    throw new Error(`Not a valid version string: "${version}"`)
  }
  const [, major, minor, patch] = match
  return [Number(major), Number(minor), Number(patch)]
}

/** True if `candidate` is a newer Version than `current` - used to decide
 * whether an Update Check should surface an Update Prompt. Equal versions
 * are not "newer". See CONTEXT.md. */
export function isNewerVersion(current: VersionString, candidate: VersionString): boolean {
  const a = parse(current)
  const b = parse(candidate)

  for (let i = 0; i < 3; i++) {
    if (b[i] > a[i]) return true
    if (b[i] < a[i]) return false
  }
  return false
}
