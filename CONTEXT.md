# Bella — Domain Glossary

Bella is a cross-platform (Windows/macOS/Linux) desktop app for browsing the
filesystem and previewing CAD files in a 3D viewer.

## Terms

**Renderable format** — a CAD file format Bella can parse into a mesh and
display in the 3D viewer. STL, OBJ, 3MF, STEP (`.step`/`.stp`). The set of
renderable formats is expected to grow over time.

**Listed format** — a recognized CAD file format with no 3D preview yet;
would show a badge/icon and a "preview not available" state instead of a
render, if selected. FCStd, SCAD, MTL. Classified by the same
`classifyFormat` a Renderable format is, but as of the "no-preview formats
stay out of the tree" decision below, a Listed-format file never actually
reaches the tree to be selected - the classification exists for the
metadata/preview UI to fall back on if that changes. MTL is Listed rather
than Renderable even though Bella does read it (see "OBJ's MTL sidecar"
below) - it's a material sidecar, not a mesh format, so it never gets a 3D
preview of its own.

**Favorite** — a user-pinned folder shown in the sidebar for quick access.

**Browsing scope** — unrestricted and OS-wide: any drive, folder, or network
share reachable from the OS, not limited to app-defined workspaces or
project roots. Expanding a folder anywhere in the Locations tree reveals its
Renderable-format files (the only ones with a 3D preview, each with an
extension badge) and subfolders; hidden entries and any file without a
preview - Listed format or unrecognized - are filtered out rather than
shown unstyled (see the "Hidden and no-preview entries" decision below).
See ADR 0004: the tree is the sole browsing surface, there's no separate
file list.

**Location** — a filesystem root shown in the sidebar's tree (e.g. "This
PC", a drive, a network share), auto-enumerated from the OS and lazily
expandable to browse its subfolders and files. Distinct from Favorite:
Locations are what the OS offers, Favorites are what the user pins. The
term applies only to these top-level roots — the tree's expandable
subfolder nodes underneath a Location aren't themselves Locations, just
folders being browsed.

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
- **v1 Settings scope**: theme (light/dark/system). Nothing
  file-management-related until that feature exists. Render mode is not a
  Setting - see "App state persists" below.
- **The Locations tree is the sole browsing surface.** There's no
  separate file list panel and no "current folder" concept — expanding a
  folder anywhere in the tree reveals its subfolders and files together,
  inline, and any number of folders can be expanded independently at
  once (a VS Code Explorer-style hierarchy). The breadcrumb tracks
  whatever's currently _highlighted_ — a folder's own path, or a
  selected file's containing folder — instead of a navigated-to folder.
  Clicking a breadcrumb segment (or a Favorite) highlights that folder,
  the same as clicking its row directly, and reveals (expands + scrolls
  to) it in the tree — it doesn't navigate anywhere, since the tree is
  the only browsing surface, but it does select, so the breadcrumb
  itself updates to match. The tree still does not otherwise
  auto-expand/sync to follow the highlight. See ADR 0004, which
  supersedes ADR 0001.
- **Tree chevrons are unconditional.** Every folder node in the tree
  shows an expand affordance, even if it turns out to have no children —
  avoids an eager per-node child-existence check. A folder row is a
  single click target (unlike the old chevron/label split): clicking it
  toggles expand/collapse and highlights the row in the same click, since
  there's no separate "navigate" action left to disambiguate from
  "expand." Selecting/highlighting a folder never touches the preview —
  only selecting a _different file_ does.
- **No synthetic "This PC" grouping node.** Locations stay flat
  top-level roots (drives, shares), matching how they're enumerated
  today — no wrapper node introduced purely for grouping.
- **Favorites stay simple.** Explorer-styled (collapsible section, same
  visual treatment as the tree) but no drag-to-reorder and no
  auto-suggested "frequent folders" — pinning/unpinning only, same as
  today.
- **One domain function returns a folder's subfolders and files
  together** (`listFolderContents`), pre-sorted folders-first then
  alphabetically (case-insensitive) within each group — replaces the old
  files-only/subfolders-only split. See [ADR 0004](docs/adr/0004-tree-is-the-sole-browsing-surface.md),
  which supersedes [ADR 0001](docs/adr/0001-file-panel-files-only-navigation-via-tree.md).
- **Tree sort order is fixed**, not user-configurable: folders first,
  then files, both alphabetical/case-insensitive. There's no column-based
  sort UI or persisted sort setting anymore (see ADR 0004) — Type and
  Size for the selected file show in the status bar instead.
- **The sidebar/tree panel is resizable**, its width persisted across
  restarts as `sidebarWidth` — the sole survivor of the old
  resizable-columns persistence, now that files render as tree rows
  rather than list columns.
- **Metadata panel for Listed formats** shows only file size and Modified
  date — Dimensions and Triangle count require parsing geometry Bella
  doesn't understand for these formats, so they're omitted rather than
  shown empty.
- **App state persists** across restarts in a local app-config file:
  Favorites list, last-opened folder (now updated whenever a file is
  selected, since there's no separate "navigate to a folder" event
  anymore — see ADR 0004), the sidebar width, and the last-selected Render
  mode (updated whenever the user picks one in the preview's render-mode
  toggle - not a Setting, same treatment as Skipped Version).
- **Selection is single-file only** in v1 — no multi-select. The tree's
  highlight can land on a folder too (for visual feedback while
  browsing), but only a file selection drives the preview, and it's a
  separate piece of state from the highlight — see ADR 0004.
- **3D viewer interaction**: mouse-drag to orbit, scroll-wheel to zoom
  (primary); on-screen +/- buttons perform the same zoom as a secondary,
  accessible control. No damping/inertia on orbit - the camera tracks the
  mouse directly and stops the instant the drag ends, rather than
  drifting on afterward.
- **No search/filter** within a folder in v1.
- **Hidden and no-preview entries are filtered out of the tree**, not
  shown-but-unstyled. "Hidden" is a dotfile/dotfolder (leading `.`, every
  platform) or, on Windows, the OS Hidden attribute (checked per directory
  via PowerShell in `fsDirectoryReader` - no such attribute exists on
  macOS/Linux). A file without a 3D preview is filtered too, before its
  metadata is even read: that's both an unrecognized file
  (FormatClassification `other`) and a Listed-format file (`fcstd`/`scad`/
  `mtl` - recognized, but no preview implemented) - only a Renderable
  format (STL, OBJ, 3MF, STEP) makes it into the tree. This is a
  `listFolderContents` filter, not a user-facing toggle - there's no way to
  reveal these entries in v1, and no way to select a Listed-format file at
  all right now (its "preview not available" state in the preview/metadata
  panels is currently unreachable through the tree, kept for when a Listed
  format gains a preview and becomes Renderable).
- **Renderable format set**: STL, OBJ, 3MF, STEP. Other plain-mesh formats
  (PLY, ...) can be added later given the format handling is designed to be
  extensible; nothing else is in scope until needed.
- **OBJ's MTL sidecar is resolved directly from disk, not through the
  tree.** An OBJ's `mtllib` directive(s) name one or more `.mtl` files,
  read relative to the OBJ's own directory when the OBJ is parsed for
  preview (`resolveMtlSources` in `src/main/index.ts`) - the MTL never
  needs to be Selected or even visible in the tree itself (and, being a
  Listed format, isn't - see above). A missing/unreadable MTL, or an
  MTL that doesn't define a material a `usemtl` line asks for, isn't a
  parse failure: those faces just render with the same neutral fallback
  color used before any material is set. Only each material's `Kd`
  (diffuse) color is read - no textures (`map_Kd`), specular/ambient
  terms, or transparency.
- **An OBJ's own material color takes precedence over Settings.renderColor**,
  the same "format's own color wins over the fallback" rule renderColor was
  already documented to leave room for (see `Settings.renderColor`) - if
  every face resolves to a material color, the render color Setting has no
  visible effect on that file. If the OBJ has no `mtllib`/`usemtl` at all,
  it's treated the same as STL: colorless, so renderColor applies normally.
- **3MF support covers the core spec's mesh/build/basematerials, not
  assemblies or the Materials and Properties Extension.** A 3MF package is a
  ZIP (unzipped in-process via `fflate`, now a direct dependency rather than
  three's bundled copy) containing an XML "3D model part", conventionally at
  `3D/3dmodel.model`. Bella reads every `<object>`'s own `<mesh>`, places
  each `<build><item>` instance (applying its `transform`, if any) into one
  combined preview - a 3MF's whole build platform is the file's preview, the
  same way an OBJ or STL file's whole geometry is - and resolves triangle
  colors from `<basematerials>` groups via `pid`/`pindex` (object-level
  default, overridable per-triangle), same precedence-over-renderColor rule
  as OBJ+MTL above. Out of scope, same "known gap" treatment as OBJ's
  textures: `<components>` (an object that's an assembly of other objects
  rather than its own mesh - such an object contributes nothing, not a
  parse failure, unless nothing on the build platform has its own mesh, at
  which point it's the same "no renderable geometry" parse error as an empty
  build), the Materials and Properties Extension's colorgroups/textures, and
  multiple models per package (only the root model part is read).
- **STEP preview is tessellated by occt-import-js** (an Emscripten/WASM
  build of OpenCascade, `src/domain/stepParser.ts`), not a parser Bella
  hand-rolls the way it does for STL/OBJ/3MF's text/XML formats - a STEP
  file's b-rep (curved surfaces, trimmed faces, boolean-combined solids) is
  far beyond a bespoke parser's reach. `.stp` classifies the same as
  `.step` (see `formats.ts`). Every named sub-shape/part the file resolves
  to becomes one occt-import-js "mesh"; Bella combines all of them into one
  flat preview, same "whole file is the preview" rule 3MF's build platform
  uses - there's no assembly-tree UI to browse sub-shapes individually.
  Only each mesh's own whole-shape color is read, not occt-import-js's
  per-`brep_faces` colors (a single STEP shape can carry a different color
  per face) - same "known gap" treatment as OBJ's textures and 3MF's
  `<components>`. Tessellation quality (deflection) is left at
  occt-import-js's defaults - no Settings surface for it in v1. The
  WASM module is loaded once per process and reused (see `loadOcct` in
  stepParser.ts) rather than re-instantiated per file, since it's an
  expensive, stateless singleton.
- **Empty preview state**: when no file is selected (empty folder, or
  before any selection), the preview panel shows an explicit empty state
  ("No file selected" / "This folder is empty") and the metadata panel
  fields are blank — no placeholder cube.
- **Load-failure state is distinct from "preview not available."**
  A Listed format (FCStd/SCAD) shows "preview not available" because
  Bella doesn't support the format at all — an expected, known gap. A
  Renderable-format file (STL, OBJ, 3MF, STEP) that fails to parse shows a
  different error state ("Couldn't load — file may be corrupted") because
  Bella _does_ claim to support it and something went wrong.

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
