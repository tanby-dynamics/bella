# File panel lists files only; folder navigation moves to the Locations tree

The Locations sidebar is becoming a hierarchical, lazily-expandable tree
(previously a flat list of OS roots). We decided the file panel should stop
showing folders and stop being a navigation control — clicking into a
subfolder now happens exclusively via the tree, not by clicking a folder
row in the file panel. We considered keeping a single `listFolder` used
everywhere and filtering out directories client-side for the panel, but
instead split file listing by purpose at the domain layer: one function
returns files only (for the panel), a separate function returns immediate
subfolders only (for tree expansion). We picked the domain-layer split
because "the file panel shows only files" is a domain rule, not a rendering
choice, and a client-side filter would let any future consumer of
`listFolder` accidentally reintroduce folder rows into a files-only view.

## Consequences

- The file panel's selection/click handling no longer needs to branch on
  `isDirectory` — every row it renders is a file.
- The Locations tree owns all folder-to-folder navigation, including "up"
  (via the breadcrumb, which only jumps to ancestors already known from
  the current path — it does not query the domain layer).
- Adding a feature that needs folders-and-files together (e.g. future file
  management) will need to compose both domain functions rather than reuse
  a single one — an accepted cost in exchange for the files-only guarantee
  holding by construction rather than by convention.
