import { zipSync, strToU8 } from 'fflate'
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

  it('dispatches 3mf to the 3MF parser', () => {
    const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
          <vertex x="0" y="0" z="0"/>
          <vertex x="1" y="0" z="0"/>
          <vertex x="0" y="1" z="0"/>
        </vertices>
        <triangles>
          <triangle v1="0" v2="1" v3="2"/>
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1"/>
  </build>
</model>`
    const bytes = Buffer.from(zipSync({ '3D/3dmodel.model': strToU8(modelXml) }))

    const result = parseRenderable('3mf', bytes)

    expect(result).toEqual({
      ok: true,
      triangleCount: 1,
      boundingBox: { min: [0, 0, 0], max: [1, 1, 0] },
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0]
    })
  })
})
