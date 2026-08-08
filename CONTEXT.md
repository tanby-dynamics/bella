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

**Version** — the semver number identifying a running build
(`app.getVersion()`), sourced from the git tag that produced it — not from
the `package.json` version field, which stays a static placeholder. See
[ADR 0002](docs/adr/0002-git-tag-driven-versioning-and-release-notes.md).

**Release** — the published, tagged artifact set for a Version: installers
for each platform plus the matching entry in Release Notes, published as a
GitHub Release.
_Avoid_: Build, version (a Release is the published bundle; a Version is
just the number)

**Release Notes** — the hand-maintained changelog (`release-notes.md`), the
single source of truth for what changed in each Release — both the in-app
history view and each GitHub Release's description are derived from it, not
authored separately. See
[ADR 0002](docs/adr/0002-git-tag-driven-versioning-and-release-notes.md).
_Avoid_: Changelog

**Update Check** — the app's comparison, on startup or triggered manually
from Settings, of its own Version against the latest published Release, to
decide whether to show the Update Prompt.

**Update Prompt** — the in-app modal shown when an Update Check finds a
newer Release, offering to update now, remind later, or skip that Release's
Version.
_Avoid_: Nag, nag window

**Skipped Version** — a Version the user has dismissed via "Skip this
version" on the Update Prompt; suppresses the Update Prompt for that exact
Version only — a later Release still prompts.

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
- **Self-update is Windows/Linux only.** electron-updater's silent
  download-and-restart flow only runs on the NSIS and AppImage builds. The
  macOS build still runs Update Checks and shows the Update Prompt, but its
  action opens the GitHub Releases page in the browser instead —
  self-update requires a signed, notarized app and no certificate exists
  yet. See
  [ADR 0003](docs/adr/0003-electron-updater-github-provider-scoped-to-windows-linux.md).
- **Update Checks fail silently.** No network / GitHub unreachable on
  startup just means no Update Prompt that session — never an error
  dialog.
- **Skipped Version is app state, not a Setting.** Stored alongside
  `lastOpenedFolder` in the local app-config file, not exposed in the
  Settings panel — it's not something the user configures, just something
  the app remembers.
- **Manual update checks bypass Skipped Version.** The "Check for updates"
  button in Settings always shows the Update Prompt if a newer Release
  exists, even if the user previously skipped it — an explicit check
  shouldn't be silently suppressed.
- **Release workflow guards the changelog.** The tag-triggered GitHub
  Action fails the build if the top entry in `release-notes.md` doesn't
  match the pushed tag, catching a forgotten changelog update before it
  ships.
- **GitHub Releases are drafted, not auto-published.** The build workflow
  creates a draft release (installers attached, body extracted from the
  matching Release Notes entry) — a human reviews and publishes it, rather
  than the workflow publishing unattended.
