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
})
