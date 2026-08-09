import { useEffect, useRef, useState } from 'react'
import type { FolderContents } from './types'
import { isAncestorPath } from './paths'
import type { RevealRequest } from './components/LocationTree'

export interface ExpandableFolderArgs {
  path: string
  /** Every folder path currently expanded in the Active Project's tree -
   * this Project's own persisted browsing state (see ProjectState),
   * restored node-by-node as each node mounts, rather than as one eager
   * bulk re-expand. A node auto-expands on mount if its own path is a
   * member; user-driven expand/collapse afterward is reported back up via
   * onToggleExpand rather than mutated here, so App stays the single
   * source of truth for what gets persisted. */
  expandedPaths: Set<string>
  /** Fired whenever this node's own expanded state changes (a click, or a
   * reveal cascading an ancestor open) - lets App keep its persisted
   * per-Project expand-state in sync as the user browses, not just at a
   * checkpoint. See CONTEXT.md. */
  onToggleExpand: (path: string, expanded: boolean) => void
  /** Set on Project activation, and when restoring that Project's
   * persisted selected file - see RevealRequest. */
  revealRequest: RevealRequest | null
  /** Fired if this node's own folder-listing fetch fails (most notably the
   * Active Project's own root - a missing Project directory, see
   * CONTEXT.md). The node still renders its own inline "not found" state
   * either way; this only lets callers react further up the tree (e.g.
   * greying out the Project's row). */
  onLoadError?: (path: string) => void
  /** The row's own DOM ref, created and owned by the calling component
   * (LocationTreeNode or ProjectRow) rather than by this hook - scrolled
   * into view by the reveal effect below. Kept out of this hook's return
   * value on purpose: bundling a ref together with the plain reactive
   * state below into one returned object trips up `react-hooks/refs`,
   * which (rightly) doesn't want a ref's identity conflated with values
   * that actually drive rendering. */
  itemRef: React.RefObject<HTMLDivElement | null>
}

/** Shared expand/lazy-fetch/reveal behaviour for one folder node in the
 * tree, used both by LocationTreeNode (an ordinary subfolder) and by
 * Sidebar's own ProjectRow (a Project acting as the tree's root - see
 * ADR 0005/CONTEXT.md, "root of the tree is the Project directory").
 * Extracted as a hook rather than a shared base component so each caller
 * can render its own row chrome (a Project row also carries rename/remove
 * affordances a plain subfolder never needs) while sharing everything
 * about *when* to fetch, expand, and scroll. Lives in its own module,
 * rather than alongside LocationTreeNode/TreeChildren, so that file can
 * stay component-only (see react-refresh/only-export-components). */
export function useExpandableFolder({
  path,
  expandedPaths,
  onToggleExpand,
  revealRequest,
  onLoadError,
  itemRef
}: ExpandableFolderArgs): {
  expanded: boolean
  children: FolderContents | null
  loading: boolean
  loadError: boolean
  toggle: () => Promise<void>
} {
  // Computed once per instance (expandedPaths/path are both stable for a
  // given instance's first render) - drives the *initial* state directly
  // rather than being applied via a post-mount setState, so mounting on a
  // path Project 0005 restored doesn't need an effect to flip
  // expanded/loading on. Callers that need a fresh read of expandedPaths
  // when e.g. a Project newly becomes active (see ProjectRow) do so by
  // remounting this hook's owner, not by expecting it to react to a later
  // expandedPaths prop change.
  const shouldAutoExpand = expandedPaths.has(path)

  const [expanded, setExpanded] = useState(shouldAutoExpand)
  const [children, setChildren] = useState<FolderContents | null>(null)
  const [loading, setLoading] = useState(shouldAutoExpand)
  const [loadError, setLoadError] = useState(false)
  const fetchStartedRef = useRef(false)

  async function loadChildren(): Promise<void> {
    try {
      const contents = await window.api.listFolderContents(path)
      setChildren(contents)
      setLoadError(false)
    } catch {
      // Most commonly a missing/renamed/unmounted directory - the Active
      // Project's own root failing means the Project itself can't be
      // found (see CONTEXT.md's "missing directory" decision); a
      // subfolder's failure is rarer (permissions) but handled the same
      // inline way rather than left to throw unhandled.
      setLoadError(true)
      onLoadError?.(path)
    } finally {
      setLoading(false)
    }
  }

  async function expand(): Promise<void> {
    // children stays null on a failed fetch (see loadChildren's catch), so
    // re-expanding after a collapse retries rather than getting stuck
    // showing the stale error forever.
    if (children === null) {
      setLoading(true)
      await loadChildren()
    }
    setExpanded(true)
    onToggleExpand(path, true)
  }

  async function toggle(): Promise<void> {
    if (expanded) {
      setExpanded(false)
      onToggleExpand(path, false)
    } else {
      await expand()
    }
  }

  useEffect(() => {
    if (fetchStartedRef.current || !shouldAutoExpand) return
    fetchStartedRef.current = true

    // `loading` is already true from initial state. Fired as soon as this
    // node mounts - i.e. as soon as its parent expanded far enough to
    // render it - rather than waiting for a click, so a Project's restored
    // expand-state (or a freshly-expanded folder's own children, one level
    // deep) loads in the background and feels instant once the user does
    // interact with it. See CONTEXT.md's prefetch decision.
    loadChildren()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoExpand, path])

  // Reveal (Project activation, or restoring its selected file): expand
  // this node if it lies on the path to the revealed target (ancestor or
  // exact match - isAncestorPath covers both), and scroll it into view
  // once it *is* the exact match. Runs on every revealRequest change,
  // including on a freshly-mounted child node's first render (a parent
  // expanding is what mounts it), so the reveal cascades one tree level at
  // a time. Never touches highlight state - a reveal only expands/scrolls,
  // it doesn't select anything (see RevealRequest).
  useEffect(() => {
    if (!revealRequest || !isAncestorPath(path, revealRequest.path)) return
    // Deferred to a microtask - expand() can setState synchronously (e.g.
    // setExpanded(true) with no await in between, when children are
    // already loaded), which would otherwise cascade a render straight out
    // of this effect.
    if (!expanded) queueMicrotask(() => void expand())
    if (path === revealRequest.path) {
      itemRef.current?.scrollIntoView({ block: revealRequest.align ?? 'nearest' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealRequest])

  return { expanded, children, loading, loadError, toggle }
}
