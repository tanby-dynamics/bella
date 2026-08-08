export interface Vec3 {
  0: number
  1: number
  2: number
}

export interface StlParseSuccess {
  ok: true
  triangleCount: number
  boundingBox: { min: [number, number, number]; max: [number, number, number] }
  /** Flat [x, y, z, x, y, z, ...] positions, 9 numbers per triangle, in file order. */
  vertices: number[]
}

export interface StlParseFailure {
  ok: false
  error: 'parse-error'
  message: string
}

export type StlParseResult = StlParseSuccess | StlParseFailure

function parseError(message: string): StlParseFailure {
  return { ok: false, error: 'parse-error', message }
}

function looksLikeAsciiStl(buffer: Buffer): boolean {
  // Binary STL files can theoretically have a header that also starts with
  // "solid", so this is only consulted once the binary-length check below
  // has already failed to match.
  return /^\s*solid\b/i.test(buffer.subarray(0, 512).toString('utf8'))
}

const VERTEX_LINE = /^vertex\s+(\S+)\s+(\S+)\s+(\S+)/i

function parseAsciiStl(buffer: Buffer): StlParseResult {
  const lines = buffer.toString('utf8').split(/\r?\n/)

  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  const vertices: number[] = []

  for (const line of lines) {
    const match = VERTEX_LINE.exec(line.trim())
    if (!match) continue

    const x = Number(match[1])
    const y = Number(match[2])
    const z = Number(match[3])
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      return parseError(`Malformed vertex line in ASCII STL: "${line.trim()}"`)
    }

    vertices.push(x, y, z)
    if (x < min[0]) min[0] = x
    if (y < min[1]) min[1] = y
    if (z < min[2]) min[2] = z
    if (x > max[0]) max[0] = x
    if (y > max[1]) max[1] = y
    if (z > max[2]) max[2] = z
  }

  const vertexCount = vertices.length / 3
  if (vertexCount === 0 || vertexCount % 3 !== 0) {
    return parseError(
      `ASCII STL has ${vertexCount} vertex lines, which is not a whole number of triangles.`
    )
  }

  return { ok: true, triangleCount: vertexCount / 3, boundingBox: { min, max }, vertices }
}

export function parseStl(bytes: Buffer | Uint8Array): StlParseResult {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)

  const isBinaryLength = buffer.length >= 84 && 84 + buffer.readUInt32LE(80) * 50 === buffer.length

  if (!isBinaryLength) {
    if (looksLikeAsciiStl(buffer)) {
      return parseAsciiStl(buffer)
    }
    if (buffer.length < 84) {
      return parseError('File is too short to be a binary STL (missing 84-byte header).')
    }
    const triangleCount = buffer.readUInt32LE(80)
    const expectedLength = 84 + triangleCount * 50
    return parseError(
      `Header declares ${triangleCount} triangles but the file is truncated (expected ${expectedLength} bytes, got ${buffer.length}).`
    )
  }

  const triangleCount = buffer.readUInt32LE(80)
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  const vertices: number[] = new Array(triangleCount * 9)

  let offset = 84
  let vi = 0
  for (let t = 0; t < triangleCount; t++) {
    offset += 12 // skip normal
    for (let v = 0; v < 3; v++) {
      const x = buffer.readFloatLE(offset)
      const y = buffer.readFloatLE(offset + 4)
      const z = buffer.readFloatLE(offset + 8)
      offset += 12

      vertices[vi++] = x
      vertices[vi++] = y
      vertices[vi++] = z

      if (x < min[0]) min[0] = x
      if (y < min[1]) min[1] = y
      if (z < min[2]) min[2] = z
      if (x > max[0]) max[0] = x
      if (y > max[1]) max[1] = y
      if (z > max[2]) max[2] = z
    }
    offset += 2 // skip attribute byte count
  }

  return { ok: true, triangleCount, boundingBox: { min, max }, vertices }
}
