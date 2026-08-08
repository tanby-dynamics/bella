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
- [ ] Remove the file list panel and move files into the location tree. It should work like VS Code's EXPLORER panel - lean on that for expected behaviour. For example, remove icons for directories, but leave them for files. 
	- [x] grill
	- [x] spec
	- [ ] implement
	- [ ] manual tests
	- [ ] release note
	- [ ] merge
- [ ] Hide hidden directories and files, dotfiles (files and directories), and non-recognised file types and dotfiles
	- [ ] spec
	- [ ] implement
	- [ ] manual tests 
	- [ ] release note
	- [ ] merge
- [ ] Release v0.2.0
- [ ] Test auto-update
- [ ] Configurable accent colors - defaults of `#f5a623 #4fd1c5 #ff8a9d #9aa3ff` or assign your own (hex code and color picker)
- [ ] Configurable render colour - defaults of `#f5a623 #4fd1c5 #ff8a9d #9aa3ff` or assign your own (hex code and color picker). Note that this shouldn't override colors specified in the previewed file - if the file is in a format that has colors the preview should use those colors
- [ ] Implement OBJ and MTL formats
	- [ ] spec
	- [ ] implement
	- [ ] test 
	- [ ] release note
	- [ ] merge
- [ ] Implement 3MF format
	- [ ] spec
	- [ ] implement
	- [ ] test 
	- [ ] release note
	- [ ] merge
- [ ] Implement STEP format - https://github.com/kovacsv/occt-import-js
	- [ ] spec
	- [ ] implement
	- [ ] test 
	- [ ] release note
	- [ ] merge
- [ ] Implement FreeCAD's `.FCStd` format
	- [ ] spec
	- [ ] implement
	- [ ] test 
	- [ ] release note
	- [ ] merge
- [ ] Release v0.3.0
- [ ] Marketing site - bella.tanbydynamics.co
- [ ] Code signing for macOS
	- [ ] What do I have to do  to set up code signing for macOS?
- [ ] Code signing for Windows
	- [ ] What do I have to do  to set up code signing for Windows?
- [ ] 
- [ ] 








