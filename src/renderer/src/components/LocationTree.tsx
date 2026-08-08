import { useEffect, useRef, useState } from 'react'
import type { FileEntry, FolderContents, Subfolder } from '../types'
import { isAncestorPath } from '../paths'
import { FORMAT_BADGES } from '../formatBadges'

interface TreeItem {
  name: string
  path: string
}

/** A one-shot request to expand the tree down to `path` and scroll that
 * node into view - `nonce` exists so clicking the same Favorite twice in a
 * row still re-triggers the scroll (a path alone wouldn't change between
 * identical clicks, so effects keyed on it wouldn't re-fire). A reveal
 * only expands/scrolls, by itself - it carries no highlight information
 * and the tree's own reveal effect never sets highlightedPath. Callers
 * that want the revealed folder highlighted too (a Favorite click, not
 * the one-off startup reveal) do so via a separate, App-owned setState
 * alongside dispatching the reveal - see App.tsx's selectFolderAndReveal.
 * See ADR 0004. */
export interface RevealRequest {
  path: string
  nonce: number
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

interface LocationTreeNodeProps {
  item: TreeItem
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
  /** The folder Bella opened at startup (last-opened folder, or home if
   * none) - captured once and never updated, so this only ever drives
   * auto-expansion on initial mount, not on every later interaction. */
  autoExpandPath: string | null
  /** Set on startup, and by a Favorite click - see RevealRequest. */
  revealRequest: RevealRequest | null
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
      {badge ? <CubeIcon color={isHighlighted ? 'var(--accent)' : badge.color} /> : <FileIcon />}
      <span className="sidebar__tree-file-name">{entry.name}</span>
    </div>
  )
}

/** One folder node of the Locations tree - a Location root (depth 0) or a
 * plain subfolder underneath one (depth > 0, not itself a Location, see
 * CONTEXT.md). Its subfolders and files are fetched together, lazily, on
 * first expand, and cached in local state for the life of the node -
 * collapsing and re-expanding doesn't re-fetch. Unlike the old
 * chevron/label split, the whole row is one click target: it toggles
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
  autoExpandPath,
  revealRequest
}: LocationTreeNodeProps): React.JSX.Element {
  // Computed once per node (autoExpandPath/item.path are both stable for a
  // given node instance) - drives the *initial* state directly rather than
  // being applied via a post-mount setState, so mounting on the path to the
  // startup folder doesn't need an effect to flip expanded/loading on.
  const shouldAutoExpand = autoExpandPath !== null && isAncestorPath(item.path, autoExpandPath)

  const [expanded, setExpanded] = useState(shouldAutoExpand)
  const [children, setChildren] = useState<FolderContents | null>(null)
  const [loading, setLoading] = useState(shouldAutoExpand)
  const fetchStartedRef = useRef(false)
  const itemRef = useRef<HTMLDivElement>(null)

  async function loadChildren(): Promise<FolderContents> {
    const contents = await window.api.listFolderContents(item.path)
    setChildren(contents)
    setLoading(false)
    return contents
  }

  async function expand(): Promise<void> {
    if (children === null) {
      setLoading(true)
      await loadChildren()
    }
    setExpanded(true)
  }

  async function handleRowClick(): Promise<void> {
    onSelectFolder(item.path)
    if (expanded) {
      setExpanded(false)
    } else {
      await expand()
    }
  }

  useEffect(() => {
    if (fetchStartedRef.current || !shouldAutoExpand) return
    fetchStartedRef.current = true

    async function fetchInitialChildren(): Promise<void> {
      // `loading` is already true from initial state.
      const contents = await window.api.listFolderContents(item.path)
      setChildren(contents)
      setLoading(false)
    }

    fetchInitialChildren()
  }, [shouldAutoExpand, item.path])

  // Reveal (Favorite click): expand this node if it lies on
  // the path to the revealed folder (ancestor or exact match -
  // isAncestorPath covers both), and scroll it into view once it *is* the
  // exact match. Runs on every revealRequest change, including on a
  // freshly-mounted child node's first render (a parent expanding is what
  // mounts it), so the reveal cascades one tree level at a time the same
  // way the startup auto-expand does. Never touches highlightedPath - a
  // reveal only expands/scrolls, it doesn't select anything (see
  // RevealRequest).
  useEffect(() => {
    if (!revealRequest || !isAncestorPath(item.path, revealRequest.path)) return
    if (!expanded) void expand()
    if (item.path === revealRequest.path) {
      itemRef.current?.scrollIntoView({ block: 'nearest' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealRequest])

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
        <div className="sidebar__tree-children">
          {loading && <div className="sidebar__tree-loading">Loading…</div>}
          {children?.subfolders.map((child: Subfolder) => (
            <LocationTreeNode
              key={child.path}
              item={child}
              depth={depth + 1}
              highlightedPath={highlightedPath}
              onSelectFolder={onSelectFolder}
              onSelectFile={onSelectFile}
              autoExpandPath={autoExpandPath}
              revealRequest={revealRequest}
            />
          ))}
          {children?.files.map((file) => (
            <TreeFileRow
              key={file.path}
              entry={file}
              depth={depth + 1}
              isHighlighted={file.path === highlightedPath}
              onSelect={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  )
}
