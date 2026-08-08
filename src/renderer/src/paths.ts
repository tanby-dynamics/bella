export interface BreadcrumbSegment {
  label: string
  path: string
}

function detectSeparator(path: string): '\\' | '/' {
  return path.includes('\\') ? '\\' : '/'
}

/** Splits a folder path into clickable breadcrumb segments, each carrying
 * the full path up to that point. Display-only logic - not part of the
 * domain layer seam. */
export function breadcrumbSegments(path: string): BreadcrumbSegment[] {
  const sep = detectSeparator(path)
  const parts = path.split(sep).filter(Boolean)
  const segments: BreadcrumbSegment[] = []
  let acc = ''

  parts.forEach((part, index) => {
    if (index === 0 && sep === '\\' && /^[A-Za-z]:$/.test(part)) {
      acc = `${part}${sep}`
      segments.push({ label: part, path: acc })
      return
    }
    // The drive-root branch above already leaves `acc` ending in `sep`
    // (`C:\`) - joining the next part with another `sep` would double it
    // up (`C:\\development`). Append bare in that case; otherwise join
    // normally, or - for a bare Unix root - prepend the leading `sep`.
    acc = acc.endsWith(sep) ? `${acc}${part}` : acc ? `${acc}${sep}${part}` : `${sep}${part}`
    segments.push({ label: part, path: acc })
  })

  return segments
}

/** True if `path` is at or below `ancestor` in the filesystem tree - used
 * to decide which Locations-tree nodes lie on the path to the folder Bella
 * opened at startup, so they can auto-expand. Separator-aware (mixed
 * `\`/`/` never happens within one path, but ancestor/path always share
 * one), and requires a full path-segment match so "/Projects" doesn't
 * false-positive against "/ProjectsOther". */
export function isAncestorPath(ancestor: string, path: string): boolean {
  if (ancestor === path) return true
  const sep = detectSeparator(path)
  const normalizedAncestor = ancestor.endsWith(sep) ? ancestor : `${ancestor}${sep}`
  return path.startsWith(normalizedAncestor)
}

export function fileNameFromPath(path: string): string {
  const sep = detectSeparator(path)
  const parts = path.split(sep).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}
