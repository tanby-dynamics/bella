import { unzipSync } from 'fflate'
import type { StlParseResult, StlParseSuccess } from './stlParser'

function parseError(message: string): { ok: false; error: 'parse-error'; message: string } {
  return { ok: false, error: 'parse-error', message }
}

/** Reads every `name="value"` pair off a tag's attribute string. 3MF's core
 * elements are always attribute-only self-closing tags (`<vertex .../>`,
 * `<triangle .../>`) or simple wrappers, so a full XML parser is more than
 * this needs - same "hand-rolled, no dependency" choice as objParser.ts. */
function parseAttrs(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /([\w:]+)\s*=\s*"([^"]*)"/g
  let match: RegExpExecArray | null
  while ((match = re.exec(attrString))) {
    attrs[match[1]] = match[2]
  }
  return attrs
}

function parseFloats(csv: string | undefined): number[] {
  if (!csv) return []
  return csv.trim().split(/\s+/).map(Number)
}

type Vec3 = [number, number, number]

/** A resolved RGB color in [0,1], or null when nothing in the file assigns
 * one - the same "format's own color, if any" shape objParser.ts uses. */
type Rgb = Vec3

function parseHexColor(hex: string | undefined): Rgb | null {
  if (!hex) return null
  const match = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex.trim())
  if (!match) return null
  const n = parseInt(match[1], 16)
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255]
}

/** `<basematerials>` resource groups, keyed by their `id` - the only color
 * source this parser understands (see the module doc comment for what's out
 * of scope: colorgroups, textures, per-vertex property indices). Each
 * group's colors are indexed by `pindex`, in `<base>` document order. */
function parseBaseMaterialGroups(xml: string): Map<string, Rgb[]> {
  const groups = new Map<string, Rgb[]>()
  const groupRe = /<basematerials\b([^>]*)>([\s\S]*?)<\/basematerials>/g
  let groupMatch: RegExpExecArray | null
  while ((groupMatch = groupRe.exec(xml))) {
    const id = parseAttrs(groupMatch[1]).id
    if (!id) continue
    const colors: Rgb[] = []
    const baseRe = /<base\b([^>]*)\/>/g
    let baseMatch: RegExpExecArray | null
    while ((baseMatch = baseRe.exec(groupMatch[2]))) {
      colors.push(parseHexColor(parseAttrs(baseMatch[1]).displaycolor) ?? [0.8, 0.8, 0.8])
    }
    groups.set(id, colors)
  }
  return groups
}

interface ThreeMfObject {
  vertices: Vec3[]
  triangles: { indices: [number, number, number]; pid?: string; p1?: string }[]
  /** The object's own `pid`/`pindex`, used by a triangle that doesn't name
   * its own (see the Materials and Properties Extension's inheritance rule). */
  defaultPid?: string
  defaultPIndex?: string
}

/** Every `<object>` that has its own `<mesh>`, keyed by `id`. An `<object>`
 * with only `<components>` (a sub-assembly referencing other objects, no
 * geometry of its own) is intentionally absent from this map - components
 * are a known v1 gap, see the module doc comment. */
function parseObjects(xml: string): Map<string, ThreeMfObject> {
  const objects = new Map<string, ThreeMfObject>()
  const objectRe = /<object\b([^>]*)>([\s\S]*?)<\/object>/g
  let objectMatch: RegExpExecArray | null
  while ((objectMatch = objectRe.exec(xml))) {
    const attrs = parseAttrs(objectMatch[1])
    if (!attrs.id) continue
    const meshMatch = /<mesh>([\s\S]*?)<\/mesh>/.exec(objectMatch[2])
    if (!meshMatch) continue // components-only object - see doc comment

    const vertices: Rgb[] = []
    const vertexRe = /<vertex\b([^>]*)\/>/g
    let vertexMatch: RegExpExecArray | null
    while ((vertexMatch = vertexRe.exec(meshMatch[1]))) {
      const v = parseAttrs(vertexMatch[1])
      vertices.push([Number(v.x), Number(v.y), Number(v.z)])
    }

    const triangles: ThreeMfObject['triangles'] = []
    const triangleRe = /<triangle\b([^>]*)\/>/g
    let triangleMatch: RegExpExecArray | null
    while ((triangleMatch = triangleRe.exec(meshMatch[1]))) {
      const t = parseAttrs(triangleMatch[1])
      triangles.push({
        indices: [Number(t.v1), Number(t.v2), Number(t.v3)],
        pid: t.pid,
        p1: t.p1
      })
    }

    objects.set(attrs.id, {
      vertices,
      triangles,
      defaultPid: attrs.pid,
      defaultPIndex: attrs.pindex
    })
  }
  return objects
}

interface BuildItem {
  objectId: string
  /** 12-number column-major 3x4 matrix (rotation/scale columns + translation
   * - see the 3MF core spec's `transform` attribute), or null for identity. */
  transform: number[] | null
}

function parseBuildItems(xml: string): BuildItem[] {
  const buildMatch = /<build\b[^>]*>([\s\S]*?)<\/build>/.exec(xml)
  if (!buildMatch) return []

  const items: BuildItem[] = []
  const itemRe = /<item\b([^>]*)\/>/g
  let itemMatch: RegExpExecArray | null
  while ((itemMatch = itemRe.exec(buildMatch[1]))) {
    const attrs = parseAttrs(itemMatch[1])
    if (!attrs.objectid) continue
    const transform = attrs.transform ? parseFloats(attrs.transform) : null
    items.push({ objectId: attrs.objectid, transform: transform?.length === 12 ? transform : null })
  }
  return items
}

/** Applies a 3MF `transform` (see BuildItem) to a point. */
function applyTransform(transform: number[], [x, y, z]: Vec3): Vec3 {
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11] = transform
  return [
    x * m0 + y * m3 + z * m6 + m9,
    x * m1 + y * m4 + z * m7 + m10,
    x * m2 + y * m5 + z * m8 + m11
  ]
}

/** Locates the package's root model part. Per the OPC/3MF spec it's
 * whatever `_rels/.rels` points a "3dmodel" relationship at, but every
 * producer in practice writes it to the conventional `3D/3dmodel.model`
 * path - checked first, with the relationship file as a fallback for the
 * rare package that puts it elsewhere. */
function findModelPart(files: Record<string, Uint8Array>): Uint8Array | null {
  const byLowerName = new Map(
    Object.entries(files).map(([name, data]) => [name.toLowerCase(), data])
  )

  const conventional = byLowerName.get('3d/3dmodel.model')
  if (conventional) return conventional

  const rels = byLowerName.get('_rels/.rels')
  if (rels) {
    const relsXml = Buffer.from(rels).toString('utf8')
    const targetMatch =
      /Target="([^"]+)"[^>]*Type="[^"]*3dmodel[^"]*"|Type="[^"]*3dmodel[^"]*"[^>]*Target="([^"]+)"/.exec(
        relsXml
      )
    const target = (targetMatch?.[1] ?? targetMatch?.[2])?.replace(/^\//, '')
    const resolved = target && byLowerName.get(target.toLowerCase())
    if (resolved) return resolved
  }

  const anyModel = Object.entries(files).find(([name]) => name.toLowerCase().endsWith('.model'))
  return anyModel?.[1] ?? null
}

/** Parses a 3MF package (a ZIP archive - see findModelPart) into the same
 * triangle-soup shape STL/OBJ produce (see stlParser.ts). Supports multiple
 * `<object>` mesh resources placed onto the build platform via `<item>`
 * (each with its own transform) and colors from `<basematerials>` resource
 * groups. Deliberately out of scope for v1, same spirit as OBJ's texture
 * gap: `<components>` sub-assemblies (an object made purely of references to
 * other objects, no mesh of its own), the Materials and Properties
 * Extension's texture/colorgroup resources, and multiple models per
 * package. */
export function parseThreeMf(bytes: Buffer | Uint8Array): StlParseResult {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)

  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(buffer)
  } catch {
    return parseError('File is not a valid 3MF (ZIP) archive.')
  }

  const modelPart = findModelPart(files)
  if (!modelPart) {
    return parseError('3MF archive is missing its 3D model part (3D/3dmodel.model).')
  }

  const xml = Buffer.from(modelPart).toString('utf8')
  const materialGroups = parseBaseMaterialGroups(xml)
  const objects = parseObjects(xml)
  const items = parseBuildItems(xml)

  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  const vertices: number[] = []
  const colors: number[] = []
  let sawMaterialColor = false

  function resolveColor(
    object: ThreeMfObject,
    triangle: ThreeMfObject['triangles'][number]
  ): Rgb | null {
    const pid = triangle.pid ?? object.defaultPid
    const pIndex = triangle.p1 ?? object.defaultPIndex
    if (pid === undefined || pIndex === undefined) return null
    return materialGroups.get(pid)?.[Number(pIndex)] ?? null
  }

  function emit(position: Vec3, color: Rgb | null): void {
    const [x, y, z] = position
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
    const resolved = color ?? [0.8, 0.8, 0.8]
    colors.push(resolved[0], resolved[1], resolved[2])
  }

  try {
    for (const item of items) {
      const object = objects.get(item.objectId)
      if (!object) continue // unresolved/components-only reference - see doc comment

      for (const triangle of object.triangles) {
        const color = resolveColor(object, triangle)
        if (color) sawMaterialColor = true
        for (const index of triangle.indices) {
          const position = object.vertices[index]
          if (!position) {
            return parseError(
              `Triangle references an out-of-range vertex ${index} in the 3MF model.`
            )
          }
          emit(item.transform ? applyTransform(item.transform, position) : position, color)
        }
      }
    }
  } catch (error) {
    return parseError(
      `Malformed vertex in 3MF model: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  const triangleCount = vertices.length / 9
  if (triangleCount === 0) {
    return parseError(
      '3MF has no renderable geometry (empty build platform, or every object uses unsupported component assemblies).'
    )
  }

  const result: StlParseSuccess = { ok: true, triangleCount, boundingBox: { min, max }, vertices }
  if (sawMaterialColor) {
    result.colors = colors
  }
  return result
}
