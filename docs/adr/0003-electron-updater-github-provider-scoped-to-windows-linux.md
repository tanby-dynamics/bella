# Auto-update via electron-updater's GitHub provider, scoped to Windows/Linux until signed

Bella needs a way to check for and install updates without standing up
separate infrastructure. Since the repo is public on GitHub and the release
workflow already publishes installers there, we chose electron-updater's
built-in GitHub provider over a generic/self-hosted update server — it
reads the same published Releases directly, no extra hosting.

However, no code-signing certificate exists yet for Windows or macOS.
electron-updater's silent download-and-restart flow works fine unsigned on
Windows (just a SmartScreen warning) and Linux (AppImage has no signing
expectation), but macOS's Gatekeeper blocks an unsigned app from
self-updating at all. Rather than block the whole feature on acquiring an
Apple Developer certificate, we scoped self-update to Windows and Linux
only; macOS still runs Update Checks and shows the Update Prompt, but its
action opens the GitHub Releases page in the browser for a manual install.

## Consequences

- Getting a Mac code-signing certificate later would let macOS self-update
  the same way — that's follow-up work, not part of this change.
- All installers ship unsigned for now — expect SmartScreen/Gatekeeper
  friction until certificates are added.
