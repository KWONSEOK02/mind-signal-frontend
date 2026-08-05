# Code Style Rules — Mind Signal Frontend (Next.js + TypeScript)

## Universal

- Indent size: 2 spaces (tabs never)
- Line length limit: 80 characters
- Trailing commas: es5 (trailing commas where valid in ES5 — objects, arrays, imports)
- End of line: LF (enforced via `.gitattributes: * text=auto eol=lf`)
- File encoding: UTF-8

## Formatter Ownership — Prettier

- Prettier owns **all** whitespace and layout decisions.
- ESLint handles semantic and logic rules only.
- Any ESLint rule that conflicts with Prettier output MUST be disabled in ESLint config.
- Run: `npm run format` (write) or `npm run format:check` (verify)
- Config: `.prettierrc` — tabWidth: 2, singleQuote: true, trailingComma: "es5", printWidth: 80
- Both `npm run format` and `npm run format:check` target `src/**/*.{ts,tsx,md}` — package.json is the canonical source.

## Linter — ESLint 9 Flat Config

- Run: `npm run lint` or `npm run lint:fix`
- Config: `eslint.config.mjs`
- 0-warning policy — every warning must be fixed (checked in CI/verify). Existing warnings are not exempt ("not related to my change" is not an excuse.)
- Scope: **whole project** (`e2e/`, `public/` included) — same as CI. `public/mockServiceWorker.js` (MSW auto-generated) is excluded via `globalIgnores` in `eslint.config.mjs`. Watch this closely when adding new files (e.g. E2E tests).
- Any ESLint warning appearing in CI output must be resolved before merging.

## Naming Conventions

### Variables & Functions
- `camelCase` — e.g. `getUserById`, `isLoading`, `sessionStatus`

### React Components / Types / Interfaces / Enums
- `PascalCase` — e.g. `UserProfile`, `SessionCard`, `ApiResponse`, `UserRole`

### Constants (module-level, truly immutable)
- `SCREAMING_SNAKE_CASE` — e.g. `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT_MS`

### File Naming — kebab-case + dot-role suffix (singular)

| Role | Suffix | Example |
|------|--------|---------|
| React component | `.component.tsx` | `user-profile.component.tsx` |
| Page-level component | `page.tsx` (Next.js convention) | `join-page.tsx` |
| Custom hook | `.ts` (no suffix, `use-{name}.ts`) | `use-pairing.ts` |
| Type definitions | `.type.ts` or `.types.ts` | `session.type.ts` |
| Zod schema | `.schema.ts` | `auth.schema.ts` |
| API module | `.api.ts` | `session.api.ts` |
| Utility / lib | `.util.ts` or `.lib.ts` | `date.util.ts` |
| Constants | `.constants.ts` | `session.constants.ts` |
| Test file (Vitest) | `.test.ts` / `.test.tsx` | `join-page.test.tsx` |
| Storybook story | `.stories.tsx` | `join-page.stories.tsx` |

### Folder Naming
- `kebab-case`, **plural domain nouns** — e.g. `sessions`, `neuro-chats`, `survey-responses`
- FSD layer folders keep their number prefix as-is: `07-shared`, `05-features`, `04-widgets`, `03-pages`, `01-app`
- New domain folders inside a layer: `kebab-case` plural

## Comments — Korean Noun-Form Rule (MS-specific)

All code comments MUST end with a Korean nominal (명사형) ending.

Allowed endings: `~함`, `~완료`, `~처리`, `~반환`, `~생성`, `~사용`, `~임`

```typescript
// ✅ Correct
// 소켓 연결 초기화함
// API 응답 파싱함
// 인증 토큰 주입 완료
// 세션 상태 업데이트 반환

// ❌ Wrong
// 소켓 연결을 초기화합니다
// API 응답을 파싱하는 함수
// 인증 토큰을 주입합니다
```

This rule applies to:
- Inline comments (`//`)
- Block comments (`/* */`)
- JSDoc description lines (`/** */`)

It does NOT apply to:
- Free-form text responses to users (answer naturally)
- Markdown documents outside code blocks

## JSDoc — Google Style

Use Google Style JSDoc for all exported functions, hooks, and components.

```typescript
/**
 * 세션 ID로 세션 상태 조회함.
 *
 * @param sessionId - MongoDB ObjectId 문자열
 * @returns 세션 상태 객체
 * @throws ApiError 404 — 세션 미존재 시
 */
export async function getSession(sessionId: string): Promise<SessionState> { ... }
```

- `@param` descriptions must follow the noun-form comment rule.
- `@throws` must name the error class and the HTTP status code.
- Private/internal functions: JSDoc optional, inline comment sufficient.

## TypeScript — Strict Mode

`tsconfig.json` includes `"strict": true`. No relaxation of strict flags allowed.

- No `as` type assertions to bypass type checking or Zod validation.
- No `@ts-ignore` without a cited reason in the same line comment.
- `import type` MUST be used for type-only imports.

## Path Alias Usage

Always use the FSD layer alias — never relative paths that cross layer boundaries.

```typescript
// ✅ Correct
import { api } from '@/07-shared/api/base';
import { config } from '@/07-shared/config/config';
import { Session } from '@/06-entities/sessions';

// ❌ Wrong — relative path crossing layer boundary
import { api } from '../../../07-shared/api/base';

// ❌ Wrong — direct process.env access (use config.ts)
const url = process.env.NEXT_PUBLIC_API_URL;
```

Intra-slice imports (within the same slice folder) may use relative paths.

## React Component Conventions

- **`'use client'` directive**: required at the top of any component using state, events, or browser APIs. Server Components have no directive (the default) — don't add `'use client'` unless needed.
- **SSR-safe mount**: use `useSyncExternalStore` (not `useEffect + useState`).
- **React Compiler (Forget) is on** — no manual `useMemo`, `useCallback`, `memo()`. The Compiler handles it. Full rule: `.agents/rules/react-components.md`.
- Conditional rendering: ternary instead of `&&` (avoids rendering a falsy `0`).

## Import Rules

- Use `@/` path alias for all cross-layer project imports (configured in `tsconfig.json`).
- Cross-slice imports MUST go through the target slice's public API barrel (`index.ts`).
- Intra-slice imports (within the same slice) may use relative paths.
- `import type` MUST be used for type-only imports.
- `lucide-react` uses barrel imports (`import { Icon } from 'lucide-react'`) — deep imports are unnecessary. `next.config.ts`'s `experimental.optimizePackageImports: ['lucide-react']` tree-shakes barrel imports automatically, and the real codebase (`signal-measurer.tsx`, `navbar.tsx`, etc.) uses barrel imports throughout. This is separate from — and does not exempt — the project's own slice/entity `index.ts` barrel, which still must not be bypassed with deep imports.

## Test File Placement

- **Vitest unit/component tests**: `*.test.ts` / `*.test.tsx` — co-located with the source file (same folder).
- **Playwright E2E tests**: separate `e2e/` folder — `e2e/*.spec.ts`.
- **Storybook stories**: `*.stories.tsx` — co-located with the source file.
- CI lint scope is the whole project including `e2e/` — verify lint passes when adding new E2E files.

## Module Export Rules

- Every FSD slice exposes its public interface through `index.ts` only.
- Do not import directly from internal files of another slice.
- See `.agents/rules/architecture.md` for full FSD boundary rules.
