import { describe, expect, it } from 'vitest'
import { classifyFormat, typeLabel } from './formats'

describe('classifyFormat', () => {
  it('classifies .stl as a renderable format', () => {
    expect(classifyFormat('base_plate.stl')).toEqual({ kind: 'renderable', format: 'stl' })
  })

  it('classifies .obj as a renderable format', () => {
    expect(classifyFormat('base_plate.obj')).toEqual({ kind: 'renderable', format: 'obj' })
  })

  it('classifies .mtl as a listed format (a material sidecar, not a mesh of its own)', () => {
    expect(classifyFormat('base_plate.mtl')).toEqual({ kind: 'listed', format: 'mtl' })
  })

  it('classifies .step as a listed (recognized but unsupported) format', () => {
    expect(classifyFormat('gripper_v3.step')).toEqual({ kind: 'listed', format: 'step' })
  })

  it('classifies .FCStd as a listed format, case-insensitively', () => {
    expect(classifyFormat('forearm_link.FCStd')).toEqual({ kind: 'listed', format: 'fcstd' })
  })

  it('classifies .scad as a listed format', () => {
    expect(classifyFormat('shoulder_joint.scad')).toEqual({ kind: 'listed', format: 'scad' })
  })

  it('classifies an unrecognized extension as other', () => {
    expect(classifyFormat('notes.txt')).toEqual({ kind: 'other' })
  })

  it('classifies a file with no extension as other', () => {
    expect(classifyFormat('README')).toEqual({ kind: 'other' })
  })
})

describe('typeLabel', () => {
  it('describes a renderable STL as "STL File"', () => {
    expect(typeLabel({ kind: 'renderable', format: 'stl' })).toBe('STL File')
  })

  it('describes a renderable OBJ as "OBJ File"', () => {
    expect(typeLabel({ kind: 'renderable', format: 'obj' })).toBe('OBJ File')
  })

  it('describes a listed MTL as "MTL Material File"', () => {
    expect(typeLabel({ kind: 'listed', format: 'mtl' })).toBe('MTL Material File')
  })

  it('describes a listed STEP as "STEP File"', () => {
    expect(typeLabel({ kind: 'listed', format: 'step' })).toBe('STEP File')
  })

  it('describes a listed FCStd as "FreeCAD File"', () => {
    expect(typeLabel({ kind: 'listed', format: 'fcstd' })).toBe('FreeCAD File')
  })

  it('describes a listed SCAD as "OpenSCAD File"', () => {
    expect(typeLabel({ kind: 'listed', format: 'scad' })).toBe('OpenSCAD File')
  })

  it('describes an unclassified file as the generic "File"', () => {
    expect(typeLabel({ kind: 'other' })).toBe('File')
  })
})
