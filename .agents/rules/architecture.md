# Architecture Rules — Mind Signal Frontend (Next.js 16 App Router + FSD)

## Directory Layout (Feature-Sliced Design — numbered-prefix layers)

```text
src/
├── 07-shared/      # reusable primitives — no business logic
│   ├── api/        # Axios instance + JWT interceptor (base.ts is the single source)
│   ├── config/     # env var parsing (config.ts — Zod, no direct process.env access)
│   ├── types/      # shared TypeScript types (index.ts)
│   ├── constants/  # session-status.ts, experiment.ts, etc.
│   ├── lib/        # socket-client.ts and other shared runtime helpers
│   └── utils/      # pure utility functions
├── 06-entities/    # (reserved) domain entity UI — currently unused
├── 05-features/    # user-facing feature slices
│   ├── auth/       # authentication (login/signup)
│   ├── sessions/   # QR generation, pairing, state machine
│   ├── signals/    # EEG signal transmission/display
│   └── chat-assistant/ # AI chat assistant
├── 04-widgets/     # composite UI blocks — Navbar, Footer, SignalChart
├── 03-pages/       # page-level components (imported from app/)
│   └── lab/        # Operator dashboard, Subject join page
└── app/            # Next.js App Router root — plays the 01 layer role
    ├── layout.tsx  # global layout
    ├── page.tsx    # root page
    └── providers/  # UIProvider (theme, auth, navigation)
```

## Module Boundaries (Import Direction)

```text
app → 03-pages → 04-widgets → 05-features → 06-entities → 07-shared
```

- An upper layer (smaller number) may import a lower layer (larger number).
- A lower layer may not import an upper layer.
- `07-shared` may not import any other layer.
- `05-features` slices must not import each other directly — go through the target slice's `index.ts` barrel.

### What depcruise actually checks

`.dependency-cruiser.cjs` does not auto-block the whole matrix above. Only 4 rules are blocking (`severity: error`):

| Rule | Forbids |
|--------|-----------|
| `no-db-in-features` | `05-features` → direct import of a DB driver (`prisma`, `drizzle-orm`, `pg`, `mysql2`, etc.) |
| `no-db-in-pages` | `03-pages` → direct import of a DB driver |
| `no-upward-from-shared` | `07-shared` → import of `05-features`/`04-widgets`/`03-pages` |
| `no-upward-from-widgets` | `04-widgets` → import of `03-pages` |

Other directional violations (e.g. `06-entities` importing `05-features`) are not auto-blocked — catch them in code review.

## Cross-Layer Access Rules (intended design — only partly auto-checked)

| From ↓ \ To → | 07-shared | 06-entities | 05-features | 04-widgets | 03-pages | app |
|----------------|-----------|-------------|-------------|------------|----------|-----|
| 07-shared      | ✓ (intra) | ✗           | ✗           | ✗          | ✗        | ✗   |
| 06-entities    | ✓         | ✓ (intra)   | ✗           | ✗          | ✗        | ✗   |
| 05-features    | ✓         | ✓           | ✓ (intra)   | ✗          | ✗        | ✗   |
| 04-widgets     | ✓         | ✓           | ✓           | ✓ (intra)  | ✗        | ✗   |
| 03-pages       | ✓         | ✓           | ✓           | ✓          | ✓ (intra)| ✗   |
| app            | ✓         | ✓           | ✓           | ✓          | ✓        | ✓   |

**Intra** = within the same slice, relative-path imports allowed.

## Path Alias Convention

```typescript
// ✅ Correct — path alias
import { sessionApi } from '@/07-shared/api/session';       // domain module, not base
import { config } from '@/07-shared/config/config';
import { SessionStatus } from '@/07-shared/constants/session-status';
import { useSignal } from '@/05-features/signals';          // via barrel

// ❌ Forbidden — relative path crossing a layer boundary
import { sessionApi } from '../../../07-shared/api/session';

// ❌ Forbidden — direct process.env access
const url = process.env.NEXT_PUBLIC_API_URL;  // must go through config.ts

// ❌ Forbidden — barrel-bypassing deep import (also a perf-pattern conflict)
import useSignal from '@/05-features/signals/model/use-signal'; // bypasses barrel
```

Real API modules are exported as domain-specific wrappers around `base.ts`'s `api` instance (`sessionApi`, `authApi`, `analysisApi`, etc.). Full pattern: `.agents/rules/api-patterns.md`.

## [ADR-001] Keep the numbered FSD layer names

`07-shared → 06-entities → 05-features → 04-widgets → 03-pages → app`

Kept as-is with number prefixes — no rename. The app layer is the one exception: Next.js App Router requires the folder to be literally `app/`, so it has no number. The rename cost/benefit didn't favor renaming a live repo.

## Server Actions

```typescript
'use server';

// Server Actions verify auth inside the function body, independent of middleware.
// Used for form submits and mutations.
export async function submitAction(formData: FormData) {
  // process after Zod validation
}
```

## Route Handler response pattern

```typescript
import { NextResponse } from 'next/server';

// ✅ return NextResponse.json() directly — Express res.json() pattern is forbidden
export async function GET() {
  return NextResponse.json({ data });                             // success
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!valid) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 }); // error
  }
  return NextResponse.json({ result });
}
```

Server/Client Component rules, `'use client'`, and React Compiler patterns are covered in `.agents/rules/react-components.md` — not duplicated here.

## Zod Form / Env Validation

```typescript
// env var parsing — 07-shared/config/config.ts (already Zod-backed)
import { config } from '@/07-shared/config/config';
const apiUrl = config.api.baseUrl;  // type-safe, no direct process.env access

// form validation pattern
import { z } from 'zod';

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// .parse() throws on failure; .safeParse() returns a result object (preferred in Server Actions)
const result = formSchema.safeParse(formData);
if (!result.success) {
  return { error: result.error.flatten() };
}
```

## Slice Internal Structure Convention

```
05-features/sessions/
├── model/          # business logic hooks/engines
│   ├── pairing-engine.ts
│   └── use-pairing.ts
├── ui/             # components
│   └── pairing-screen.component.tsx
└── index.ts        # barrel export (public API only)
```

File naming and the Korean comment rule are canonical in `.agents/rules/code-style.md` — not duplicated here.

## Key File Locations

| Role | Path |
|------|------|
| Global UI state | `src/app/providers/ui-context.tsx` |
| Axios + JWT interceptor | `src/07-shared/api/base.ts` |
| Zod env config | `src/07-shared/config/config.ts` |
| Shared types | `src/07-shared/types/index.ts` |
| Session status constants | `src/07-shared/constants/session-status.ts` |
| Experiment mode (DUAL/BTI) | `src/07-shared/constants/experiment.ts` |
| Pairing logic | `src/05-features/sessions/model/pairing-engine.ts` |
| Pairing hook | `src/05-features/sessions/model/use-pairing.ts` |
| Signal transmission hook | `src/05-features/signals/model/use-signal.ts` |
| Operator dashboard | `src/03-pages/lab/lab/lab-page.tsx` |
| Subject join page | `src/03-pages/lab/join/join-page.tsx` |

## [CRITICAL] AI Agent Architectural Constraints — Mind Signal Frontend

### Identify the layer first

1. IDENTIFY: which FSD layer? (07-shared / 06-entities / 05-features / 04-widgets / 03-pages / app)
2. SEARCH: check existing patterns (`.agents/rules/api-patterns.md`, `.agents/rules/react-components.md`)
3. VERIFY: `npm run depcruise` (`.dependency-cruiser.cjs` — 4 blocking rules)
4. IMPORT: `@/07-shared/...` alias path + via the `index.ts` barrel

The hard prohibitions (`process.env`, `fetch()`, manual `useMemo`/`useCallback`, barrel-bypass) are canonical in `AGENTS.md` §4 — not repeated here.

### Cross-reference

- Axios instance, polling, `Promise.all` patterns: `.agents/rules/api-patterns.md`
- React Compiler, `'use client'`, performance patterns: `.agents/rules/react-components.md`
- Commit convention, Co-authored-by: `.agents/rules/git-workflow.md`
