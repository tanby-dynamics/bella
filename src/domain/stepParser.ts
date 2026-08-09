import occtimportjs, { type OcctMesh, type OcctReadResult } from 'occt-import-js'
import type { StlParseResult, StlParseSuccess } from './stlParser'

function parseError(message: string): { ok: false; error: 'parse-error'; message: string } {
  return { ok: false, error: 'parse-error', message }
}

// A mesh with no color of its own renders in this neutral grey - the same
// fallback OBJ/3MF use for a face/triangle without a resolved material
// color (see objParser.ts / threeMfParser.ts).
const FALLBACK_COLOR: [number, number, number] = [0.8, 0.8, 0.8]

/** The occt-import-js WASM module is expensive to instantiate (a multi-MB
 * binary) and carries no per-call state, so it's loaded once per process
 * and reused for every STEP parse rather than on every call. This lives in
 * the domain layer rather than behind an injected adapter (contrast
 * `resolveMtlSources` in main/index.ts, which needs fs access the domain
 * layer deliberately stays free of) because occt-import-js resolves its own
 * WASM asset internally - see occt-import-js.d.ts - so there's no
 * filesystem seam for a caller to own. */
let occtModule: ReturnType<typeof occtimportjs> | null = null
function loadOcct(): ReturnType<typeof occtimportjs> {
  if (!occtModule) {
    occtModule = occtimportjs()
  }
  return occtModule
}

/** Expands one occt-import-js mesh's indexed position buffer into this
 * app's flat triangle-soup layout (see StlParseSuccess.vertices) - the
 * shared shape every Renderable-format parser produces, so the viewer
 * doesn't need to know which format it's looking at. Only the mesh's own
 * whole-shape `color`, if any, is read - not per-`brep_faces` colors (a
 * STEP shape can carry a different color per face/sub-shape); that's a
 * known v1 gap, same treatment as OBJ's textures and 3MF's component
 * assemblies (see CONTEXT.md). */
function appendMesh(
  mesh: OcctMesh,
  vertices: number[],
  colors: number[],
  min: [number, number, number],
  max: [number, number, number]
): void {
  const position = mesh.attributes.position.array
  const color = mesh.color ?? FALLBACK_COLOR

  for (const vertexIndex of mesh.index.array) {
    const offset = vertexIndex * 3
    const x = position[offset]
    const y = position[offset + 1]
    const z = position[offset + 2]
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      throw new Error(`Non-finite vertex position (${x}, ${y}, ${z})`)
    }

    vertices.push(x, y, z)
    if (x < min[0]) min[0] = x
    if (y < min[1]) min[1] = y
    if (z < min[2]) min[2] = z
    if (x > max[0]) max[0] = x
    if (y > max[1]) max[1] = y
    if (z > max[2]) max[2] = z

    colors.push(color[0], color[1], color[2])
  }
}

/** Parses a STEP file via occt-import-js (see occt-import-js.d.ts),
 * tessellating OCCT's b-rep shapes into the same triangle-soup shape
 * STL/OBJ/3MF produce (see stlParser.ts). Every mesh occt-import-js returns
 * (one per named sub-shape/part in the STEP assembly) is combined into one
 * flat preview - same "whole file is the preview" rule 3MF's build platform
 * uses - since Bella has no assembly/tree UI to browse sub-shapes
 * individually. Deflection/tessellation quality is left at occt-import-js's
 * defaults (millimeter linear unit, bounding-box-ratio deflection) - no
 * Settings surface for it in v1, same as every other format's parser having
 * no user-configurable options. */
export async function parseStep(bytes: Buffer | Uint8Array): Promise<StlParseResult> {
  const occt = await loadOcct()

  const content = Buffer.isBuffer(bytes) ? new Uint8Array(bytes) : bytes

  let result: OcctReadResult
  try {
    result = occt.ReadStepFile(content, null)
  } catch (error) {
    return parseError(
      `occt-import-js failed to read STEP file: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  if (!result.success) {
    return parseError('STEP file could not be read (occt-import-js reported failure).')
  }

  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  const vertices: number[] = []
  const colors: number[] = []
  let sawMeshColor = false

  try {
    for (const mesh of result.meshes) {
      if (mesh.color) sawMeshColor = true
      appendMesh(mesh, vertices, colors, min, max)
    }
  } catch (error) {
    return parseError(
      `Malformed mesh data in STEP file: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  const triangleCount = vertices.length / 9
  if (triangleCount === 0) {
    return parseError('STEP file has no renderable geometry (empty or unsupported assembly).')
  }

  const parsed: StlParseSuccess = { ok: true, triangleCount, boundingBox: { min, max }, vertices }
  if (sawMeshColor) {
    parsed.colors = colors
  }
  return parsed
}
