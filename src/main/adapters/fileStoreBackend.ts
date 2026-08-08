import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { StoreBackend, StoreData } from '../../domain'

function configPath(): string {
  return join(app.getPath('userData'), 'bella-config.json')
}

/** Real local-app-config-file implementation of the domain layer's StoreBackend seam. */
export const fileStoreBackend: StoreBackend = {
  async read() {
    try {
      const raw = await readFile(configPath(), 'utf8')
      return JSON.parse(raw) as StoreData
    } catch {
      return undefined
    }
  },

  async write(data) {
    await mkdir(app.getPath('userData'), { recursive: true })
    await writeFile(configPath(), JSON.stringify(data, null, 2), 'utf8')
  }
}
