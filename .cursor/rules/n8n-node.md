# YouTube Comments Downloader n8n Node Rules

## Project Context

- **Goal**: Build an n8n node for `https://api.youtubecommentsdownloader.com`.
- **API Spec**: See `open-api.json` in root.
- **Base URL**: `https://api.youtubecommentsdownloader.com`

## Code Style & Standards

- **Language**: TypeScript.
- **Style**: Follow n8n community node guidelines.
- **Naming**:
  - Node name: `YoutubeCommentsDownloader`
  - Credentials: `youtubeCommentsDownloaderApi`
- **Error Handling**: Propagate API errors clearly to the n8n workflow.
- **Linting**:
  - STRICT compliance with ESLint and TypeScript.
  - **NEVER** ignore linting errors (no `eslint-disable`, no `// @ts-ignore`).
  - Resolve issues by fixing the code structure or types.

## n8n Node Specifics

- Use `INodeType` interface for node definition.
- Use `IExecuteFunctions` for execution logic.
- Use `ICredentialType` for credentials.
- Prefer **Programmatic Style** (using `execute` method).
- **Credentials**: Implements `x-api-key` header authentication.
- **URLs**:
  - Use `baseUrl` property in `httpRequest` options.
  - Do NOT concatenate base URL and path in the `url` property (e.g., no `url: ${baseUrl}/...`).
  - Versioning (`/v1`) should be handled in the endpoint paths, not the base URL.

## API Mapping

- `POST /v1/downloads` -> Operation: `create`
- `GET /v1/downloads` -> Operation: `getAll`
- `GET /v1/downloads/{id}` -> Operation: `get`
- `GET /v1/downloads/{id}/save` -> Operation: `download` (Returns Binary)

## Workflow

1. Analyze `open-api.json`.
2. Implement Credentials.
3. Implement Node Logic.
4. Verify against n8n linter.
