# Future: native OpenSCAD (`.scad`) preview support

Status: **shelved / not scheduled**. Captured so the research doesn't need
redoing when this comes back up. Not an ADR — no decision has been made,
just findings.

**Thought**: Could just assume that OpenSCAD is installed and prompt if it isn't, then just use the existing CLI directly. That would avoid much of the heavy lifting required for embedding OpenSCAD in some way.

## Why this is a bigger lift than it looks

`.scad` currently classifies as a `ListedFormatId` (see `formats.ts`) —
recognized, but no preview, same bucket as FCStd. Every other Renderable
format (STL, OBJ, 3MF, STEP) is **static geometry**: Bella parses or
tessellates bytes that already describe a shape. A `.scad` file is
**source code** for a CSG script — there's no geometry until something
*evaluates* it (CSG unions/differences/intersections, `$fn` resolution,
`for` loops, module calls, etc.). Supporting it isn't "a fifth parser next
to `stepParser.ts`" — it's embedding a geometry compiler, closer in kind
to adding a build step than adding a file format.

## Two implementation paths

**1. Shell out to a bundled OpenSCAD CLI binary**

Run `openscad -o out.stl input.scad` (or `.3mf`) per platform, then feed
the output through the existing STL/3MF parsers.

- Simple integration once the binary runs — reuses the current render
  pipeline entirely.
- Requires bundling real platform binaries (Windows/macOS/Linux, each
  tens of MB, some with their own native deps like Qt/CGAL/Boost) via
  `electron-builder`'s `extraResources`, and spawning a child process —
  a different execution model than the current worker-thread WASM
  pattern, with its own packaging/signing/notarization cost per platform.

**2. In-process WASM build (mirrors `occt-import-js`)**

OpenSCAD has an Emscripten/WASM build (used by the official web
Playground). Architecturally this is the closer fit to what STEP already
does — loaded once as a singleton (`loadOcct`-style), run on the
`parseWorker` thread, preemptible on a new selection the same way STEP
tessellation is today.

- Fits the existing worker/preemption model in `CONTEXT.md` almost
  exactly — no child process, no per-platform binary shipped separately.
- Unlike `occt-import-js`, there isn't a mature, versioned, actively
  maintained npm package for this. Likely means vendoring/building the
  WASM blob from OpenSCAD's own build, or depending on a much less
  battle-tested community package. Real maintenance liability compared to
  the STEP precedent.

Leaning toward (2) for architectural consistency, but it's the less
proven path — worth a small spike before committing either way.

## Dependencies / costs either way

- **License.** OpenSCAD is GPL-2.0-or-later. Bundling its engine (binary
  or WASM) into Bella has real implications for a proprietary/commercial
  build — needs a licensing check independent of the technical work,
  before either path is started.
- **Bundle size.** Both paths add a large blob — tens of MB minimum
  (CGAL/manifold geometry kernel), on top of what STL/OBJ/3MF/STEP
  already cost.
- **Unbounded execution time.** STEP tessellation is CPU-heavy but
  bounded by the shape's own complexity. A SCAD script can contain `for`
  loops, recursive modules, or high `$fn` that make evaluation
  arbitrarily slow or effectively hang. The current worker-thread "kill
  and respawn on new selection" preemption (see CONTEXT.md's parse-worker
  decision) covers *cancellation on reselect* but nothing today protects
  against a single file just never finishing — would likely need a hard
  timeout too.
- **File resolution beyond the selected file.** `include <...>`,
  `use <...>`, and `import(...)` reference other files — often not just
  relative siblings but installed library paths (BOSL2, MCAD, etc.)
  outside the file's own folder, and outside the Active Project's
  browsing scope entirely. A much bigger version of the "OBJ's MTL
  sidecar resolved directly from disk" problem — needs a resolution/
  fallback policy, and a decision on whether a missing include is a
  parse failure or a partial render.
- **Preview vs. Render duality.** OpenSCAD itself distinguishes a fast
  approximate "F5 preview" (OpenCSG, not manifold-correct) from a slow,
  geometrically-correct "F6 render" (CGAL booleans) used for STL export.
  Bella would need the latter to get a mesh worth showing, which is also
  the slower path.
- **Customizer/variables.** SCAD files often expose customizer parameters
  with GUI widgets in the OpenSCAD app itself. Bella has no equivalent —
  would need the same "use the file's own defaults, no interactive
  customizer" scoping call already made for OBJ/3MF (no textures, no
  per-face STEP color).
- **Classification change.** `scad` moves from `ListedFormatId` to
  `RenderableFormatId` (`formats.ts`), which per CONTEXT.md's "Hidden and
  no-preview entries" decision is also what makes `.scad` files start
  appearing in the tree at all — currently they're filtered out before
  they'd ever reach selection.

## If/when this is picked back up

Scope it as its own ADR — worker timeout policy, include-resolution
policy, and licensing sign-off all need explicit decisions before
implementation starts, unlike STEP/3MF which were closer to same-shape
"add a parser" work.
