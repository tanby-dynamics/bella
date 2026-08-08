// Driver for Bella (Electron desktop app), Windows-native, no xvfb/tmux
// needed - this runs a real window on a real Windows desktop session.
//
// Two ways to use it:
//   1. Agent path (recommended on this machine - no tmux available):
//      import { launch, click, clickText, ss, quit, page } from this file
//      into a throwaway .mjs script and drive it directly. See SKILL.md
//      for a worked example.
//   2. Human path: `node driver.mjs` starts an interactive REPL on stdin.
import { _electron as electron } from 'playwright-core'
import * as readline from 'node:readline'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_DIR = path.resolve(__dirname, '../../..')
const SHOT_DIR = process.env.SCREENSHOT_DIR || path.join(APP_DIR, '.playwright-shots')

const electronBin = path.join(APP_DIR, 'node_modules/electron/dist/electron.exe')

export let app = null
export let page = null

export async function launch() {
  if (app) return app
  if (!fs.existsSync(path.join(APP_DIR, 'out/main/index.js'))) {
    throw new Error('out/main/index.js missing - run `npx electron-vite build` first')
  }
  // This shell often has ELECTRON_RUN_AS_NODE=1 set (tooling elsewhere
  // relies on it) - that forces the electron.exe binary to boot as plain
  // Node instead of the Electron app framework, so `electron.app` comes
  // back undefined and the app throws before any window opens. Strip it
  // for this child process only.
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  app = await electron.launch({
    executablePath: electronBin,
    args: [APP_DIR],
    env,
    timeout: 30_000
  })
  // Electron has no clean "ready" signal from here - poll for the main
  // window instead of a blind sleep, since the renderer does async init
  // (settings load, last-opened-folder navigate) before content is
  // meaningful to interact with.
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    const w = app.windows().find((w) => !w.url().startsWith('devtools://'))
    if (w) {
      page = w
      break
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  if (!page) throw new Error('no window appeared within 20s')
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  return app
}

export async function ss(name) {
  if (!page) throw new Error('launch first')
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + '.png')
  await page.screenshot({ path: f })
  return f
}

// DOM click, not locator.click() - avoids any coordinate mismatch and
// works the same regardless of window chrome/DPI scaling on Windows.
export async function click(sel) {
  if (!page) throw new Error('launch first')
  return page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el) return 'NOT_FOUND'
    el.click()
    return 'OK'
  }, sel)
}

export async function clickText(text) {
  if (!page) throw new Error('launch first')
  return page.evaluate((t) => {
    const els = [...document.querySelectorAll('button, a, [role="button"], span')]
    const el =
      els.find((e) => e.textContent?.trim() === t) ?? els.find((e) => e.textContent?.includes(t))
    if (!el) return 'NOT_FOUND'
    el.click()
    return 'OK: ' + el.tagName
  }, text)
}

// Bella-specific: file rows now render inline in the Locations tree
// (ADR 0004 folded the old separate file list panel into it) - this
// returns the names of file rows currently visible (i.e. under an
// expanded folder), not the whole tree.
export async function treeFileNames() {
  if (!page) throw new Error('launch first')
  return page.evaluate(() =>
    [...document.querySelectorAll('.sidebar__tree-file .sidebar__tree-file-name')].map((r) =>
      r.textContent.trim()
    )
  )
}

export async function evalPage(expr) {
  if (!page) throw new Error('launch first')
  return page.evaluate(expr)
}

export async function text(sel) {
  if (!page) throw new Error('launch first')
  return page.evaluate(
    (s) => (s ? document.querySelector(s) : document.body)?.innerText ?? '(null)',
    sel || null
  )
}

export async function windows() {
  if (!app) throw new Error('launch first')
  const wcs = await app.evaluate(({ webContents }) =>
    webContents.getAllWebContents().map((w) => ({ id: w.id, type: w.getType(), url: w.getURL() }))
  )
  return { windows: app.windows().map((w) => w.url()), webContents: wcs }
}

export async function quit() {
  if (app) await app.close().catch(() => {})
  app = null
  page = null
}

// --- REPL (human interactive path) ---
// Only runs when this file is executed directly, not when imported.
if (
  import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
  import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`
) {
  const COMMANDS = {
    async launch() {
      await launch()
      console.log('launched.', app.windows().length, 'windows:')
      for (const w of app.windows()) console.log(' ', w.url())
    },
    async ss(name) {
      console.log('screenshot:', await ss(name))
    },
    async click(sel) {
      console.log('click', sel, '→', await click(sel))
    },
    async 'click-text'(t) {
      console.log('click-text', JSON.stringify(t), '→', await clickText(t))
    },
    async type(t) {
      if (page) await page.keyboard.type(t, { delay: 30 })
    },
    async press(k) {
      if (page) await page.keyboard.press(k)
    },
    async wait(sel) {
      try {
        await page.waitForSelector(sel, { timeout: 10_000 })
        console.log('found:', sel)
      } catch {
        console.log('TIMEOUT:', sel)
      }
    },
    async eval(expr) {
      try {
        console.log(JSON.stringify(await evalPage(expr)))
      } catch (e) {
        console.log('ERROR:', e.message)
      }
    },
    async text(sel) {
      console.log(await text(sel))
    },
    async windows() {
      const w = await windows()
      console.log('windows:')
      for (const u of w.windows) console.log(' ', u)
      console.log('webContents:')
      for (const wc of w.webContents) console.log(` [${wc.id}] ${wc.type}: ${wc.url}`)
    },
    async quit() {
      await quit()
    },
    help() {
      console.log('commands:', Object.keys(COMMANDS).join(', '))
    }
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'driver> '
  })

  rl.on('line', async (line) => {
    const [cmd, ...rest] = line.trim().split(/\s+/)
    if (!cmd) return rl.prompt()
    const fn = COMMANDS[cmd]
    if (!fn) {
      console.log('unknown:', cmd, '— try: help')
      return rl.prompt()
    }
    try {
      await fn(rest.join(' '))
    } catch (e) {
      console.log('ERROR:', e.message)
    }
    if (cmd === 'quit') {
      rl.close()
      process.exit(0)
    }
    rl.prompt()
  })
  rl.on('close', async () => {
    await quit()
    process.exit(0)
  })

  console.log('bella driver — "help" for commands, "launch" to start')
  rl.prompt()
}
