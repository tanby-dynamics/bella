import { describe, expect, it } from 'vitest'
import { extractMtlLibNames, parseObj } from './objParser'

describe('extractMtlLibNames', () => {
  it('extracts a single mtllib filename', () => {
    const source = ['mtllib scene.mtl', 'o cube', 'v 0 0 0'].join('\n')
    expect(extractMtlLibNames(source)).toEqual(['scene.mtl'])
  })

  it('extracts multiple filenames off one line and across multiple lines', () => {
    const source = ['mtllib a.mtl b.mtl', 'v 0 0 0', 'mtllib c.mtl'].join('\n')
    expect(extractMtlLibNames(source)).toEqual(['a.mtl', 'b.mtl', 'c.mtl'])
  })

  it('returns an empty array when there is no mtllib directive', () => {
    expect(extractMtlLibNames('v 0 0 0\nf 1 1 1')).toEqual([])
  })
})

describe('parseObj', () => {
  it('parses a triangle face into a triangle count and bounding box', () => {
    const source = ['v 0 0 0', 'v 1 0 0', 'v 0 1 0', 'f 1 2 3', ''].join('\n')

    const result = parseObj(Buffer.from(source, 'utf8'))

    expect(result).toEqual({
      ok: true,
      triangleCount: 1,
      boundingBox: { min: [0, 0, 0], max: [1, 1, 0] },
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0]
    })
  })

  it('fan-triangulates a quad face', () => {
    const source = ['v 0 0 0', 'v 1 0 0', 'v 1 1 0', 'v 0 1 0', 'f 1 2 3 4', ''].join('\n')

    const result = parseObj(Buffer.from(source, 'utf8'))

    expect(result.ok).toBe(true)
    expect(result).toMatchObject({
      triangleCount: 2,
      vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0]
    })
  })

  it('resolves negative (relative) face indices', () => {
    const source = ['v 0 0 0', 'v 1 0 0', 'v 0 1 0', 'f -3 -2 -1', ''].join('\n')

    const result = parseObj(Buffer.from(source, 'utf8'))

    expect(result).toMatchObject({
      ok: true,
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0]
    })
  })

  it('ignores vt/vn indices in v/vt/vn-style face tokens', () => {
    const source = [
      'v 0 0 0',
      'v 1 0 0',
      'v 0 1 0',
      'vt 0 0',
      'vn 0 0 1',
      'f 1/1/1 2/2/1 3/3/1',
      ''
    ].join('\n')

    const result = parseObj(Buffer.from(source, 'utf8'))

    expect(result).toMatchObject({
      ok: true,
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0]
    })
  })

  it('has no colors field when no mtllib/usemtl is present', () => {
    const source = ['v 0 0 0', 'v 1 0 0', 'v 0 1 0', 'f 1 2 3', ''].join('\n')

    const result = parseObj(Buffer.from(source, 'utf8'))

    expect(result.ok).toBe(true)
    expect((result as { colors?: number[] }).colors).toBeUndefined()
  })

  it('applies the current usemtl material color from a resolved MTL to face vertices', () => {
    const mtl = ['newmtl red', 'Kd 1 0 0', 'newmtl blue', 'Kd 0 0 1', ''].join('\n')
    const obj = [
      'mtllib scene.mtl',
      'v 0 0 0',
      'v 1 0 0',
      'v 0 1 0',
      'v 1 1 1',
      'v 2 1 1',
      'v 1 2 1',
      'usemtl red',
      'f 1 2 3',
      'usemtl blue',
      'f 4 5 6',
      ''
    ].join('\n')

    const result = parseObj(Buffer.from(obj, 'utf8'), new Map([['scene.mtl', mtl]]))

    expect(result.ok).toBe(true)
    expect((result as { colors?: number[] }).colors).toEqual([
      1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1
    ])
  })

  it('falls back to a neutral color for faces before any usemtl or with an unresolved material', () => {
    const mtl = ['newmtl red', 'Kd 1 0 0', ''].join('\n')
    const obj = [
      'mtllib scene.mtl',
      'v 0 0 0',
      'v 1 0 0',
      'v 0 1 0',
      'f 1 2 3',
      'usemtl missing',
      'v 1 1 1',
      'v 2 1 1',
      'v 1 2 1',
      'f 4 5 6',
      ''
    ].join('\n')

    const result = parseObj(Buffer.from(obj, 'utf8'), new Map([['scene.mtl', mtl]]))

    expect(result.ok).toBe(true)
    expect((result as { colors?: number[] }).colors).toBeUndefined()
  })

  it('returns a parse error for a face referencing an out-of-range vertex', () => {
    const source = ['v 0 0 0', 'v 1 0 0', 'v 0 1 0', 'f 1 2 9', ''].join('\n')

    const result = parseObj(Buffer.from(source, 'utf8'))

    expect(result).toEqual({ ok: false, error: 'parse-error', message: expect.any(String) })
  })

  it('returns a parse error for a file with no faces', () => {
    const source = ['v 0 0 0', 'v 1 0 0', 'v 0 1 0', ''].join('\n')

    const result = parseObj(Buffer.from(source, 'utf8'))

    expect(result).toEqual({ ok: false, error: 'parse-error', message: expect.any(String) })
  })
})
