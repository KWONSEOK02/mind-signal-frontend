
# API & Data Fetching Rules

## Axios instance
- All API calls go through the `api` instance in `src/07-shared/api/base.ts`.
- No `fetch()`, no ad-hoc `axios.create()`.
- New API functions go into domain modules under `src/07-shared/api/` (e.g. `sessionApi` in `session.ts`, `authApi` in `auth.ts`) — components import the domain module, not `base.ts`'s `api` directly.

## Environment variables
- No direct `process.env.NEXT_PUBLIC_*` access — go through the `config` object in `src/07-shared/config/config.ts`.

## Realtime & polling
- **Socket.IO**: group realtime events (e.g. `use-signal`'s stream-health, dual-session status) connect via `getSocket()` in `@/07-shared/lib/socket-client.ts`. Uses the `socket.io-client` dependency, not raw WebSocket.
- **Polling**: session status every 3s; signal transmission is a 1s-interval `POST /signals/realtime`.
- Cleanup: `clearInterval` on unmount for polling; `socket.off(...)` on unmount for socket subscriptions.

## Async performance
- Start independent promises before awaiting either:
  ```ts
  // ❌ const a = await fetchA(); const b = await fetchB();
  // ✅ const [a, b] = await Promise.all([fetchA(), fetchB()]);
  ```
- Server Actions verify auth inside the function body, independent of middleware.
- `React.cache()` is for de-duplication within a single request.
