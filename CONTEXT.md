# Bella — Domain Glossary

Bella is a cross-platform (Windows/macOS/Linux) desktop app for browsing the
filesystem and previewing CAD files in a 3D viewer.

## Terms

**Renderable format** — a CAD file format Bella can parse into a mesh and
display in the 3D viewer. v1: STL only. The set of renderable formats is
expected to grow over time.

**Listed format** — a recognized CAD file format that appears in the file
browser (badge, icon) but has no 3D preview yet; shown with a
"preview not available" state instead of a render. v1: STEP, FCStd, SCAD.

**Favorite** — a user-pinned folder shown in the sidebar for quick access.

**Browsing scope** — unrestricted and OS-wide: any drive, folder, or network
share reachable from the OS, not limited to app-defined workspaces or
project roots. The file list shows every *file* in the current folder, not
just CAD files, and no subfolders (see Location below for folder
navigation) — CAD files (Renderable or Listed formats) get an extension
badge and preview support; everything else gets a generic file icon and no
preview.

**Location** — a filesystem root shown in the sidebar's tree (e.g. "This
PC", a drive, a network share), auto-enumerated from the OS and lazily
expandable to browse its subfolders. Distinct from Favorite: Locations are
what the OS offers, Favorites are what the user pins. The term applies only
to these top-level roots — the tree's expandable subfolder nodes underneath
a Location aren't themselves Locations, just folders being browsed.

**Render mode** — the 3D viewer's display style for a Renderable-format
file, one of:
- **Shaded** — normal lit solid render (faces filled, simple lighting).
- **Wireframe** — mesh edges only, no face fill.
- **X-ray** — solid render with semi-transparent faces, so internal
  structure/overlaps show through the surface.

**Open** (action) — launches the selected file in the OS's default external
application for that file type. Distinct from selecting a file in the list,
which updates Bella's own 3D preview in place.

## Decisions (not yet ADR-worthy, tracked here for now)

- **No Volume metadata.** Volume is only well-defined for a closed
  (watertight, manifold) mesh, and real-world exports often aren't — this
  metadata field is descoped rather than showing unreliable numbers.
  Metadata panel v1 fields: Dimensions, Triangle count, Modified date.
- **v1 Settings scope**: theme (light/dark/system) and default render
  mode. Nothing file-management-related until that feature exists.
- **Folder navigation is tree-only.** The file panel lists files only —
  no folders, no click-to-navigate. Changing folder happens exclusively
  via the Locations sidebar tree (lazily expandable per Location, one
  level of subfolders at a time). The breadcrumb is a passive "you are
  here" indicator with click-to-jump to an ancestor, not an independent
  navigation control, and the tree does not auto-expand/sync to follow
  it.
- **Tree chevrons are unconditional.** Every folder node in the tree
  shows an expand affordance, even if it turns out to have no
  subfolders — avoids an eager per-node child-existence check. Chevron
  and label are separate click targets: chevron expands/collapses,
  label navigates.
- **No synthetic "This PC" grouping node.** Locations stay flat
  top-level roots (drives, shares), matching how they're enumerated
  today — no wrapper node introduced purely for grouping.
- **Favorites stay simple.** Explorer-styled (collapsible section, same
  visual treatment as the tree) but no drag-to-reorder and no
  auto-suggested "frequent folders" — pinning/unpinning only, same as
  today.
- **File-listing domain functions are split by purpose**, not filtered
  client-side: one domain function returns files only for the file
  panel, a separate function returns immediate subfolders only for tree
  expansion. See [ADR 0001](docs/adr/0001-file-panel-files-only-navigation-via-tree.md).
- **File list view is fixed at list (Explorer-style)**, sortable by
  column (Name, Date modified, Type, Size). Sort is a single global
  (column, direction) setting — not per-folder — persisted across
  restarts; clicking the active column toggles direction; sensible
  per-column defaults (Name/Type ascending, Date modified/Size
  descending on first click).
- **Metadata panel for Listed formats** shows only file size and Modified
  date — Dimensions and Triangle count require parsing geometry Bella
  doesn't understand for these formats, so they're omitted rather than
  shown empty.
- **App state persists** across restarts in a local app-config file:
  Favorites list, last-opened folder, and the global sort setting.
- **Selection is single-file only** in v1 — no multi-select.
- **3D viewer interaction**: mouse-drag to orbit, scroll-wheel to zoom
  (primary); on-screen +/- buttons perform the same zoom as a secondary,
  accessible control.
- **No search/filter** within a folder in v1.
- **v1 Renderable format set**: STL only. Other plain-mesh formats
  (OBJ, PLY, ...) can be added later given the format handling is
  designed to be extensible; nothing else is in scope until needed.
- **Empty preview state**: when no file is selected (empty folder, or
  before any selection), the preview panel shows an explicit empty state
  ("No file selected" / "This folder is empty") and the metadata panel
  fields are blank — no placeholder cube.
- **Load-failure state is distinct from "preview not available."**
  A Listed format (STEP/FCStd/SCAD) shows "preview not available" because
  Bella doesn't support the format at all — an expected, known gap. A
  Renderable-format file (STL) that fails to parse shows a different error
  state ("Couldn't load — file may be corrupted") because Bella *does*
  claim to support it and something went wrong.

- **Read-only for v1.** Bella does not move, rename, or delete files yet.
  Simple file management is a planned future capability — the read-only
  design should not preclude adding it later.
- **Row icons are type icons, not renders.** Each file-list row shows an
  icon/color keyed off file extension, not a generated snapshot of the
  model's actual geometry.
