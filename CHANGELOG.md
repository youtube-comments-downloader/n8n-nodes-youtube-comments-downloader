# Changelog

This file tracks meaningful changes to the n8n YouTube Comments Downloader node.

## Unreleased

### Changed
- Reworked the node internals to match n8n verification expectations more closely.
- Replaced the vendored concurrency code with a small internal limiter utility.
- Switched request handling to n8n authentication helpers and improved HTTP error handling.
- Updated the credential UI so TLS/SSL certificate validation stays configurable without exposing a development-only URL.

### Infrastructure
- Added a tag-based GitHub Actions release workflow for npm publishing with provenance.
- Simplified the release toolchain by removing the custom release-note generator and other release-only helper scripts.
- Switched CI installs from `npm install` to `npm ci`.

## 1.0.4 - 2026-03-11

### Fixed
- The node now fails the execution when a download ends in `canceled` instead of treating it like a successful run.

### Infrastructure
- Added initial release automation guardrails in the repository.

## 1.0.3 - 2025-12-09

### Fixed
- Fixed binary file downloads returned by the node.

## 1.0.2 - 2025-12-09

### Changed
- Replaced the original dependency approach with bundled internal code.
- Refreshed the project documentation.

## 1.0.1 - 2025-12-09

### Changed
- Cleaned up package boilerplate and updated the README.

## 1.0.0 - 2025-12-09

### Added
- Initial release of the YouTube Comments Downloader community node for n8n.
- Support for downloading comments from videos, shorts, live streams, playlists, channels, community posts, and custom lists.
- JSON and file-based outputs for downstream workflow processing.

### Infrastructure
- Added the initial API credential and node package setup.
