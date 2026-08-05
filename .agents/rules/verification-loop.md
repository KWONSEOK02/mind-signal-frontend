# Verification Loop Rules — Mind Signal Frontend

## 6-step pipeline

Follow this exact order after a code change (fail-fast):

```bash
npm run format:check   # style check      — Prettier (src/**/*.{ts,tsx,md})
npm run typecheck      # type check       — tsc --noEmit
npm run depcruise      # architecture     — Dependency Cruiser, 4 FSD boundary rules
npm run lint           # static analysis  — ESLint 9
npm run test           # tests            — Vitest (NOT Jest) + @vitest/browser
npm run build          # build            — next build
```

Run all at once:

```bash
npm run verify
```

(`npm run verify` = format:check && typecheck && depcruise && lint && test && build — defined in `package.json`.)

If the test step fails, check `.agents/rules/test-modification.md` to identify the affected layer and update the Vitest tests.

## Purpose of each step, and how to handle failure

| Step | Command | Purpose | On failure |
|------|------|------|-------------|
| format:check | `npm run format:check` | code-style consistency, avoids false lint positives | run `npm run format`, re-check |
| typecheck | `npm run typecheck` | catch type errors before runtime | fix types, re-run |
| depcruise | `npm run depcruise` | detect FSD layer boundary violations (blocking) | fix import paths, re-run |
| lint | `npm run lint` | code quality/security rules | `npm run lint:fix`, then fix manually |
| test | `npm run test` | functional regression/integration checks (Vitest) | update per `test-modification.md` |
| build | `npm run build` | validate the deployable artifact | fix compile errors, re-run |

### Why format:check runs before lint

If Prettier's formatting (semicolons, quotes, line breaks, etc.) conflicts with an ESLint rule, `lint` produces false positives about formatting. Running `format:check` first eliminates pure formatting issues so `lint` runs clean.

### depcruise — blocking rules

The 4 rules in `.dependency-cruiser.cjs` are all `severity: 'error'` — **blocking**, not advisory:

| Rule | Forbids | Violation example |
|--------|-----------|---------|
| `no-db-in-features` | `05-features` → direct DB driver import | `import 'prisma'` inside `05-features/…` |
| `no-db-in-pages` | `03-pages` → direct DB driver import | `import 'drizzle-orm'` inside `03-pages/…` |
| `no-upward-from-shared` | `07-shared` → import of an upper layer | `07-shared` importing `05-features` |
| `no-upward-from-widgets` | `04-widgets` → import of `03-pages` | `04-widgets/Navbar` importing `03-pages/lab` |

### Test step — Vitest (NOT Jest)

The FE test runner is **Vitest**, whose API differs from Jest:

- `vi.mock(...)` (not Jest's `jest.mock`)
- `vi.fn()` (not Jest's `jest.fn`)
- snapshot update: `vitest -u` (not Jest's `npm test -- -u`)

Full rules: `.agents/rules/test-modification.md`

## Playwright E2E — separate runner

```bash
npm run test:e2e      # Playwright E2E (run separately)
```

E2E is not part of `npm run verify`. It has its own `playwright.config.ts`.
`e2e/*.spec.ts` files run under Playwright, not Vitest.

**Note**: a lock conflict occurs if a dev server is already running — stop it first.

## CI Parity

The local pipeline must match CI (`.github/workflows/ci.yml`) step for step.

| Step | Local command | CI step name |
|------|----------|-------------|
| Format | `npm run format:check` | Format check |
| Typecheck | `npm run typecheck` | Type check |
| Architecture | `npm run depcruise` | Architecture boundary check |
| Lint | `npm run lint` | Lint |
| Test | `npm run test` | Test |
| Build | `npm run build` | Build |

If local and CI steps diverge, treat it as a bug and fix immediately.

**CRLF caution (Windows)**: after `npm run format`, always check `git diff --name-only` for files it touched. A missed formatted file fails CI's `format:check`.

**Lint scope**: whole project including `e2e/`, `public/` — same as CI. `public/mockServiceWorker.js` (MSW auto-generated) is excluded via `globalIgnores` in `eslint.config.mjs`. Watch this closely when adding new files (e.g. E2E tests).

## pre-push hook

`.githooks/pre-push` ships with the repo. Activation command (once per clone):

```bash
git config core.hooksPath .githooks
```

Without this, the push hook does not run. See `git-workflow.md`.

## Agent self-verification rules

1. Do not declare work complete before the full loop passes.
2. On a step failure, fix the root cause:
   - No bypassing hooks with `--no-verify`.
   - No `// eslint-disable-next-line` without a cited reason.
   - No deleting or commenting out failing tests to pass CI.
3. After 3 consecutive failures on the same step, escalate to a human — do not attempt increasingly aggressive fixes.
4. If the pipeline command itself is broken (e.g. missing package), report the infra issue before touching code.
