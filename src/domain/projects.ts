export interface Project {
  name: string
  path: string
}

/** A Project's own remembered browsing state - keyed by that Project's
 * exact `path` in StoreData.projectState (see store.ts). Restored whenever
 * the Project becomes active (at startup, or by switching to it), and
 * updated immediately as the user browses, not just at a checkpoint like
 * switching away or quitting. See ADR 0005 / CONTEXT.md. */
export interface ProjectState {
  /** The file last selected inside this Project, if any - drives the
   * preview to auto-resume on reactivation. Cleared silently (see the
   * renderer's activateProject) if the file no longer exists on disk. */
  selectedFilePath: string | null
  /** Every folder path currently expanded in this Project's tree, restored
   * node-by-node as each mounts rather than eagerly all at once. Also
   * doubles as the reveal target's ancestor chain - see RevealRequest in
   * LocationTree.tsx - so scrolling to the restored `selectedFilePath`
   * lands correctly. */
  expandedPaths: string[]
}

export const DEFAULT_PROJECT_STATE: ProjectState = {
  selectedFilePath: null,
  expandedPaths: []
}

/** Opens a native "choose a folder" dialog - the only way a Project gets
 * created (see ADR 0005; there's no equivalent of the old per-folder "Make
 * favorite" tree action). Returns null if the user cancels. */
export interface DirectoryPicker {
  pickDirectory(): Promise<string | null>
}

function basenameFromPath(path: string): string {
  // "C:\\Projects\\Robot Arm" -> "Robot Arm", "/Volumes/External/Parts" -> "Parts"
  const trimmed = path.replace(/[\\/]+$/, '')
  const segments = trimmed.split(/[\\/]/)
  return segments[segments.length - 1] || trimmed
}

/** Case-folds and strips trailing separators so two spellings of the same
 * directory (different drive-letter casing, a trailing slash) compare
 * equal - matches OS path semantics on Windows/macOS, where the
 * filesystem itself is case-insensitive. Comparison-only: a Project's own
 * `path` is always stored exactly as the picker returned it. */
export function normalizeProjectPath(path: string): string {
  return path.replace(/[\\/]+$/, '').toLowerCase()
}

export function findProjectByPath(projects: Project[], path: string): Project | undefined {
  const normalized = normalizeProjectPath(path)
  return projects.find((project) => normalizeProjectPath(project.path) === normalized)
}

/** Decides what "Add Project" does with a freshly-picked directory: if
 * it's already a Project (compared via findProjectByPath), just activates
 * that existing entry rather than adding a duplicate; otherwise appends a
 * new Project - named from the directory's own basename - to the end of
 * the list and activates that one. Nested/overlapping Project directories
 * are never rejected here - only an exact (normalized) path match counts
 * as a duplicate. See ADR 0005.
 *
 * Pure decision logic only - the caller (main's IPC handler) owns actually
 * showing the picker and persisting the result. */
export function addOrActivateProject(
  projects: Project[],
  pickedPath: string
): { projects: Project[]; activePath: string; added: boolean } {
  const existing = findProjectByPath(projects, pickedPath)
  if (existing) {
    return { projects, activePath: existing.path, added: false }
  }

  const project: Project = { name: basenameFromPath(pickedPath), path: pickedPath }
  return { projects: [...projects, project], activePath: project.path, added: true }
}

/** Reorders `projects` to match `orderedPaths` (a drag-and-drop reorder in
 * the PROJECTS list). Any project missing from `orderedPaths` - shouldn't
 * happen in practice - is appended at the end, preserving its relative
 * order, rather than silently dropped. */
export function reorderProjects(projects: Project[], orderedPaths: string[]): Project[] {
  const byPath = new Map(projects.map((project) => [project.path, project]))
  const reordered = orderedPaths
    .map((path) => byPath.get(path))
    .filter((project): project is Project => project !== undefined)
  const placed = new Set(reordered.map((project) => project.path))
  const missing = projects.filter((project) => !placed.has(project.path))
  return [...reordered, ...missing]
}

/** Repoints a Project at a newly-chosen directory (the "Relocate" action -
 * see CONTEXT.md) - keeps its name and position in the list, since the
 * user is fixing up where an existing Project lives, not creating a new
 * one. The caller is responsible for discarding that Project's old
 * per-project state (see store.ts's relocateProject), which belonged to
 * the old directory's contents. */
export function relocateProject(projects: Project[], path: string, newPath: string): Project[] {
  return projects.map((project) =>
    project.path === path ? { ...project, path: newPath } : project
  )
}
