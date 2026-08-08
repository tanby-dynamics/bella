import { zipSync, strToU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { parseThreeMf } from './threeMfParser'

function build3mf(modelXml: string): Buffer {
  const zipped = zipSync({ '3D/3dmodel.model': strToU8(modelXml) })
  return Buffer.from(zipped)
}

const TRIANGLE_MODEL = `<?xml version="1.0" encoding="UTF-8"?>
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

describe('parseThreeMf', () => {
  it('parses a single object/item into a triangle count and bounding box', () => {
    const result = parseThreeMf(build3mf(TRIANGLE_MODEL))

    expect(result).toEqual({
      ok: true,
      triangleCount: 1,
      boundingBox: { min: [0, 0, 0], max: [1, 1, 0] },
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0]
    })
  })

  it('applies a build item transform to its object instance', () => {
    // Translates by (10, 20, 30) - see the module's transform layout.
    const transform = '1 0 0 0 1 0 0 0 1 10 20 30'
    const modelXml = TRIANGLE_MODEL.replace(
      '<item objectid="1"/>',
      `<item objectid="1" transform="${transform}"/>`
    )

    const result = parseThreeMf(build3mf(modelXml))

    expect(result).toMatchObject({
      ok: true,
      boundingBox: { min: [10, 20, 30], max: [11, 21, 30] },
      vertices: [10, 20, 30, 11, 20, 30, 10, 21, 30]
    })
  })

  it('places two build items of the same object at different transforms', () => {
    const modelXml = TRIANGLE_MODEL.replace(
      '<item objectid="1"/>',
      '<item objectid="1"/><item objectid="1" transform="1 0 0 0 1 0 0 0 1 5 0 0"/>'
    )

    const result = parseThreeMf(build3mf(modelXml))

    expect(result.ok).toBe(true)
    expect((result as { triangleCount: number }).triangleCount).toBe(2)
    expect((result as { boundingBox: { max: number[] } }).boundingBox.max).toEqual([6, 1, 0])
  })

  it('resolves triangle color from a basematerials group via object-level pid/pindex', () => {
    const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <basematerials id="2">
      <base name="Red" displaycolor="#FF0000FF"/>
      <base name="Blue" displaycolor="#0000FFFF"/>
    </basematerials>
    <object id="1" type="model" pid="2" pindex="1">
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

    const result = parseThreeMf(build3mf(modelXml))

    expect(result.ok).toBe(true)
    expect((result as { colors?: number[] }).colors).toEqual([0, 0, 1, 0, 0, 1, 0, 0, 1])
  })

  it('lets a triangle override its object default color via its own pid/p1', () => {
    const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <basematerials id="2">
      <base name="Red" displaycolor="#FF0000"/>
      <base name="Blue" displaycolor="#0000FF"/>
    </basematerials>
    <object id="1" type="model" pid="2" pindex="0">
      <mesh>
        <vertices>
          <vertex x="0" y="0" z="0"/>
          <vertex x="1" y="0" z="0"/>
          <vertex x="0" y="1" z="0"/>
          <vertex x="1" y="1" z="1"/>
        </vertices>
        <triangles>
          <triangle v1="0" v2="1" v3="2"/>
          <triangle v1="1" v2="2" v3="3" p1="1"/>
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1"/>
  </build>
</model>`

    const result = parseThreeMf(build3mf(modelXml))

    expect(result.ok).toBe(true)
    expect((result as { colors?: number[] }).colors).toEqual([
      1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1
    ])
  })

  it('has no colors field when there is no basematerials/pid at all', () => {
    const result = parseThreeMf(build3mf(TRIANGLE_MODEL))

    expect(result.ok).toBe(true)
    expect((result as { colors?: number[] }).colors).toBeUndefined()
  })

  it('skips a components-only object (no mesh of its own) rather than failing', () => {
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
    <object id="2" type="model">
      <components>
        <component objectid="1"/>
      </components>
    </object>
  </resources>
  <build>
    <item objectid="1"/>
    <item objectid="2"/>
  </build>
</model>`

    const result = parseThreeMf(build3mf(modelXml))

    // Object 2 contributes nothing (its components aren't followed - see the
    // module doc comment) but object 1's own item still renders.
    expect(result).toMatchObject({ ok: true, triangleCount: 1 })
  })

  it('returns a parse error for a non-zip file', () => {
    const result = parseThreeMf(Buffer.from('not a zip', 'utf8'))
    expect(result).toEqual({ ok: false, error: 'parse-error', message: expect.any(String) })
  })

  it('returns a parse error for a zip with no 3D model part', () => {
    const zipped = zipSync({ 'readme.txt': strToU8('hello') })
    const result = parseThreeMf(Buffer.from(zipped))
    expect(result).toEqual({ ok: false, error: 'parse-error', message: expect.any(String) })
  })

  it('returns a parse error when the build platform has no renderable geometry', () => {
    const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources></resources>
  <build></build>
</model>`

    const result = parseThreeMf(build3mf(modelXml))
    expect(result).toEqual({ ok: false, error: 'parse-error', message: expect.any(String) })
  })

  it('returns a parse error for a triangle referencing an out-of-range vertex', () => {
    const modelXml = TRIANGLE_MODEL.replace('v3="2"', 'v3="9"')
    const result = parseThreeMf(build3mf(modelXml))
    expect(result).toEqual({ ok: false, error: 'parse-error', message: expect.any(String) })
  })
})
