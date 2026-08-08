/** Joins a folder path and an entry name using whichever path separator
 * the folder path already uses - backslash for Windows-style paths
 * (`C:\`, `C:\Users`), forward slash otherwise (`/Volumes`, `/mnt/data`).
 * Both listFolder and listSubfolders build entry paths by appending to a
 * parent path, and a hardcoded `/` would mix separators once the parent
 * came from a Windows drive root (`C:\` + `/Users` = `C:\/Users`) -
 * harmless to Node's fs calls, but it corrupts separator-sensitive
 * parsing done elsewhere, e.g. pathSegments' path-to-segments split. */
export function joinPath(folderPath: string, name: string): string {
  const sep = folderPath.includes('\\') ? '\\' : '/'
  return folderPath.endsWith(sep) ? `${folderPath}${name}` : `${folderPath}${sep}${name}`
}
