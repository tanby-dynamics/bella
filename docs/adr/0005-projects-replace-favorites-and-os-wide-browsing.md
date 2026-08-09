# Projects replace Favorites and OS-wide browsing; the tree roots at the Active Project

Supersedes the Favorite/Location model and amends [ADR 0004](0004-tree-is-the-sole-browsing-surface.md)'s
"no current folder" framing. See also [ADR 0001](0001-file-panel-files-only-navigation-via-tree.md).

Bella no longer lets you browse arbitrary OS drives and pin favorite
folders within that shared, unrestricted tree. Instead, browsing is scoped
to a Project: a directory the user explicitly picks via a system
directory-picker dialog, which becomes the tree's own root. Only one
Project is the Active Project at a time; switching Projects fully replaces
the tree's contents, rather than scrolling to a spot within a single
shared tree the way clicking a Favorite used to.

This directly amends ADR 0004's "no current folder" framing: the tree now
does have a bounded current folder at its root - the Active Project's
directory - even though nothing changes below that root ("the tree is the
sole browsing surface, no separate file list" still holds exactly as ADR
0004 described). Locations (the old OS-enumerated drive/share roots) go
away entirely, since there's no more open-ended "browse anything" surface
left to enumerate them for.

Favorites are dropped without migration; a Project's `{path, name, order}`
isn't a drop-in replacement for `Favorite {name, path}` - Projects carry
substantially more responsibility (they're the tree's root, and the key
for a whole slice of per-Project persisted UI state) that a folder
bookmark never needed. Re-adding an equivalent "pin any subfolder from
anywhere" action was considered and rejected: it would reopen the
unrestricted-browsing surface this change exists to close off, so a
Project can only be created through the directory-picker, never from a
tree-node context menu.

## Consequences

- `Favorite`, `Location`, `DriveLister`/`enumerateLocations`, and the
  favorites IPC surface are all removed rather than adapted - there's no
  multi-root tree left to enumerate.
- A new native-dialog integration (`dialog.showOpenDialog`) is
  introduced - the first place Bella talks to Electron's `dialog` module.
- `lastOpenedFolder` (a single global value) is retired in favor of
  per-Project state (selected file, expanded folders, scroll position)
  plus an Active Project pointer - each Project remembers its own place
  independently.
- A missing Project directory is a first-class, non-fatal state
  (greyed-out row, "not found" in the tree, Relocate-or-remove) rather
  than something that can't happen, since Projects - unlike
  OS-enumerated Locations - can vanish out from under the app between
  restarts.
- The PROJECTS list gains capabilities Favorites deliberately never had
  (rename, drag-to-reorder) - the "Favorites stay simple" decision this
  supersedes was scoped to Favorites' narrower job of being a
  pinned-folder shortcut, not to Projects' broader one.
- No application menu was introduced for this - Bella still has no
  native File/Edit menu; a Project's only entry point is the PROJECTS
  section's own "+" button.
