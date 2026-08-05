
# Documentation Rules — Mind Signal Frontend

What to write, where to write it, and in what form.

## Document Type Map

| Type | When to use | Location |
|------|-------------|----------|
| **FR** (Functional Requirement) | New feature scope definition | `docs/requirements/FR-XX-<slug>.md` |
| **RTM** (Requirements Traceability Matrix) | FR ↔ impl ↔ test ↔ PR linkage | `docs/requirements/RTM.md` |
| **ADR** (Architecture Decision Record) | Final, code-shaping tech decisions | `docs/architecture/decisions/ADR-NNN-<slug>.md` |
| **RFC** (Request For Comments) | Design proposals needing team consensus | `docs/architecture/decisions/RFC-NNN-<slug>.md` |
| **Report** | Spikes, benchmarks, API deep dives, PAAR post-mortems | `docs/reports/YYYY-MM-DD-<slug>.md` |
| **Overview** | C4 Level 1 system context | `docs/architecture/overview.md` |

> The `docs/` paths above point to this repo's local `docs/` (per-repo ADR/FR/reports).
> The 4-repo shared product docs (consolidated architecture/requirements) live
> separately in the parent `mind-signal/docs/` — see the pointer at the top of AGENTS.md.

## Decision Tree — "I want to write a new document"

```
Which best describes what you're about to write?

├─ A technical decision that is FINAL and will shape the code
│   → docs/architecture/decisions/ADR-NNN-<slug>.md (Accepted, append-only)
│   → If not yet final / needs team sign-off: RFC-NNN-<slug>.md first
│
├─ A single feature's I/O, preconditions, business logic, decision table
│   → docs/requirements/FR-XX-<slug>.md  (copy _FR-template.md)
│   → Add a row to docs/requirements/RTM.md in the same PR
│
├─ A measurement result, load test, framework comparison, API analysis
│   → docs/reports/benchmark-YYYY-MM-DD-<slug>.md
│     or docs/reports/spike-YYYY-MM-DD-<slug>.md
│
├─ An incident post-mortem or deep troubleshooting write-up
│   → docs/reports/paar-YYYY-MM-DD-<slug>.md
│
└─ Architecture big-picture (system context)
   → docs/architecture/overview.md  (C4 Level 1 — Next.js FE ↔ BE ↔ Socket.io ↔ Python Engine)
```

## Naming Rules

- **FR**: `FR-01`, `FR-02` — two-digit zero-padded
- **NFR**: `NFR-01`, `NFR-02`
- **ADR / RFC**: three-digit zero-padded — `ADR-001`, `ADR-042`, `RFC-007`
- **Reports**: `{type}-YYYY-MM-DD-{slug}.md`
  - Examples: `spike-2026-04-20-zod-form-validation.md`, `benchmark-2026-04-20-recharts-perf.md`
- Template files meant to be copied (not edited in place) carry an underscore prefix:
  `_FR-template.md`, `_ADR-template.md`. Remove the underscore when copying.

## ADR / RFC Lifecycle

```
Proposed  →  Accepted  →  Deprecated
    │            │              │
    └─ Rejected  └─ Superseded by ADR-NNN
```

Every ADR/RFC file has a `Status:` line at the top:

- `Proposed` — opened as Draft PR; content is editable
- `Accepted` — merged to main; file becomes **append-only** (see rule below)
- `Rejected` — closed without acceptance; keep the file (prevents re-proposals)
- `Deprecated` — decision no longer in force; no replacement
- `Superseded by ADR-NNN` — replaced by a newer ADR; both files remain on disk

### Append-Only Rule

**Never edit an Accepted ADR to change its decision.**

Write a new ADR with the next available number → link both files → update the old
ADR's status line to `Superseded by ADR-NNN`.

The only two edits allowed on an Accepted ADR:
1. Fixing typos or broken links
2. Updating the `Status:` line when superseded, deprecated, or rejected after the fact

ADRs that apply to both FE and BE carry a header:
`> Applies to: both repos` — the same file content is copied to both repos.
Do not link cross-repo; copy and keep in sync manually.

## RTM — Requirements Traceability Matrix

`docs/requirements/RTM.md` is a single table with one row per FR:

```
| FR-XX | Summary | Issue | ADR | Component | Test | Status |
```

- Update the RTM in **the same PR** that adds or changes an FR.
- If a new ADR affects a previously accepted FR, add the ADR link to that FR row.

## Storybook Docs

- `*.stories.tsx` — auto-generated Storybook pages. Tracked, meant for team sharing.
- Treat Storybook stories as team-shared component docs — commit them as part of the PR.
- Story mock patterns via the MSW addon: see `api-patterns.md`.

## PR Obligations

Every PR must satisfy:

- [ ] If the PR implements an FR → FR file exists + RTM row updated in the same PR
- [ ] If the PR makes a tech decision → ADR file exists (Accepted) + linked from PR body
- [ ] If the PR is a spike or experiment → report exists in `docs/reports/` + linked

## Writing for LLM Agents

Documents in this repo are consumed by LLM agents to generate code. Two rules
that matter more here than in human-only docs:

1. **Preconditions must name the enforcing file or function.**
   Instead of "user must be authenticated", write:
   "authenticated via JWT token in `localStorage['token']`, auto-injected by Axios interceptor
   in `@/07-shared/api/base.ts`"
2. **Decision tables must be exhaustive.**
   Cover every input combination. Missing rows produce missing tests.

## Don't Write a Document If…

- A short inline comment in the code carries the same information.
  Files rot, get wrong, and crowd navigation — prefer a named function or docstring.
- The information already exists in another file. Link; do not duplicate.
- You're writing it "in case someone needs it later".
  Wait until there is a specific reader with a specific question.

## Cross-Reference to Other Rules

- FSD layer boundary rules: `.agents/rules/architecture.md`
- React component rules (Compiler, `'use client'`): `.agents/rules/react-components.md`
- API call patterns (Axios instance, polling): `.agents/rules/api-patterns.md`
- ADR creation template: `docs/architecture/decisions/_ADR-template.md`
- FR creation template: `docs/requirements/_FR-template.md`
