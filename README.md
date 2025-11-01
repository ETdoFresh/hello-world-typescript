# Codex WebApp Agent

Unified Express + React workspace that powers the Codex WebApp agent demo. The stack runs the API, SQLite persistence, Codex SDK integration, and the Vite-powered SPA from a single Node.js process.

## Project layout

- `src/index.ts` — single server entry point wiring Express, backend APIs, and the in-process Vite dev server (middleware mode) or prebuilt static assets in production.
- `src/backend/` — API routes, SQLite access layer, Codex SDK wrapper, and workspace management utilities.
- `src/frontend/` — Vite + React client. In development it is served through Vite middleware; in production, the prebuilt bundle in `dist/client` is served by Express.

### Persistent data

- SQLite lives under `var/chat.db`. The directory is created automatically on boot.
- Per-session workspaces are provisioned in `workspaces/<session-id>` and cleaned up when sessions are deleted.

## Getting started

```bash
npm install
npm run dev
```

The dev server uses `tsx watch` so backend changes restart automatically. Vite runs in middleware mode for fast React refresh, and everything is served from a single HTTP port (defaults to `3000`; increments automatically when busy).

Stop the server with `Ctrl+C`. Shutdown signals are trapped so the HTTP server and Vite close cleanly.

### Production-style run

```bash
npm run build      # emits dist/server and dist/client
npm start          # runs the compiled server + static SPA
```

## Tooling

- Requires Node.js ≥ 18.17.0.
- TypeScript configs live at the repo root:
  - `tsconfig.server.json` builds the server into `dist/server`.
  - `tsconfig.client.json` type-checks the Vite client under `src/frontend`.
- `npm run typecheck` validates both server and client configurations with no emit.
- `vite.config.ts` points to `src/frontend` and emits client assets to `dist/client`.

## Codex SDK integration

- The server can integrate with `@openai/codex-sdk` when it is available. Install it separately (`npm install @openai/codex-sdk`) or provide the Codex CLI binary on your `PATH`. On startup the server tries to locate the `codex` CLI automatically (`CODEX_PATH`) and reports status through `/api/health`.
- Authenticate via `codex login`, or by setting `CODEX_API_KEY` / `OPENAI_API_KEY`. Misconfiguration returns HTTP 502 from API endpoints and surfaces clearly in the UI.

## Troubleshooting

- If the dev server refuses to bind, check for orphaned Node processes holding the selected port. The server auto-increments to the next free port up to 10 attempts.
- `/api/health` is the quickest readiness probe; it returns the resolved database path and Codex status.
- The frontend uses `fetch('/api/...')`; confirm API failures with server logs before assuming client issues.
- After upgrading dependencies with native modules (for example, `better-sqlite3`), restart the dev server to reload bindings.

## Coding notes

- TypeScript is configured with strict flags. Prefer running `npm run build` or at least `npm run typecheck` before committing changes.
- Keep environment-specific data (logs, database files, workspaces) out of Git; `.gitignore` already covers them.
- Prefer tight diffs (e.g., `apply_patch`) or project formatters to keep contributions review-friendly.
