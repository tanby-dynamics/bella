import { describe, expect, it } from 'vitest'
import { classifyFormat, typeLabel } from './formats'

describe('classifyFormat', () => {
  it('classifies .stl as a renderable format', () => {
    expect(classifyFormat('base_plate.stl')).toEqual({ kind: 'renderable', format: 'stl' })
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
