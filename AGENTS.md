# AGENTS.md

## Release Rules

- Do not manually bump `package.json` or `package-lock.json` for normal package releases.
- Do not manually add release entries to `CHANGELOG.md` before running the release tool.
- Do not manually create the git tag for the next package version before running the release tool.
- For this package, use `npm run release` from the `n8n/` directory to perform the actual release flow.
- Manual version/tag/changelog edits are only acceptable if the user explicitly asks for a manual release process instead of the standard tool-driven one.
