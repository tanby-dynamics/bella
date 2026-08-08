import { describe, expect, it } from 'vitest'
import { parseStl } from './stlParser'

type Vec3 = [number, number, number]
type Triangle = [Vec3, Vec3, Vec3]

/** Encodes triangles as a binary STL buffer, per the binary STL spec. Deliberately
 * independent of the parser under test: this is an encoder, the parser is a decoder. */
function encodeBinaryStl(triangles: Triangle[]): Buffer {
  const buffer = Buffer.alloc(80 + 4 + triangles.length * 50)
  buffer.writeUInt32LE(triangles.length, 80)

  let offset = 84
  for (const [a, b, c] of triangles) {
    // normal (unused by the parser, written as zero)
    buffer.writeFloatLE(0, offset)
    buffer.writeFloatLE(0, offset + 4)
    buffer.writeFloatLE(0, offset + 8)
    offset += 12

    for (const vertex of [a, b, c]) {
      buffer.writeFloatLE(vertex[0], offset)
      buffer.writeFloatLE(vertex[1], offset + 4)
      buffer.writeFloatLE(vertex[2], offset + 8)
      offset += 12
    }

    buffer.writeUInt16LE(0, offset) // attribute byte count
    offset += 2
  }

  return buffer
}

describe('parseStl (binary)', () => {
  it('parses a single triangle into a triangle count and bounding box', () => {
    const bytes = encodeBinaryStl([
      [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0]
      ]
    ])

    const result = parseStl(bytes)

    expect(result).toEqual({
      ok: true,
      triangleCount: 1,
      boundingBox: { min: [0, 0, 0], max: [1, 1, 0] },
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0]
    })
  })

  it('computes a bounding box across multiple triangles', () => {
    const bytes = encodeBinaryStl([
      [
        [0, 0, 0],
        [2, 0, 0],
        [0, 3, 0]
      ],
      [
        [-1, 0, 0],
        [0, 0, 5],
        [0, 0, 0]
      ]
    ])

    const result = parseStl(bytes)

    expect(result).toMatchObject({
      ok: true,
      triangleCount: 2,
      boundingBox: { min: [-1, 0, 0], max: [2, 3, 5] }
    })
  })

  it('includes flat vertex positions in triangle order, for the 3D viewer to render', () => {
    const bytes = encodeBinaryStl([
      [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0]
      ],
      [
        [1, 1, 1],
        [2, 1, 1],
        [1, 2, 1]
      ]
    ])

    const result = parseStl(bytes)

    expect(result.ok).toBe(true)
    expect(result).toMatchObject({
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 2, 1, 1, 1, 2, 1]
    })
  })

  it('returns a distinct parse-error result for a truncated file', () => {
    // Header declares 5 triangles but the buffer only has room for 1 -
    // a truncated/corrupted export.
    const bytes = encodeBinaryStl([
      [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0]
      ]
    ])
    bytes.writeUInt32LE(5, 80)

    const result = parseStl(bytes)

    expect(result).toEqual({
      ok: false,
      error: 'parse-error',
      message: expect.any(String)
    })
  })
})

describe('parseStl (ascii)', () => {
  it('parses an ASCII STL triangle into a triangle count and bounding box', () => {
    const text = [
      'solid cube',
      '  facet normal 0 0 0',
      '    outer loop',
      '      vertex 0 0 0',
      '      vertex 1 0 0',
      '      vertex 0 1 0',
      '    endloop',
      '  endfacet',
      'endsolid cube',
      ''
    ].join('\n')

    const result = parseStl(Buffer.from(text, 'utf8'))

    expect(result).toEqual({
      ok: true,
      triangleCount: 1,
      boundingBox: { min: [0, 0, 0], max: [1, 1, 0] },
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0]
    })
  })
})
