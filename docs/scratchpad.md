# Scratchpad

## 20260810

- [ ] Fix auto update
- [ ] Add preview for FreeCAD's format
	- [x] Prompt: Implement preview for FreeCAD's `.FCStd` format
	- [x] Spec
	- [ ] implement https://github.com/tanby-dynamics/bella/issues/8
	- [ ] test
	- [ ] release note
	- [ ] commit
- [x] Move to "Project" management model
	- [x] Grilling prompt: Move from a "show the entire file system" model to a "Project" management model. Replace "FAVORITES" with "PROJECTS", and add a way to select a directory (using the system dialog) as a new project. Selecting a project should show the contents of the project directory within the location tree, with the root of the tree being the project directory. The currently selected project should be remembered between restarts, as should the selected file and state of the location tree, including the scroll position.
	- [x] Spec
	- [x] implement
	- [x] Prompt: This is a substantial refinement. Selecting a project should open the tree immediately below the project instead of as a separate tree, so that the project is displayed as the root of the tree. Keep the behaviour where selecting a project deselects the previous project, so the deselected project tree would be collapsed and replaced by the new project tree.
	- [x] manual  test
	- [x] release note
	- [ ] merge
- [ ] Release v0.3.0
- [ ] Marketing site - bella.tanbydynamics.co
- [ ] Code signing for macOS
	- [ ] What do I have to do to set up code signing for macOS?
- [ ] Code signing for Windows
	- [x] What do I have to do to set up code signing for Windows? don't do anything yet, I'm just querying what the actual, manual process looks like.
- [ ] Tabbed preview
	- [ ] Prompt: I want to be able to open multiple previews via tabs. This should work similarly to VS Code's tabbing - single clicking a file opens the preview in a transient tab with the file name italicised, double clicking the file or double clicking the tab changes the tab to persistent (non-italicised). Opening a file's preview with a transient tab present closes the transient tab and replaces it with the new preview tab. Click the x or middle click the tab to close it. Tabs should be re-orderable by dragging and dropping. No support for splitting at the moment - only a single preview will actually be visible at a time.
	- [ ] spec
	- [ ] implement
	- [ ] test
	- [ ] release note
	- [ ] merge
- [ ] Drag and drop reordering of projects
	- [ ] Prompt: xxx
	- [ ] spec
	- [ ] implement
	- [ ] test
	- [ ] release note
	- [ ] merge
- [ ] Preview PNG, GIF, and JPEG files
	- [ ] Prompt: xxx
	- [ ] spec
	- [ ] implement
	- [ ] test
	- [ ] release note
	- [ ] merge
- [ ] Preview .md and .txt files
	- [ ] Prompt: xxx
	- [ ] implement
	- [ ] test
	- [ ] release note
	- [ ] merge
- [ ] Support collapsing "FAVORITES" and "LOCATIONS" sections
	- [ ] Prompt: xxx
	- [ ] spec
	- [ ] implement
	- [ ] test
	- [ ] release note
	- [ ] merge
- [ ] Scroll  "FAVORITES" and "LOCATIONS" sections independently
	- [ ] Prompt: xxx
	- [ ] spec
	- [ ] implement
	- [ ] test
	- [ ] release note
	- [ ] merge
- [ ] Release v0.4.0
- [ ] Cache recent parsed models
	- [ ] Prompt: Cache the last N parsed models (configurable, default to 10) so selecting a cached model is faster. Add a file system watcher so that if a cached model changed it is removed from the cache. If the model that is changed is currently displayed, reload the displayed model.
	- [ ] spec
	- [ ] implement
	- [ ] test
	- [ ] release note
	- [ ] merge

## 20260809

- [x] Configurable accent colors
  - [x] Prompt: I want to be able to configure the accent color - the color that is used across the application for accents - preset defaults of `#f5a623 #4fd1c5 #ff8a9d #9aa3ff` or assign your own (hex code and color picker). NOte that this is _not_ a per-file type accent - there is only one accent color used across the application.
  - [x] implement
  - [x] manual tests
  - [x] release note
  - [x] commit
- [x] Pre-release script
  - [x] prompt: Add a pre-release script to `package.json` like `npm run prerelease` that runs all tests and performs linting
  - [x] implement
  - [x] test
  - [x] commit
- [x] Configurable render colour
  - [x] Prompt: Configurable preview render colour. Similar to accent color selection - defaults of `#f5a623 #4fd1c5 #ff8a9d #9aa3ff` or assign your own (hex code and color picker). Note this shouldn't override colors specified in the previewed file - if the file is in a format that supports defining colors the preview should use those colors.
  - [x] implement
  - [x] manual tests
  - [x] release note
  - [x] commit
- [x] Add preview for OBJ and MTL formats
	- [x] Prompt: Implement preview for OBJ and MTL formats
	- [x] implement
	- [x] test
	- [x] release note
	- [x] merge
- [x] Add preview for 3MF format
	- [x] Prompt: Implement preview for 3MF format
	- [x] implement
	- [x] test
	- [x] release note
	- [x] commit
- [x] Add preview for STEP format
	- [x] Prompt: Implement preview for STEP format using https://github.com/kovacsv/occt-import-js
	- [x] implement
	- [x] test
	- [x] release note
	- [x] commit
- [x] Load files on background thread
	- [x] Prompt: Loading a file should be on a background thread, so the user can select a different file while the current file is loading
	- [x] implement
	- [x] test
	- [x] release note
	- [x] commit
- [x] Don't trigger a reload when clicking an already selected file
	- [x] Prompt: Clicking already selected file shouldn't trigger a reload
	- [x] implement
	- [x] test
	- [x] release note
	- [x] commit
- [ ] Add preview for FreeCAD's format
	- [x] Prompt: Implement preview for FreeCAD's `.FCStd` format
	- [x] Spec
	- [ ] implement https://github.com/tanby-dynamics/bella/issues/8
	- [ ] test
	- [ ] release note
	- [ ] commit
- [x] Add "Open in Explorer" to preview header
	- [x] Prompt: Add "Open in Explorer" to preview header
	- [x] implement
	- [x] test
	- [x] release note
	- [x] commit
- [ ] Move to "Project" management model
	- [x] Grilling prompt: Move from a "show the entire file system" model to a "Project" management model. Replace "FAVORITES" with "PROJECTS", and add a way to select a directory (using the system dialog) as a new project. Selecting a project should show the contents of the project directory within the location tree, with the root of the tree being the project directory. The currently selected project should be remembered between restarts, as should the selected file and state of the location tree, including the scroll position.
	- [x] Spec
	- [x] implement
	- [x] Prompt: This is a substantial refinement. Selecting a project should open the tree immediately below the project instead of as a separate tree, so that the project is displayed as the root of the tree. Keep the behaviour where selecting a project deselects the previous project, so the deselected project tree would be collapsed and replaced by the new project tree.
	- [ ] 
	- [x] manual  test
	- [x] release note
	- [ ] merge
- [ ] Release v0.3.0
- [ ] Marketing site - bella.tanbydynamics.co
- [ ] Code signing for macOS
	- [ ] What do I have to do to set up code signing for macOS?
- [ ] Code signing for Windows
	- [ ] What do I have to do to set up code signing for Windows? don't do anything yet, I'm just querying what the actual, manual process looks like.
- [ ] Tabbed preview
	- [ ] Prompt: I want to be able to open multiple previews via tabs. This should work similarly to VS Code's tabbing - single clicking a file opens the preview in a transient tab with the file name italicised, double clicking the file or double clicking the tab changes the tab to persistent (non-italicised). Opening a file's preview with a transient tab present closes the transient tab and replaces it with the new preview tab. Click the x or middle click the tab to close it. Tabs should be re-orderable by dragging and dropping. No support for splitting at the moment - only a single preview will actually be visible at a time.
	- [ ] spec
	- [ ] implement
	- [ ] test
	- [ ] release note
	- [ ] merge
- [ ] Drag and drop reordering of favorites
	- [ ] Prompt: xxx
	- [ ] spec
	- [ ] implement
	- [ ] test
	- [ ] release note
	- [ ] merge
- [ ] Preview PNG, GIF, and JPEG files
	- [ ] Prompt: xxx
	- [ ] spec
	- [ ] implement
	- [ ] test
	- [ ] release note
	- [ ] merge
- [ ] Preview .md and .txt files
	- [ ] Prompt: xxx
	- [ ] implement
	- [ ] test
	- [ ] release note
	- [ ] merge
- [ ] Support collapsing "FAVORITES" and "LOCATIONS" sections
	- [ ] Prompt: xxx
	- [ ] spec
	- [ ] implement
	- [ ] test
	- [ ] release note
	- [ ] merge
- [ ] Scroll  "FAVORITES" and "LOCATIONS" sections independently
	- [ ] Prompt: xxx
	- [ ] spec
	- [ ] implement
	- [ ] test
	- [ ] release note
	- [ ] merge
- [ ] Release v0.4.0
- [ ] Cache recent parsed models
	- [ ] Prompt: Cache the last N parsed models (configurable, default to 10) so selecting a cached model is faster. Add a file system watcher so that if a cached model changed it is removed from the cache. If the model that is changed is currently displayed, reload the displayed model.
	- [ ] spec
	- [ ] implement
	- [ ] test
	- [ ] release note
	- [ ] merge
- [ ] 

1. agreed. Projects should work very similarly to the current Favorites list.
2. agreed
3. There's already a X button for each favorite. Keep the same functionality, but add a context menu to project entries with "Remove Project"
4. agreed
5. agreed, per-project
6. No, custom project naming makes sense. When a project is created the project name in the list should be editable. Add a context menu item "Rename Project..." which makes the project name editable. Default to the base directory name selected. Also, projects should be re-orderable - new projects always get added to the bottom, but they can be dragged to change their order.---
7. It goes to the bottom, and all projects can be dragged to change their order
8. drop the old favorites data - start from scratch
9. agreed, inline editing
10. drag and drop
11. both
12. agreed
13. agreed, agreed
14. agreed
15. agreed
16. agreed, but whenever opening a path it should eagerly load the subdirectories in that path in the background to make the app feel more responsive.---
17. agreed
18. agreed
19. agreed
20. agreed
21. agreed---
22. agreed
23. agreed
24. agreed






## 20260808

- [x] v1 MVP
  - [x] manual test
  - [x] merge
- [x] "Locations" should be a hierarchical directory browser, while the files panel should only show files
  - [x] spec
  - [x] implement
  - [x] test
  - [x] merge
- [x] Replace the thumbnails view with a list - we're dropping the thumbnails view as it doesn't add much value. The file browser list should be similar to Windows Explorer's list view - "Name", "Date modified", "Type", and "Size" columns. The columns should be sortable, and the sort selection should be remembered when navigating to other directories and persisted between application startups
  - [x] spec
  - [x] implement
  - [x] manual test
- [x] Application icon - I've got icons in the `build` folder, I want them to be used for the application's title icon
  - [x] implement
  - [x] manual test
  - [x] commit
- [x] Add a button to the Settings screen to "Reset configuration" - show a confirmation dialog, then clear all of the stored configuration and apply it immediately
  - [x] implement
  - [x] manual test
  - [x] commit
- [x] Two related features:
  - Add versioning and release notes to the application. I want to have a list of release notes that are easy to append to before pushing the new version - if possible a markdown file that I can maintain, that gets rendered to a view within the app. Show version number in footer - click version number to view release notes. Add GH action to build installers - I want to use git tags with the version number to trigger the GH action.
  - Automatic application updates. On startup, show a nag window if there is a new version. Click to download and install the new version. Add a configurable setting to enable/disable checking for new version on startup - default to enabled.
  - [x] spec
  - [x] implement
  - [x] manual test
  - [x] merge
- [x] Release 0.1.0
- [x] Fix icons
- [x] Release 0.1.1
- [x] Fix linux release
- [x] Release 0.1.2
- [x] Test installer on Windows
- [x] Style the scroll bars in the directory nav and files view to match the theme - similar to VS Code in dark mode
  - [x] implement
  - [x] manual test
  - [x] release note
  - [x] commit
- [x] Current location bar should be presented like "C: > Documents > etc > Current" and each node should be selectable - nav to that location
  - [x] implement
  - [x] manual test
  - [x] release note
  - [x] commit
- [x] Remove the file list panel and move files into the location tree. It should work like VS Code's EXPLORER panel - lean on that for expected behaviour. For example, remove icons for directories, but leave them for files.
  - [x] grill
  - [x] spec
  - [x] implement
  - [x] manual tests
  - [x] release note
  - [x] merge
- [x] Remove the toolbar - the breadcrumbs and the Settings button. Replace the Settings button with a link "Settings" to the left of the version in the status bar - it should look like "Settings · v0.2.0". Breadcrumbs won't be replaced, you can remove all of the code that supported breadcrumbs.
  - [x] implement
  - [x] manual tests
  - [x] release note
  - [x] merge
- [x] Hide hidden directories and files, dotfiles (files and directories), and non-renderable file types
  - [x] implement
  - [x] manual tests
  - [x] release note
  - [x] commit
- [ ] Reimplement adding favs
  - [x] prompt: Add a right-click context menu to directory entries in the sidebar. Single entry - "Make favorite". If the directory is already a favorite the entry should be "Unfavorite". Remove the "+" add favorite button that's next to the "FAVORITES" label. Add a "-" remove favorite button next to each favorite entry.
  - [x] implement
  - [x] manual tests
  - [x] release note
  - [x] commit
- [x] Remove default render mode configuration setting and remember the last selected render mode in the preview
  - [x] Prompt: Remove the "Default render mode" configuration setting and remember the last selected render mode in the preview
  - [x] implement
  - [x] manual tests
  - [x] release note
  - [x] commit
- [x] Remove floaty animation in the preview
  - [x] Prompt: Remove floaty animation in the preview - changing the preview with the mouse should take effect immediately
  - [x] implement
  - [x] manual tests
  - [x] release note
  - [x] commit
- [x] Release v0.2.0
- [x] Test auto-update
