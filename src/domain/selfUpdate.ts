/** Whether self-update (silent download + restart-to-install) is supported
 * for the build currently running - Windows NSIS and Linux AppImage only.
 * macOS requires a signed, notarized app for Gatekeeper to allow it, and no
 * certificate exists yet. See ADR 0003.
 *
 * Linux ships three packaging formats (AppImage, deb, snap - see
 * electron-builder.yml), but electron-updater's Linux support only covers
 * AppImage; deb/snap installs update via their own package manager instead.
 * The AppImage runtime sets the APPIMAGE env var when launched from a
 * packaged AppImage, which is how this distinguishes the three - checking
 * `platform === 'linux'` alone would wrongly treat deb/snap installs as
 * self-updatable. */
export function canSelfUpdate(platform: NodeJS.Platform, appImageEnv: string | undefined): boolean {
  if (platform === 'win32') return true
  if (platform === 'linux') return Boolean(appImageEnv)
  return false
}
