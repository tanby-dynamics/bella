<!-- Don't put a top level h1 in this file - it messes up the dialog. -->
<!--
Keep-a-Changelog-style, newest entry first: `## v<semver> - <date>`.
Update this file (add a new entry at the top) in the same PR/commit that
gets tagged for a release - the release workflow fails the build if this
file's top entry doesn't match the pushed tag. See ADR 0002.
-->

## v0.3.0 - 2026-08-09

- Configurable accent colors
- Configurable preview render color
- Add preview for OBJ and MTL formats
- Add preview for 3MF format
- Add preview for STEP format
- Load files on background thread
- Don't trigger a reload when clicking an already selected file
- Add "Open in Explorer" to preview header

## v0.2.0 - 2026-08-08

- Consolidate directory and file views into the location pane
- Make the location pane resizable
- Remove the header toolbar
- Hide hidden and dotfiles and directories
- Hide all non-renderable files
- Move favorite flagging into context menu
- Remove default render mode configuration setting and remember the last selected render mode in the preview
- Remove floaty animation in the preview

## v0.1.2 - 2026-08-08

- Fix Linux build

## v0.1.1 - 2026-08-08

- Fix icons

## v0.1.0 - 2026-08-08

- Browse the filesystem and preview STL files in an interactive 3D viewer
  (shaded, wireframe, and x-ray render modes).
- Locations tree and Favorites sidebar for quick navigation.
- Sortable, resizable file list.
- Light/dark/system theme and configurable default render mode.
- App version shown in the footer, with in-app release notes and automatic
  update checks.
