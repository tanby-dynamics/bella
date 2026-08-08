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

const LISTED_TYPE_LABELS: Record<ListedFormatId, string> = {
  step: 'STEP File',
  fcstd: 'FreeCAD File',
  scad: 'OpenSCAD File'
}

export function typeLabel(classification: FormatClassification): string {
  if (classification.kind === 'renderable') {
    return 'STL File'
  }

  if (classification.kind === 'listed') {
    return LISTED_TYPE_LABELS[classification.format]
  }

  return 'File'
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
