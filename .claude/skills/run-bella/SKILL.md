---
name: run-bella
description: Build, launch, and drive the Bella Electron desktop app via Playwright. Use when asked to start Bella, take a screenshot of it, or verify a UI change actually works in the running app (not just tests).
---

Bella is an Electron desktop app. There's no GUI test harness in the repo
otherwise, so this drives it directly with `playwright-core`'s `_electron`
launcher against a real window - no xvfb needed, this runs on a real
Windows desktop session.

All paths below are relative to the repo root.

## Build

```bash
npx electron-vite build
```

Rebuild after any renderer/main/preload source change - the driver
launches the compiled `out/`, not the source directly.

## Run (agent path)

This machine has no `tmux`, so don't reach for the send-keys/capture-pane
pattern. Instead, `driver.mjs` is a plain ES module - import the pieces
you need into a throwaway `.mjs` script at the repo root and drive it
directly, awaiting each step (each Playwright call already waits for its
own completion, so no arbitrary sleeps are needed beyond letting the
renderer's async init settle after `launch()`):

```js
// scratch-check.mjs (repo root - delete when done, don't commit)
import { launch, clickText, clickBreadcrumb, breadcrumbText, fileListNames, ss, quit } from
  './.claude/skills/run-bella/driver.mjs'

await launch()
await new Promise((r) => setTimeout(r, 1000)) // let startup navigation settle
console.log(await breadcrumbText())
console.log(await clickBreadcrumb(1))
console.log(await breadcrumbText(), await fileListNames())
await ss('after-click')
await quit()
```

```bash
node scratch-check.mjs
```

Screenshots land in `.playwright-shots/` (override: `SCREENSHOT_DIR`).

Delete the throwaway script when done; don't commit it. **Every
`navigate()` call in the running app persists to the user's real
`bella-config.json`** (`lastOpenedFolder`) - if your scenario navigates
around, check that file afterward (`%APPDATA%\bella\bella-config.json`)
and restore it if you've left the user's app pointed somewhere they
weren't.

### Exports (agent path) / REPL commands (human path)

Same underlying behavior either way - `import { launch } from '...'` in a
script, or type `launch` at the `driver>` prompt.

| export | REPL command | what it does |
|---|---|---|
| `launch()` | `launch` | build check + launch the app, wait for the main window |
| `ss(name?)` | `ss [name]` | screenshot → `.playwright-shots/<name>.png` |
| `click(sel)` | `click <css-sel>` | click element (DOM `.click()`, not coordinates) |
| `clickText(text)` | `click-text <text>` | click button/link/span whose text matches or contains it |
| `clickBreadcrumb(i)` | `click-breadcrumb <index>` | click the Nth toolbar breadcrumb segment (0-indexed) |
| `breadcrumbText()` | - | array of current breadcrumb segment labels |
| `fileListNames()` | - | array of file names currently shown in the file list pane |
| `evalPage(expr)` | `eval <js>` | evaluate expression in the page, return the value |
| `text(sel?)` | `text [css-sel]` | `innerText` of an element (or `body`) |
| `windows()` | `windows` | list all windows + webContents (for finding the real UI) |
| `quit()` | `quit` | close the app |

REPL-only (keyboard input, no return value needed): `type <text>`,
`press <key>`, `wait <css-sel>` (10s timeout). Use `page.keyboard` /
`page.waitForSelector` directly from an agent script instead.

Useful selectors in this app: `.sidebar__tree-label` (Locations tree node
labels - click navigates), `.toolbar__breadcrumb-link` /
`.toolbar__breadcrumb-current` (breadcrumb segments), `.file-list__row`
(file rows), `.file-list__name-text` (file name text within a row).

## Run (human path)

```bash
npm start   # electron-vite preview - opens a window against the last build
# or
npm run dev # electron-vite dev - hot reload, dev server
```

## Gotchas

- **`ELECTRON_RUN_AS_NODE=1` is set in this shell environment.** It makes
  `electron.exe` boot as plain Node instead of the Electron app framework
  - `electron.app` comes back `undefined` and the app throws
  ("Cannot read properties of undefined (reading 'isPackaged')") before
  any window opens. The driver strips this env var for the launched
  child process only; if you write your own one-off script, do the same:
  `const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE`.
- **No clean "app ready" signal.** `launch` polls for a non-devtools
  window for up to 20s rather than a blind sleep, since the renderer does
  async init (load settings, navigate to the last-opened folder) before
  there's anything meaningful to interact with.
- **Native GPU/network service warnings on launch are normal noise**
  (`GPU process exited unexpectedly`, `Network service crashed,
  restarting`) - harmless in this environment, the window still renders.

## Troubleshooting

- **Launch timeout / immediate crash with `isPackaged` undefined:** see
  the `ELECTRON_RUN_AS_NODE` gotcha above.
- **`out/main/index.js` missing:** run the Build step first.
- **Stale UI after a source change:** the driver launches `out/`, not
  live source - rebuild before relaunching.
