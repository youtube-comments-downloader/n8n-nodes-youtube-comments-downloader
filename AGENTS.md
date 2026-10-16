# AGENTS.md

## Release Rules

- Releases are tag-driven. Pushing an `X.Y.Z` tag (no `v` prefix) runs `.github/workflows/release.yml`, which checks the tag against `package.json`, lints, builds, publishes to npm via trusted publishing, and creates the GitHub release.
- Only release when the user asks for it. Do not bump the version, add dated `CHANGELOG.md` sections, or create tags as part of regular changes; record regular changes under `## Unreleased` in `CHANGELOG.md`.
- To release:
  1. Rename `## Unreleased` in `CHANGELOG.md` to `## X.Y.Z - YYYY-MM-DD`.
  2. Run `npm version X.Y.Z --no-git-tag-version` to bump `package.json` and `package-lock.json`.
  3. Commit as `Release X.Y.Z`, push `main`, then tag that commit `X.Y.Z` and push the tag.
  4. After the workflow finishes, replace the auto-generated GitHub release notes with the version's `CHANGELOG.md` section.
