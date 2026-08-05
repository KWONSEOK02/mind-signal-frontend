
# Git Workflow Rules — Mind Signal Frontend

## Branch Strategy

- `main` is protected — never commit directly.
- All feature branches must be submitted via PR targeting `dev`. `dev` → `main` merges follow team release cadence.
- Branch naming (Work ID style — see AGENTS.md §10 for what a Work ID means):
  - Feature: `feat/{domain-wNNN}-{slug}` — e.g. `feat/session-w042-pairing-retry`
  - Bug fix: `fix/{short-desc}` — e.g. `fix/session-pairing-timeout`
  - Hotfix (production): `hotfix/{short-desc}`
  - Refactor: `refactor/{short-desc}`
  - Docs: `docs/{short-desc}`

## Commit Convention — Conventional Commits 1.0

Pattern: `{type}({scope}): {description}`

Allowed types:

| Type | Purpose |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Build, config, package updates |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or modifying tests |
| `ci` | CI workflow changes |
| `revert` | Reverting a previous commit |
| `perf` | Performance improvement |
| `style` | Formatting / whitespace (no logic change) |

Scope MUST be lowercase kebab-case (e.g. `auth`, `sessions`, `signals`, `shared`).
Description MUST start lowercase and must NOT end with a period.

Examples:
```text
feat(sessions): add pairing token-based session creation API
fix(auth): handle JWT expiry in refresh flow
refactor(signals): extract use-signal hook into model layer
chore(deps): bump socket.io-client to 4.8.3
docs(rules): add git-workflow rule file
ci(frontend): add commitlint advisory workflow
```

## One Task = One Commit

Each atomic task is one commit. No "WIP", "misc", or "fix fix" commits.
One PR may contain multiple commits when each commit is independently meaningful.

## No Direct Commits to Main

`main` branch direct commit is strictly prohibited.
Flow: `feat/{domain-wNNN}-{slug}` → PR → `dev` → PR → `main`.

## Co-authored-by

Every commit message MUST end with:

```text
Co-authored-by: KWONSEOK02 <gwonseok02@gmail.com>
```

- Email fixed to `gwonseok02@gmail.com` — `noreply` addresses prohibited.
- Claude `Co-Authored-By` line is prohibited. Use `KWONSEOK02` only.

Example full commit message:
```text
feat(sessions): add pairing token-based session creation API

Co-authored-by: KWONSEOK02 <gwonseok02@gmail.com>
```

## Initial Setup (MANDATORY — run once per clone)

After cloning the repo, run this **once**:

```bash
git config core.hooksPath .githooks
```

Without this setting the `.githooks/pre-push` hook will **not activate**. The
hook script exists in the repo but Git will not execute it until
`core.hooksPath` is configured.

## Pre-Push Gate

Before `git push` on any branch, the `.githooks/pre-push` hook (activated by the
initial setup above) checks:

1. Current branch is NOT `main`.
2. Commit subjects introduced since `origin/dev` (`origin/dev..HEAD`) match the
   Conventional Commits regex via `commitlint`. If `origin/dev` isn't resolvable
   locally, it falls back to checking the last 10 commits on `HEAD`.
3. No uncommitted changes in the working tree (including untracked files).

If any check fails the push is blocked. Fix the issue before retrying — do not
bypass with `--no-verify`.

## Local Verification Before Commit

Run the full 6-step pipeline before committing:

```bash
npm run verify
# expands to: format:check && typecheck && depcruise && lint && test && build
```

Or step by step in order:

```bash
npm run format          # Prettier auto-fix (write mode)
npm run format:check    # Prettier verify (CI mode)
npm run typecheck       # TypeScript tsc --noEmit
npm run depcruise       # FSD architecture boundary check
npm run lint            # ESLint (0-warning policy — checked in CI/verify pipeline)
npm run test            # Vitest unit + browser tests
npm run build           # Next.js production build
```

**CRLF caution (Windows)**: after `npm run format`, always check `git diff --name-only`
for files it touched and make sure they're staged before committing — a missed
formatted file fails CI's `format:check`.

Never commit if any step fails. Fix root cause, then recommit.

## commitlint CI Enforcement

`wagoid/commitlint-github-action@v6` runs on every PR (PR-only, not on push).
It checks only the last commit (`commitDepth: 1`) against the type-enum above.

**Currently advisory**: the workflow runs with `continue-on-error: true`
(`.github/workflows/commitlint.yml`), so a failing check does not block the PR.
Switching it to blocking requires flipping that flag and adding `commitlint` to
GitHub Branch protection required status checks.

## CI Trigger Coverage

`.github/workflows/ci.yml` currently triggers on `push.branches: [main, dev]` and on
pull requests. Feature branch pushes outside `main`/`dev` do not trigger CI — always
open a PR to get CI validation.

## No Force Push on Main

Force pushing to `main` is prohibited under any circumstance.
Use `git reset --soft HEAD~N` locally before the first push if rewriting is needed.

## Merge Strategy

- Default: **Create a merge commit**. Do not ask about squash.
- Ask the user whether to squash only when the PR accumulated fix commits from 2+ CodeRabbit review rounds.

Claude must not auto-merge without the user's explicit instruction.
