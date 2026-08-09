import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        // Two entries rather than the default single-entry lib build: a
        // worker_threads entry (parseWorker.ts) alongside the main process
        // itself, so it lands next to index.js in out/main and can be
        // pointed at directly (see parseWorkerClient.ts). See CONTEXT.md's
        // "Background file loading" decision.
        input: {
          index: resolve('src/main/index.ts'),
          parseWorker: resolve('src/main/parseWorker.ts')
        }
      }
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
