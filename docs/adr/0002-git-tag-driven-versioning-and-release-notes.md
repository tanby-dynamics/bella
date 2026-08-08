# Git-tag-driven versioning with release-notes.md as the source of truth

Bella's shipped Version needs to come from somewhere unambiguous, and
Release Notes need somewhere to live that serves both the GitHub Release
page and Bella's own in-app history view. We decided the git tag
(`vX.Y.Z`) pushed to cut a release is the single source of truth for the
Version — the tag-triggered GitHub Action injects it into the build via
electron-builder's `extraMetadata` override, and `package.json`'s committed
`version` field is left as a static placeholder that's never bumped for a
release. We considered bumping `package.json` by hand and tagging to match
it instead, but that adds a manual step that can drift from the tag it's
meant to mirror.

For Release Notes, we considered GitHub's auto-generated PR notes and
hand-typing notes directly into each GitHub Release, but instead settled on
a hand-maintained `release-notes.md` in the repo (Keep-a-Changelog style,
newest entry first) as the single source: it's authored via normal PR
review before tagging, gets bundled into the app at build time and rendered
in-app with no network call, and the release workflow extracts the
matching section to prefill the draft GitHub Release's body — so the two
surfaces never say different things.

## Consequences

- `package.json`'s `version` field is cosmetic outside of CI-built
  releases — don't expect `app.getVersion()` in a local dev build to
  reflect it meaningfully.
- Cutting a release requires updating `release-notes.md` in the same
  change that gets tagged — the release workflow enforces this by failing
  the build if the top heading doesn't match the tag.
- Because notes are bundled at build time, the in-app history view only
  ever reflects what shipped in that build — it never fetches newer
  entries mid-session.
