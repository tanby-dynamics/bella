import { describe, expect, it } from 'vitest'
import {
  addOrActivateProject,
  findProjectByPath,
  normalizeProjectPath,
  relocateProject,
  reorderProjects,
  type Project
} from './projects'

describe('normalizeProjectPath', () => {
  it('lowercases the path', () => {
    expect(normalizeProjectPath('C:\\Projects\\Robot Arm')).toBe('c:\\projects\\robot arm')
  })

  it('strips a trailing separator', () => {
    expect(normalizeProjectPath('D:\\3D Projects\\')).toBe('d:\\3d projects')
    expect(normalizeProjectPath('/Volumes/External/')).toBe('/volumes/external')
  })
})

describe('findProjectByPath', () => {
  const projects: Project[] = [{ name: 'Robot Arm', path: 'D:\\Projects\\Robot Arm' }]

  it('finds an exact match', () => {
    expect(findProjectByPath(projects, 'D:\\Projects\\Robot Arm')).toBe(projects[0])
  })

  it('finds a match that only differs by case or a trailing separator', () => {
    expect(findProjectByPath(projects, 'd:\\projects\\robot arm\\')).toBe(projects[0])
  })

  it('returns undefined when no project matches', () => {
    expect(findProjectByPath(projects, 'D:\\Projects\\Other')).toBeUndefined()
  })
})

describe('addOrActivateProject', () => {
  it('appends a new project named from the directory basename, and activates it', () => {
    const result = addOrActivateProject([], 'D:\\Projects\\Robot Arm')

    expect(result).toEqual({
      projects: [{ name: 'Robot Arm', path: 'D:\\Projects\\Robot Arm' }],
      activePath: 'D:\\Projects\\Robot Arm',
      added: true
    })
  })

  it('appends after existing projects rather than replacing them', () => {
    const existing: Project[] = [{ name: 'Desktop', path: 'C:\\Desktop' }]

    const result = addOrActivateProject(existing, 'D:\\Projects\\Robot Arm')

    expect(result.projects).toEqual([
      { name: 'Desktop', path: 'C:\\Desktop' },
      { name: 'Robot Arm', path: 'D:\\Projects\\Robot Arm' }
    ])
    expect(result.added).toBe(true)
  })

  it('activates an existing project instead of adding a duplicate', () => {
    const existing: Project[] = [{ name: 'Robot Arm', path: 'D:\\Projects\\Robot Arm' }]

    const result = addOrActivateProject(existing, 'd:\\projects\\robot arm\\')

    expect(result).toEqual({
      projects: existing,
      activePath: 'D:\\Projects\\Robot Arm',
      added: false
    })
  })

  it('does not treat a nested/overlapping directory as a duplicate', () => {
    const existing: Project[] = [{ name: 'Robot Arm', path: 'D:\\Projects\\Robot Arm' }]

    const result = addOrActivateProject(existing, 'D:\\Projects\\Robot Arm\\Subassembly')

    expect(result.added).toBe(true)
    expect(result.projects).toHaveLength(2)
  })
})

describe('reorderProjects', () => {
  const projects: Project[] = [
    { name: 'A', path: 'C:\\A' },
    { name: 'B', path: 'C:\\B' },
    { name: 'C', path: 'C:\\C' }
  ]

  it('reorders projects to match the given path order', () => {
    expect(reorderProjects(projects, ['C:\\C', 'C:\\A', 'C:\\B'])).toEqual([
      { name: 'C', path: 'C:\\C' },
      { name: 'A', path: 'C:\\A' },
      { name: 'B', path: 'C:\\B' }
    ])
  })

  it('appends any project missing from the given order at the end', () => {
    expect(reorderProjects(projects, ['C:\\B'])).toEqual([
      { name: 'B', path: 'C:\\B' },
      { name: 'A', path: 'C:\\A' },
      { name: 'C', path: 'C:\\C' }
    ])
  })
})

describe('relocateProject', () => {
  it('repoints the matching project at the new path, keeping its name and position', () => {
    const projects: Project[] = [
      { name: 'Desktop', path: 'C:\\Desktop' },
      { name: 'Robot Arm', path: 'D:\\Old\\Robot Arm' }
    ]

    expect(relocateProject(projects, 'D:\\Old\\Robot Arm', 'E:\\New\\Robot Arm')).toEqual([
      { name: 'Desktop', path: 'C:\\Desktop' },
      { name: 'Robot Arm', path: 'E:\\New\\Robot Arm' }
    ])
  })

  it('leaves other projects untouched when no path matches', () => {
    const projects: Project[] = [{ name: 'Desktop', path: 'C:\\Desktop' }]

    expect(relocateProject(projects, 'D:\\Missing', 'E:\\New')).toEqual(projects)
  })
})
