import { describe, expect, it } from 'vitest'
import { parseRenderable } from './parseRenderable'

describe('parseRenderable', () => {
  it('dispatches stl to the STL parser', () => {
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

    const result = parseRenderable('stl', Buffer.from(text, 'utf8'))

    expect(result).toEqual({
      ok: true,
      triangleCount: 1,
      boundingBox: { min: [0, 0, 0], max: [1, 1, 0] },
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0]
    })
  })

  it('dispatches obj to the OBJ parser, passing through resolved MTL sources', () => {
    const mtl = ['newmtl red', 'Kd 1 0 0', ''].join('\n')
    const obj = ['v 0 0 0', 'v 1 0 0', 'v 0 1 0', 'usemtl red', 'f 1 2 3', ''].join('\n')

    const result = parseRenderable('obj', Buffer.from(obj, 'utf8'), {
      materialSources: new Map([['scene.mtl', mtl]])
    })

    expect(result).toEqual({
      ok: true,
      triangleCount: 1,
      boundingBox: { min: [0, 0, 0], max: [1, 1, 0] },
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      colors: [1, 0, 0, 1, 0, 0, 1, 0, 0]
    })
  })
})
