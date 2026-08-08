import type { StlParseResult, StlParseSuccess } from './stlParser'

function parseError(message: string): { ok: false; error: 'parse-error'; message: string } {
  return { ok: false, error: 'parse-error', message }
}

/** A single `newmtl` block's diffuse color (`Kd r g b`, each 0-1), the only
 * MTL property this preview cares about - no texture maps, specular/
 * ambient terms, or transparency; see CONTEXT.md. */
interface ObjMaterial {
  color: [number, number, number]
}

// Faces before any `usemtl` line, or referencing a material name the MTL
// source didn't define, fall back to this neutral grey rather than failing
// the whole parse - an MTL problem shouldn't block the OBJ from previewing.
const FALLBACK_MATERIAL_COLOR: [number, number, number] = [0.8, 0.8, 0.8]

/** Pulls the filenames off every `mtllib` directive in an OBJ source, so the
 * caller (which owns filesystem access - this module stays pure) can read
 * those sibling files and hand their contents to parseObj. A line can list
 * more than one filename, and there can be more than one `mtllib` line. */
export function extractMtlLibNames(objSource: string): string[] {
  const names: string[] = []
  for (const rawLine of objSource.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!/^mtllib\s/i.test(line)) continue
    names.push(...line.split(/\s+/).slice(1))
  }
  return names
}

/** Parses one MTL source's `newmtl`/`Kd` pairs into a name -> color map.
 * Unknown directives (Ka, Ks, Ns, map_Kd, illum, ...) are ignored - see
 * ObjMaterial. */
function parseMtl(source: string): Map<string, ObjMaterial> {
  const materials = new Map<string, ObjMaterial>()
  let current: string | null = null

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const [keyword, ...rest] = line.split(/\s+/)

    if (keyword === 'newmtl') {
      current = rest.join(' ')
      materials.set(current, { color: [...FALLBACK_MATERIAL_COLOR] })
      continue
    }

    if (keyword === 'Kd' && current) {
      const [r, g, b] = rest.map(Number)
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        materials.get(current)!.color = [r, g, b]
      }
    }
  }

  return materials
}

// A face-vertex token is "v", "v/vt", "v/vt/vn", or "v//vn" - only the
// leading v index matters for geometry (see the module comment on ignoring
// vn: normals are always recomputed from the triangulated mesh, matching
// how the STL parser already treats the whole format as a triangle soup).
function resolveVertexIndex(token: string, vertexCount: number): number | null {
  const raw = token.split('/')[0]
  const n = Number(raw)
  if (!Number.isInteger(n) || n === 0) return null
  // OBJ indices are 1-based; negative indices count back from the most
  // recently declared vertex.
  return n > 0 ? n - 1 : vertexCount + n
}

/** Parses Wavefront OBJ geometry (+ any resolved MTL material colors) into
 * the same triangle-soup shape STL produces (see stlParser.ts) - the shared
 * shape every Renderable-format parser returns, so the viewer doesn't need
 * to know which format it's looking at. Polygonal faces (4+ vertices) are
 * fan-triangulated. `materialSources` is filename -> raw MTL text for every
 * `mtllib` the caller managed to read (see extractMtlLibNames) - a missing
 * or unreadable MTL simply means no colors, not a parse failure. */
export function parseObj(
  bytes: Buffer | Uint8Array,
  materialSources: Map<string, string> = new Map()
): StlParseResult {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
  const text = buffer.toString('utf8')

  const materials = new Map<string, ObjMaterial>()
  for (const source of materialSources.values()) {
    for (const [name, material] of parseMtl(source)) {
      materials.set(name, material)
    }
  }

  const positions: [number, number, number][] = []
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  const vertices: number[] = []
  const colors: number[] = []
  let currentColor: [number, number, number] | null = null
  let sawMaterialColor = false

  function emitVertex(index: number): void {
    const [x, y, z] = positions[index]
    vertices.push(x, y, z)
    if (x < min[0]) min[0] = x
    if (y < min[1]) min[1] = y
    if (z < min[2]) min[2] = z
    if (x > max[0]) max[0] = x
    if (y > max[1]) max[1] = y
    if (z > max[2]) max[2] = z

    const color = currentColor ?? FALLBACK_MATERIAL_COLOR
    colors.push(color[0], color[1], color[2])
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const parts = line.split(/\s+/)
    const keyword = parts[0]

    if (keyword === 'v') {
      const x = Number(parts[1])
      const y = Number(parts[2])
      const z = Number(parts[3])
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        return parseError(`Malformed vertex line in OBJ: "${line}"`)
      }
      positions.push([x, y, z])
      continue
    }

    if (keyword === 'usemtl') {
      const name = parts.slice(1).join(' ')
      const material = materials.get(name)
      currentColor = material?.color ?? null
      if (material) sawMaterialColor = true
      continue
    }

    if (keyword === 'f') {
      const indices = parts.slice(1).map((token) => resolveVertexIndex(token, positions.length))
      if (indices.length < 3 || indices.some((i) => i === null || i < 0 || i >= positions.length)) {
        return parseError(`Face references an invalid vertex in OBJ: "${line}"`)
      }
      const resolved = indices as number[]
      // Fan-triangulate: (0,1,2), (0,2,3), (0,3,4), ...
      for (let i = 1; i < resolved.length - 1; i++) {
        emitVertex(resolved[0])
        emitVertex(resolved[i])
        emitVertex(resolved[i + 1])
      }
      continue
    }

    // vt, vn, o, g, s, mtllib and anything else are irrelevant to geometry
    // (mtllib is pulled out separately, up front, by extractMtlLibNames).
  }

  const triangleCount = vertices.length / 9
  if (triangleCount === 0) {
    return parseError('OBJ has no faces to render.')
  }

  const result: StlParseSuccess = { ok: true, triangleCount, boundingBox: { min, max }, vertices }
  if (sawMaterialColor) {
    result.colors = colors
  }
  return result
}
