# The Locations tree is the sole browsing surface; the files-only file panel is removed

Supersedes [ADR 0001](0001-file-panel-files-only-navigation-via-tree.md).

ADR 0001 split file listing by purpose at the domain layer specifically so
"the file panel shows only files" held by construction: one function
(`listFolder`) returned files only, a separate function (`listSubfolders`)
returned immediate subfolders only, and the file panel's row rendering
never had to branch on `isDirectory`. That guarantee is deliberately
removed here. We folded the file panel into the Locations tree itself, so
that expanding any folder anywhere in the tree reveals its subfolders and
files together, inline - a single VS Code Explorer-style hierarchy instead
of a tree-for-folders/list-for-files split across two panels. `listFolder`
and `listSubfolders` are replaced by one domain function,
`listFolderContents`, that returns both groups for a given folder in one
call - each tree node's lazy expansion is now backed by one seam instead of
two.

This also removes the "current folder" concept entirely. Previously,
navigating in the tree swapped the file panel's contents to show one
folder's files at a time, and the breadcrumb tracked that current folder.
With no separate panel left to swap, there's no single "folder you're in"
either - any number of tree nodes can be expanded independently, the same
way a VS Code Explorer works. The breadcrumb's anchor changes accordingly:
it tracks whatever's currently _highlighted_ in the tree - a folder's own
path, or a selected file's containing folder - rather than a navigated-to
folder. Clicking a breadcrumb segment (or a Favorite) highlights that
folder, the same as clicking its row directly, and reveals (expands +
scrolls to) it in the tree; it doesn't navigate anywhere, since the tree
is the only browsing surface, but it does select, so the breadcrumb
itself updates to match what was just clicked.

Folder rows lost their split chevron/label click targets - previously the
chevron toggled expand/collapse and the label navigated, two different
actions. With "navigate" gone, there was nothing left for a second click
target to disambiguate, so a folder row is now a single click target that
both toggles expand and highlights the row (matching a VS Code Explorer
folder row). File rows keep their old file-list row appearance (format-
colored icon, click-to-preview) as tree leaves.

Selecting a file is now decoupled from browsing: clicking or expanding a
folder only changes the tree's highlight, never the preview. Only
selecting a _different file_ changes what's loaded in the preview panel,
metadata panel, and status bar - so browsing other parts of the tree never
discards what you're currently looking at.

## Consequences

- `listFolder`/`listSubfolders` and the file panel's column-based sort
  (`sortEntries`, the persisted `sort`/`columnWidths` Settings) are all
  removed. Tree children sort folders-first, then alphabetically
  (case-insensitive) within each group - fixed, not user-configurable.
- The sidebar (now carrying file rows, not just folder names) is
  resizable, its width persisted in Settings as `sidebarWidth` - the sole
  surviving piece of the old resizable-columns persistence.
- The file panel's per-row metadata columns (Date modified, Type, Size) are
  gone. Type and Size now show in the status bar for the selected file;
  Modified date isn't duplicated there since it already lives in the
  metadata panel, keyed off the same selected file.
- Adding a feature that needs files-and-folders together (the entire point
  of this change) no longer needs to compose two domain functions - the
  cost ADR 0001 explicitly accepted in exchange for the files-only
  guarantee is the cost this ADR pays back.
- This is a visual/structural change only - no multi-select, context menu,
  drag-and-drop, or file-management actions were introduced. Bella remains
  read-only.
