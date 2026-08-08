# Bella

Bella is a simple, cross-platform (Windows/macOS/Linux) desktop app for
browsing the filesystem and previewing CAD files in a 3D viewer. v1 renders
`.stl` files; STEP/FCStd/SCAD files are recognized in the file browser but
not yet rendered.

See [CONTEXT.md](CONTEXT.md) for the project's domain glossary
(Renderable/Listed format, Location, Favorite, Render mode, ...) — use that
vocabulary in code, commits, and issues rather than drifting to synonyms.

## Tech stack

- [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/) for the app shell and build tooling
- React + TypeScript for the renderer UI
- [Three.js](https://threejs.org/) for the 3D viewer
- [Vitest](https://vitest.dev/) for the domain-layer test suite
- ESLint + Prettier for linting/formatting

## Prerequisites

- Node.js 20+ and npm

## Setup

```bash
npm install
```

## Development

```bash
npm run dev          # launch the app with hot reload
```

## Scripts

| Script                                            | What it does                                       |
| ------------------------------------------------- | -------------------------------------------------- |
| `npm run dev`                                     | Launch the app in development mode (hot reload)    |
| `npm test`                                        | Run the domain-layer test suite once               |
| `npm run test:watch`                              | Run the domain-layer test suite in watch mode      |
| `npm run typecheck`                               | Typecheck the main/preload and renderer projects   |
| `npm run lint`                                    | Lint the whole repo                                |
| `npm run format`                                  | Format the whole repo with Prettier                |
| `npm run build`                                   | Typecheck, test, then build the app for production |
| `npm run build:win` / `build:mac` / `build:linux` | Build a platform installer via electron-builder    |
| `npm start`                                       | Preview a production build                         |

## Project structure

```
src/
  domain/      Pure Node/TypeScript domain layer - no Electron, React, or
               Three.js dependency. Format classification, folder listing,
               STL parsing, drive enumeration, and the favorites/settings
               store, each behind an injectable interface (DirectoryReader,
               DriveLister, StoreBackend). This is the project's one test
               seam - see src/domain/*.test.ts - and the layer every new
               CAD format or filesystem behaviour should be added to first.
  main/        Electron main process. Wires real adapters (src/main/adapters/,
               using node:fs, OS drive listing, a local JSON config file) to
               the domain layer and exposes them to the renderer over IPC.
               Owns all filesystem access - the renderer never touches fs
               directly.
  preload/     contextBridge boundary exposing a typed `window.api` to the
               renderer.
  renderer/    React UI: sidebar (Favorites/Locations), file grid, the
               Three.js preview panel (render modes, orbit/zoom), metadata
               panel, and settings.
  shared/      Types shared across the IPC boundary (channel names, result
               shapes).
```

## Testing philosophy

Automated tests target the domain layer only, as plain Node tests with no
Electron process and no rendering/WebGL context involved (`npm test`).
They assert the domain layer's observable outputs (what `listFolder`,
`parseRenderable`, `enumerateLocations`, and the store return or persist),
not internal implementation details.

Deliberately **not** covered by automated tests: Three.js rendering,
drag-to-orbit/scroll-to-zoom input handling, Electron IPC wiring, and
native "open with default app" behaviour - that's UI/OS integration glue,
verified by running the app rather than by unit test.

## Working on this repo

- Issues live in GitHub Issues for `tanby-dynamics/bella` — see
  [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md).
- Domain terminology and architectural decisions are tracked in
  [CONTEXT.md](CONTEXT.md) and `docs/adr/` (created as needed) — see
  [docs/agents/domain.md](docs/agents/domain.md).
