export type RenderableFormatId = 'stl'
export type ListedFormatId = 'step' | 'fcstd' | 'scad'

export type FormatClassification =
  | { kind: 'renderable'; format: RenderableFormatId }
  | { kind: 'listed'; format: ListedFormatId }
  | { kind: 'other' }

const RENDERABLE_EXTENSIONS: Record<string, RenderableFormatId> = {
  stl: 'stl'
}

const LISTED_EXTENSIONS: Record<string, ListedFormatId> = {
  step: 'step',
  fcstd: 'fcstd',
  scad: 'scad'
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase()
}

export function classifyFormat(fileName: string): FormatClassification {
  const ext = extensionOf(fileName)

  const renderable = RENDERABLE_EXTENSIONS[ext]
  if (renderable) {
    return { kind: 'renderable', format: renderable }
  }

  const listed = LISTED_EXTENSIONS[ext]
  if (listed) {
    return { kind: 'listed', format: listed }
  }

  return { kind: 'other' }
}
