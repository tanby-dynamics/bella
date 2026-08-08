export interface DriveInfo {
  path: string
  label?: string
}

export interface DriveLister {
  listDrives(): Promise<DriveInfo[]>
}

export interface Location {
  name: string
  path: string
}

function nameFromPath(path: string): string {
  // "C:\\" -> "C:", "/Volumes/External" -> "External"
  const trimmed = path.replace(/[\\/]+$/, '')
  const segments = trimmed.split(/[\\/]/)
  return segments[segments.length - 1] || trimmed
}

export async function enumerateLocations(lister: DriveLister): Promise<Location[]> {
  const drives = await lister.listDrives()
  return drives.map((drive) => ({
    name: drive.label ?? nameFromPath(drive.path),
    path: drive.path
  }))
}
