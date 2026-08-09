import { useEffect, useRef, useState } from 'react'
import type { FileEntry, Project } from '../types'
import { ChevronIcon, TreeChildren, type Highlighted, type RevealRequest } from './LocationTree'
import { useExpandableFolder } from '../useExpandableFolder'
import { ContextMenu } from './ContextMenu'

const MIN_SIDEBAR_WIDTH = 180
const MAX_SIDEBAR_WIDTH = 560
const NO_EXPANDED_PATHS = new Set<string>()

/** A one-shot request to open a Project's row in inline rename mode -
 * fired once after a genuinely new Project is added (see CONTEXT.md: "When
 * a project is created the project name in the list should be editable"),
 * never for activating an existing one. `nonce` follows the same pattern
 * as RevealRequest, in case the same path is ever added, removed, and
 * re-added in a row. */
export interface RenameRequest {
  path: string
  nonce: number
}

interface SidebarProps {
  projects: Project[]
  /** The Active Project's path, if any - see CONTEXT.md. */
  activeProjectPath: string | null
  /** Projects whose directory couldn't be found the last time they were
   * activated - see CONTEXT.md's "missing directory" decision. Only ever
   * populated for the Active Project, since that's the only one whose tree
   * actually gets loaded. */
  missingProjectPaths: Set<string>
  /** The single row highlighted across the whole tree (file or folder) -
   * see Highlighted. */
  highlighted: Highlighted | null
  /** The Active Project's own persisted expand-state - see
   * LocationTreeNode. */
  expandedPaths: Set<string>
  /** Set on Project activation, and when restoring a Project's persisted
   * selected file - see RevealRequest. */
  revealRequest: RevealRequest | null
  /** Set once, right after a brand-new Project is added - see
   * RenameRequest. */
  renameRequest: RenameRequest | null
  onSelectProject: (project: Project) => void
  onAddProject: () => void
  onRemoveProject: (path: string) => void
  onRenameProject: (path: string, name: string) => void
  onRelocateProject: (path: string) => void
  onReorderProjects: (orderedPaths: string[]) => void
  onSelectFolder: (path: string) => void
  onSelectFile: (entry: FileEntry) => void
  onToggleExpand: (path: string, expanded: boolean) => void
  /** Fired if the Active Project's own root folder-listing fails - see
   * LocationTreeNode. */
  onLoadError: (path: string) => void
  /** Persisted panel width in px, and the setter to commit a resize once
   * the drag ends - see ADR 0004 (the sole survivor of the old
   * resizable-columns persistence, now that files live in the tree). */
  width: number
  onWidthChange: (width: number) => void
}

interface ProjectRowProps {
  project: Project
  isActive: boolean
  isMissing: boolean
  isRenaming: boolean
  renameDraft: string
  onRenameDraftChange: (value: string) => void
  onCommitRename: () => void
  onCancelRename: () => void
  highlightedPath: string | null
  expandedPaths: Set<string>
  revealRequest: RevealRequest | null
  onSelectProject: (project: Project) => void
  onSelectFolder: (path: string) => void
  onSelectFile: (entry: FileEntry) => void
  onToggleExpand: (path: string, expanded: boolean) => void
  onLoadError: (path: string) => void
  onRemove: () => void
  onContextMenu: (event: React.MouseEvent) => void
  isDragging: boolean
  onDragStart: () => void
  onDragOver: (event: React.DragEvent) => void
  onDrop: (event: React.DragEvent) => void
  onDragEnd: () => void
}

/** One row of the PROJECTS list - and, for whichever Project is Active,
 * the tree's own root at the same time (see CONTEXT.md: "root of the tree
 * is the Project directory"). A non-Active row is a plain, inert-looking
 * folder row: clicking it activates that Project. The Active row instead
 * behaves exactly like an ordinary tree folder row (chevron, lazy fetch,
 * reveal/scroll) via the same useExpandableFolder hook LocationTreeNode
 * uses, with its own subfolders/files rendered directly beneath it via
 * TreeChildren - not as a separate tree elsewhere in the sidebar. Clicking
 * the Active row toggles its own expand/collapse rather than reactivating
 * it.
 *
 * Keyed by `${project.path}:${isActive}` in the parent .map() (see
 * Sidebar) so this component remounts fresh - with a correctly-seeded
 * expand state - every time a Project becomes (or stops being) Active,
 * rather than trying to react to expandedPaths changing after the fact
 * (useExpandableFolder only reads it once, at mount). */
function ProjectRow({
  project,
  isActive,
  isMissing,
  isRenaming,
  renameDraft,
  onRenameDraftChange,
  onCommitRename,
  onCancelRename,
  highlightedPath,
  expandedPaths,
  revealRequest,
  onSelectProject,
  onSelectFolder,
  onSelectFile,
  onToggleExpand,
  onLoadError,
  onRemove,
  onContextMenu,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: ProjectRowProps): React.JSX.Element {
  const itemRef = useRef<HTMLDivElement>(null)
  // Inactive rows never fetch/expand/reveal - only the Active Project's
  // tree is ever loaded (see CONTEXT.md's "Browsing scope").
  const folder = useExpandableFolder({
    path: project.path,
    expandedPaths: isActive ? expandedPaths : NO_EXPANDED_PATHS,
    onToggleExpand,
    revealRequest: isActive ? revealRequest : null,
    onLoadError: isActive ? onLoadError : undefined,
    itemRef
  })

  function handleClick(): void {
    if (isRenaming) return
    if (isActive) {
      void folder.toggle()
    } else {
      onSelectProject(project)
    }
  }

  return (
    <div>
      <div
        ref={itemRef}
        className={`sidebar__item sidebar__tree-item${isActive ? ' is-active' : ''}${isMissing ? ' is-missing' : ''}${isDragging ? ' is-dragging' : ''}`}
        draggable={!isRenaming}
        onClick={handleClick}
        onContextMenu={onContextMenu}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        role="button"
        tabIndex={0}
        aria-expanded={isActive && folder.expanded}
        title={isMissing ? `${project.path} (not found)` : project.path}
      >
        <span className="sidebar__chevron" aria-hidden="true">
          <ChevronIcon expanded={isActive && folder.expanded} />
        </span>
        {isRenaming ? (
          <input
            autoFocus
            className="sidebar__rename-input"
            value={renameDraft}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => onRenameDraftChange(event.target.value)}
            onBlur={onCommitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onCommitRename()
              if (event.key === 'Escape') onCancelRename()
            }}
          />
        ) : (
          <span className="sidebar__tree-label">
            {project.name}
            {isMissing && <span className="sidebar__missing-badge">not found</span>}
          </span>
        )}
        <button
          type="button"
          className="sidebar__remove"
          title="Remove Project"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
        >
          ✕
        </button>
      </div>
      {isActive && folder.expanded && (
        <TreeChildren
          loading={folder.loading}
          loadError={folder.loadError}
          contents={folder.children}
          depth={1}
          highlightedPath={highlightedPath}
          onSelectFolder={onSelectFolder}
          onSelectFile={onSelectFile}
          expandedPaths={expandedPaths}
          onToggleExpand={onToggleExpand}
          revealRequest={revealRequest}
          onLoadError={onLoadError}
        />
      )}
    </div>
  )
}

export function Sidebar({
  projects,
  activeProjectPath,
  missingProjectPaths,
  highlighted,
  expandedPaths,
  revealRequest,
  renameRequest,
  onSelectProject,
  onAddProject,
  onRemoveProject,
  onRenameProject,
  onRelocateProject,
  onReorderProjects,
  onSelectFolder,
  onSelectFile,
  onToggleExpand,
  onLoadError,
  width,
  onWidthChange
}: SidebarProps): React.JSX.Element {
  // Only set while a drag is in progress - overrides the persisted width
  // prop for live visual feedback without writing to the store on every
  // pixel of mouse movement, same pattern as FileList's old column resize.
  const [dragWidth, setDragWidth] = useState<number | null>(null)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const displayWidth = dragWidth ?? width
  // LocationTreeNode only ever needs the bare path for its own highlight
  // check.
  const highlightedPath = highlighted?.path ?? null

  // Project row currently in inline rename mode - null when none is (the
  // normal case). Local to the sidebar, not lifted to App: renaming is a
  // transient UI concern that only needs to reach App once, on commit. See
  // CONTEXT.md.
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  // The path being dragged for a PROJECTS-list reorder - null outside a
  // drag. See handleDrop.
  const [dragPath, setDragPath] = useState<string | null>(null)
  const [contextMenuFor, setContextMenuFor] = useState<{
    project: Project
    x: number
    y: number
  } | null>(null)

  function startRename(project: Project): void {
    setRenamingPath(project.path)
    setRenameDraft(project.name)
  }

  function commitRename(path: string): void {
    const trimmed = renameDraft.trim()
    setRenamingPath(null)
    if (trimmed) onRenameProject(path, trimmed)
  }

  // Auto-opens rename mode once for a freshly-added Project - see
  // RenameRequest. Never fires for activating an existing Project (App
  // only bumps renameRequest when addOrActivateProject reports `added`).
  useEffect(() => {
    if (!renameRequest) return
    const project = projects.find((p) => p.path === renameRequest.path)
    // Deferred to a microtask - setting state synchronously inside an
    // effect body cascades an extra render; same pattern as
    // LocationTreeNode's reveal effect.
    if (project) queueMicrotask(() => startRename(project))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renameRequest])

  function handleDrop(overPath: string): void {
    if (!dragPath || dragPath === overPath) {
      setDragPath(null)
      return
    }
    const paths = projects.map((project) => project.path)
    const fromIndex = paths.indexOf(dragPath)
    const toIndex = paths.indexOf(overPath)
    paths.splice(fromIndex, 1)
    paths.splice(toIndex, 0, dragPath)
    onReorderProjects(paths)
    setDragPath(null)
  }

  function startResize(event: React.MouseEvent): void {
    event.preventDefault()
    dragRef.current = { startX: event.clientX, startWidth: width }
    setDragWidth(width)

    function onMouseMove(moveEvent: MouseEvent): void {
      const drag = dragRef.current
      if (!drag) return
      const next = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, drag.startWidth + (moveEvent.clientX - drag.startX))
      )
      setDragWidth(next)
    }

    function onMouseUp(): void {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      dragRef.current = null
      setDragWidth((current) => {
        if (current !== null) onWidthChange(current)
        return null
      })
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div className="sidebar" style={{ width: displayWidth }}>
      {/* Scroll (vertical only - see .sidebar__scroll) is scoped to this
          inner wrapper, not the outer .sidebar div, so the resizer below -
          positioned half outside the sidebar's own box - isn't clipped by
          an overflow:auto ancestor and stays draggable at any scroll
          position. */}
      <div className="sidebar__scroll">
        <div className="sidebar__section-header">
          <span>PROJECTS</span>
          <button
            type="button"
            className="sidebar__add-project"
            title="Add Project…"
            onClick={onAddProject}
          >
            +
          </button>
        </div>

        {projects.map((project) => {
          const isActive = project.path === activeProjectPath
          return (
            <ProjectRow
              // Remounts fresh whenever this Project becomes (or stops
              // being) Active - see ProjectRow's own doc comment.
              key={`${project.path}:${isActive}`}
              project={project}
              isActive={isActive}
              isMissing={missingProjectPaths.has(project.path)}
              isRenaming={renamingPath === project.path}
              renameDraft={renameDraft}
              onRenameDraftChange={setRenameDraft}
              onCommitRename={() => commitRename(project.path)}
              onCancelRename={() => setRenamingPath(null)}
              highlightedPath={highlightedPath}
              expandedPaths={expandedPaths}
              revealRequest={revealRequest}
              onSelectProject={onSelectProject}
              onSelectFolder={onSelectFolder}
              onSelectFile={onSelectFile}
              onToggleExpand={onToggleExpand}
              onLoadError={onLoadError}
              onRemove={() => onRemoveProject(project.path)}
              onContextMenu={(event) => {
                event.preventDefault()
                setContextMenuFor({ project, x: event.clientX, y: event.clientY })
              }}
              isDragging={dragPath === project.path}
              onDragStart={() => setDragPath(project.path)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                handleDrop(project.path)
              }}
              onDragEnd={() => setDragPath(null)}
            />
          )
        })}

        {projects.length === 0 && (
          <div className="sidebar__empty-state">
            <p>No projects yet.</p>
            <button type="button" onClick={onAddProject}>
              Add Project
            </button>
          </div>
        )}

        {contextMenuFor && (
          <ContextMenu
            x={contextMenuFor.x}
            y={contextMenuFor.y}
            onClose={() => setContextMenuFor(null)}
            items={[
              { label: 'Rename Project…', onSelect: () => startRename(contextMenuFor.project) },
              {
                label: 'Relocate…',
                onSelect: () => onRelocateProject(contextMenuFor.project.path)
              },
              {
                label: 'Remove Project',
                onSelect: () => onRemoveProject(contextMenuFor.project.path)
              }
            ]}
          />
        )}
      </div>

      <div className="sidebar__resizer" onMouseDown={startResize} />
    </div>
  )
}
