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
    acc = acc ? `${acc}${sep}${part}` : `${sep}${part}`
    segments.push({ label: part, path: acc })
  })

  return segments
}

export function fileNameFromPath(path: string): string {
  const sep = detectSeparator(path)
  const parts = path.split(sep).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

export function joinPath(folderPath: string, name: string): string {
  const sep = detectSeparator(folderPath)
  return folderPath.endsWith(sep) ? `${folderPath}${name}` : `${folderPath}${sep}${name}`
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
