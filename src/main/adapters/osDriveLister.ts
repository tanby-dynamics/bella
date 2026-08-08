import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import type { DriveInfo, DriveLister } from '../../domain'

async function listWindowsDrives(): Promise<DriveInfo[]> {
  const drives: DriveInfo[] = []
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    const drivePath = `${letter}:\\`
    if (existsSync(drivePath)) {
      drives.push({ path: drivePath })
    }
  }
  return drives
}

async function listDarwinDrives(): Promise<DriveInfo[]> {
  try {
    const entries = await readdir('/Volumes', { withFileTypes: true })
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({ path: `/Volumes/${entry.name}`, label: entry.name }))
  } catch {
    return []
  }
}

async function listLinuxDrives(): Promise<DriveInfo[]> {
  const drives: DriveInfo[] = [{ path: '/', label: 'Root' }]
  const mountRoots = [`/media/${process.env.USER ?? ''}`, '/mnt']

  for (const root of mountRoots) {
    try {
      const entries = await readdir(root, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          drives.push({ path: `${root}/${entry.name}`, label: entry.name })
        }
      }
    } catch {
      // Mount root doesn't exist or isn't readable - nothing to list there.
    }
  }

  return drives
}

/** Real OS-backed implementation of the domain layer's DriveLister seam. */
export const osDriveLister: DriveLister = {
  async listDrives() {
    switch (process.platform) {
      case 'win32':
        return listWindowsDrives()
      case 'darwin':
        return listDarwinDrives()
      default:
        return listLinuxDrives()
    }
  }
}
