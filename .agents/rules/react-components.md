
# React Component Rules

## Required declarations
- Any component using state, events, or browser APIs needs `'use client'` at the top.
- SSR-safe mount detection: `useSyncExternalStore` (not the `useEffect + useState` pattern).

## React Compiler (Forget) is on
- No manual `useMemo` / `useCallback` — the Compiler handles this automatically.
- No manual `memo()` wrapping either — same reason.

## Performance patterns
- Independent async work must use `Promise.all()` — no waterfalls.
- `lucide-react` uses barrel imports (`import { Icon } from 'lucide-react'`) — `next.config.ts`'s `optimizePackageImports: ['lucide-react']` tree-shakes it automatically, so deep imports are unnecessary.
- Heavy components use `next/dynamic` for lazy loading.
- Conditional rendering uses a ternary, not `&&` (avoids rendering a falsy `0`):
  ```tsx
  // ❌ {count && <Component />}
  // ✅ {count > 0 ? <Component /> : null}
  ```

## FSD rule
- A larger-numbered base layer (e.g. `07-shared`) must not import a smaller-numbered upper layer (e.g. `05-features`) — the reverse (upper importing base) is allowed.
- A slice's public surface is exposed only through its `index.ts` barrel.
