export type RenderableFormatId = 'stl' | 'obj' | '3mf' | 'step'
export type ListedFormatId = 'fcstd' | 'scad' | 'mtl'

export type FormatClassification =
  | { kind: 'renderable'; format: RenderableFormatId }
  | { kind: 'listed'; format: ListedFormatId }
  | { kind: 'other' }

const RENDERABLE_EXTENSIONS: Record<string, RenderableFormatId> = {
  stl: 'stl',
  obj: 'obj',
  '3mf': '3mf',
  step: 'step',
  stp: 'step'
}

// MTL is a material sidecar for OBJ, not a mesh format of its own - it never
// gets a 3D preview, so it's Listed rather than Renderable (see objParser.ts,
// which resolves an OBJ's mtllib reference(s) directly from disk rather than
// through this classification). Listed today means "filtered out of the
// tree" the same as an unrecognized file (see CONTEXT.md's "Hidden and
// no-preview entries" decision) - classifying it here rather than leaving it
// `other` just keeps it correctly labeled if that filtering ever changes.
const LISTED_EXTENSIONS: Record<string, ListedFormatId> = {
  fcstd: 'fcstd',
  scad: 'scad',
  mtl: 'mtl'
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase()
}

const LISTED_TYPE_LABELS: Record<ListedFormatId, string> = {
  fcstd: 'FreeCAD File',
  scad: 'OpenSCAD File',
  mtl: 'MTL Material File'
}

const RENDERABLE_TYPE_LABELS: Record<RenderableFormatId, string> = {
  stl: 'STL File',
  obj: 'OBJ File',
  '3mf': '3MF File',
  step: 'STEP File'
}

export function typeLabel(classification: FormatClassification): string {
  if (classification.kind === 'renderable') {
    return RENDERABLE_TYPE_LABELS[classification.format]
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
