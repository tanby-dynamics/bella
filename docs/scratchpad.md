# Scratchpad

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
- [ ] Two related features:
	- Add versioning and release notes to the application. I want to have a list of release notes that are easy to append to before pushing the new version - if possible a markdown file that I can maintain, that gets rendered to a view within the app. Show version number in footer - click version number to view release notes. Add GH action to build installers - I want to use git tags with the version number to trigger the GH action.
	- Automatic application updates. On startup, show a nag window if there is a new version. Click to download and install the new version. Add a configurable setting to enable/disable checking for new version on startup - default to enabled.
	- [x] spec
	- [ ] implement
	- [ ] manual test
	- [ ] merge
- [ ] Style scroll bars in the directory nav and files view to match the theme - similar to VS Code in dark mode
	- [ ] implement
	- [ ] manual test
	- [ ] commit
- [ ] Current location bar should be presented like "C: > Documents > etc > Current" and each location should be selectable - nav to that location
	- [ ] spec
	- [ ] implement
	- [ ] manual test
	- [ ] commit
- [ ] Save window position between restarts - make sure the window won't be offscreen when it's position is restored
	- [ ] spec
	- [ ] implement
	- [ ] test
	- [ ] merge
- [ ] Make directory pane and file pane resizable - remember the current widths between restarts
	- [ ] spec
	- [ ] implement
	- [ ] test 
	- [ ] merge
- [ ] 
- [ ] Configurable accent colors - defaults of `#f5a623 #4fd1c5 #ff8a9d #9aa3ff` or assign your own
- [ ] Configurable render colour - defaults of `#f5a623 #4fd1c5 #ff8a9d #9aa3ff` or assign your own. Note that this shouldn't override colors specified in the previewed file - if the file is in a format that has colors the preview should use those colors
- [ ] Implement OBJ and MTL formats
- [ ] Implement 3MF format
- [ ] Implement STEP format - https://github.com/kovacsv/occt-import-js
- [ ] Implement FreeCAD's `.FCStd` format
- [ ] Marketing site - bella.tanbydynamics.co
- [ ] Code signing for macOS
- [ ] Code signing for Windows
- [ ] 
- [ ] 


1. agreed
2. agreed
3. agreed






