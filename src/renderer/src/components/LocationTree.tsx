import { useRef } from 'react'
import type { FileEntry, FolderContents, Subfolder } from '../types'
import { FORMAT_BADGES } from '../formatBadges'
import { useExpandableFolder, type ExpandableFolderArgs } from '../useExpandableFolder'

/** A one-shot request to expand the tree down to `path` and scroll that
 * node into view - `nonce` exists so re-activating the same Project (or
 * re-selecting the same restored file) still re-triggers the scroll (a
 * path alone wouldn't change between identical requests, so effects keyed
 * on it wouldn't re-fire). A reveal only expands/scrolls, by itself - it
 * carries no highlight information and the tree's own reveal effect never
 * sets highlightedPath. Callers that want the revealed folder highlighted
 * too do so via a separate, App-owned setState alongside dispatching the
 * reveal. See ADR 0004.
 *
 * `align` picks the revealed node's scroll alignment - 'start' scrolls it
 * to the top of the sidebar (activating a Project, or restoring its
 * selected file: the user's attention is on what just appeared, so it
 * should land somewhere predictable rather than wherever "nearest" happens
 * to leave it), 'nearest' (the default) makes the minimal scroll needed to
 * bring it into view. */
export interface RevealRequest {
  path: string
  nonce: number
  align?: ScrollLogicalPosition
}

/** The single row highlighted across the whole Locations tree - a file or a
 * folder, never both at once. Decoupled from which file (if any) is
 * currently previewed: browsing/highlighting folders never changes the
 * preview. Owned by App, threaded through Sidebar as one value rather than
 * as separate path/kind props, since both travel together everywhere it's
 * consumed. See ADR 0004. */
export interface Highlighted {
  path: string
  kind: 'file' | 'folder'
}

export function ChevronIcon({ expanded }: { expanded: boolean }): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 0.1s' }}
    >
      <path d="M8 4l8 8-8 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

function FileIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M6 2h8l4 4v16H6V2z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function CubeIcon({ color }: { color: string }): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2z" stroke={color} strokeWidth="1.4" />
      <path d="M12 2v18M4 6.5L12 11l8-4.5" stroke={color} strokeWidth="1.4" />
    </svg>
  )
}

/** A leaf row for a file inside the tree - no expand, no children. Selecting
 * it highlights it and loads it into the preview; unlike a folder click,
 * this is the only interaction that changes what's previewed. Row icon
 * matches the old file list's: a format-colored cube for CAD files, a
 * generic file icon otherwise - "row icons are type icons, not renders",
 * per CONTEXT.md, carried over unchanged. */
function TreeFileRow({
  entry,
  depth,
  isHighlighted,
  onSelect
}: {
  entry: FileEntry
  depth: number
  isHighlighted: boolean
  onSelect: (entry: FileEntry) => void
}): React.JSX.Element {
  const badge =
    entry.classification.kind !== 'other' ? FORMAT_BADGES[entry.classification.format] : undefined

  return (
    <div
      className={`sidebar__item sidebar__tree-item sidebar__tree-file${isHighlighted ? ' is-active' : ''}`}
      style={{ paddingLeft: 10 + depth * 16 }}
      onClick={() => onSelect(entry)}
      role="button"
      tabIndex={0}
    >
      {badge ? <CubeIcon color="var(--accent)" /> : <FileIcon />}
      <span className="sidebar__tree-file-name">{entry.name}</span>
    </div>
  )
}

interface TreeChildrenProps {
  loading: boolean
  loadError: boolean
  contents: FolderContents | null
  depth: number
  highlightedPath: string | null
  onSelectFolder: (path: string) => void
  onSelectFile: (entry: FileEntry) => void
  expandedPaths: Set<string>
  onToggleExpand: (path: string, expanded: boolean) => void
  revealRequest: RevealRequest | null
  onLoadError?: (path: string) => void
}

/** The loading/error/subfolder/file rows shown under an expanded folder -
 * shared by LocationTreeNode (a subfolder) and Sidebar's ProjectRow (a
 * Project acting as the tree's root), so a Project's own contents render
 * exactly the same way a subfolder's would. */
export function TreeChildren({
  loading,
  loadError,
  contents,
  depth,
  highlightedPath,
  onSelectFolder,
  onSelectFile,
  expandedPaths,
  onToggleExpand,
  revealRequest,
  onLoadError
}: TreeChildrenProps): React.JSX.Element {
  return (
    <div className="sidebar__tree-children">
      {loading && <div className="sidebar__tree-loading">Loading…</div>}
      {loadError && !loading && (
        <div className="sidebar__tree-error">{"Couldn't load this folder"}</div>
      )}
      {contents?.subfolders.map((child: Subfolder) => (
        <LocationTreeNode
          key={child.path}
          item={child}
          depth={depth}
          highlightedPath={highlightedPath}
          onSelectFolder={onSelectFolder}
          onSelectFile={onSelectFile}
          expandedPaths={expandedPaths}
          onToggleExpand={onToggleExpand}
          revealRequest={revealRequest}
          onLoadError={onLoadError}
        />
      ))}
      {contents?.files.map((file) => (
        <TreeFileRow
          key={file.path}
          entry={file}
          depth={depth}
          isHighlighted={file.path === highlightedPath}
          onSelect={onSelectFile}
        />
      ))}
    </div>
  )
}

interface LocationTreeNodeProps extends Omit<ExpandableFolderArgs, 'path' | 'itemRef'> {
  item: { name: string; path: string }
  depth: number
  /** The single row highlighted across the whole tree - a file or a
   * folder, never both at once. Decoupled from which file (if any) is
   * currently previewed: browsing/highlighting folders never changes the
   * preview. See ADR 0004. */
  highlightedPath: string | null
  /** Fired when this folder's row is clicked - the node handles its own
   * expand/collapse locally; this only reports the highlight change up. */
  onSelectFolder: (path: string) => void
  onSelectFile: (entry: FileEntry) => void
}

/** One subfolder node of the Locations tree, underneath the Active
 * Project's own root (which Sidebar's ProjectRow renders directly - see
 * CONTEXT.md, "root of the tree is the Project directory"). Its subfolders
 * and files are fetched together, lazily, on first expand, and cached in
 * local state for the life of the node - collapsing and re-expanding
 * doesn't re-fetch. The whole row is one click target: it toggles
 * expand/collapse and highlights the row in the same click, matching a VS
 * Code Explorer folder row (see ADR 0004 - there's no separate "navigate
 * into" action left to disambiguate from "expand" now that the tree is the
 * only browsing surface). Folder rows show no icon, only the chevron -
 * files keep theirs (see TreeFileRow). Chevrons are unconditional, even for
 * a folder that turns out to have no children, matching the old file-panel
 * tree's behaviour. */
export function LocationTreeNode({
  item,
  depth,
  highlightedPath,
  onSelectFolder,
  onSelectFile,
  expandedPaths,
  onToggleExpand,
  revealRequest,
  onLoadError
}: LocationTreeNodeProps): React.JSX.Element {
  const itemRef = useRef<HTMLDivElement>(null)
  const { expanded, children, loading, loadError, toggle } = useExpandableFolder({
    path: item.path,
    expandedPaths,
    onToggleExpand,
    revealRequest,
    onLoadError,
    itemRef
  })

  async function handleRowClick(): Promise<void> {
    onSelectFolder(item.path)
    await toggle()
  }

  return (
    <div>
      <div
        ref={itemRef}
        className={`sidebar__item sidebar__tree-item${item.path === highlightedPath ? ' is-active' : ''}`}
        style={{ paddingLeft: 10 + depth * 16 }}
        onClick={() => void handleRowClick()}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={item.name}
      >
        <span className="sidebar__chevron" aria-hidden="true">
          <ChevronIcon expanded={expanded} />
        </span>
        <span className="sidebar__tree-label">{item.name}</span>
      </div>
      {expanded && (
        <TreeChildren
          loading={loading}
          loadError={loadError}
          contents={children}
          depth={depth + 1}
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
