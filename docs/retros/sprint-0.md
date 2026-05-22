# Sprint 0 Retrospective

**Period**: 2026-05-22 → 2026-05-23
**Goal**: Foundation — monorepo + shared (types/enums/Money) + tooling + CI + firebase config

## Summary

Sprint 0 completed in a single session via subagent-driven development (14 tasks, 21 commits on main). All exit-gate criteria met locally; remote deploy and PR creation deferred to user.

## Exit gate status (per plan §13.2)

- [x] `pnpm install --frozen-lockfile` passes
- [x] `pnpm -r typecheck` green
- [x] `pnpm -r lint` green
- [x] `pnpm -r test` green
- [x] `packages/shared` coverage ≥ 90% (actual: 100% on money + errors + all enum files)
- [x] Husky pre-commit + commit-msg hooks active and validated (lint-staged transforms, commitlint scope-enum enforced)
- [ ] CI green on GitHub Actions (deferred — needs GitHub remote, user-authorized push)
- [ ] Firebase rules + indexes deployed to `assetanchor-832df` (deferred — user-authorized deploy)
- [x] ADR-000 + ADR-001 written
- [x] Retro stub (this file)

## What worked

- Subagent-driven flow with two-stage review caught real issues early (e.g., redundant `@typescript-eslint/*` legacy deps in Task 1's package.json caught by Task 1 code review and absorbed into Task 2; missing `.prettierignore` for docs caught by both Task 2 reviewers and patched inline).
- TDD discipline on Money class delivered 100% coverage in one batch — the test-first ordering forced API clarity (constructor signature, error types, immutability contract) before any implementation cycle.
- Husky PATH portability fix landed mid-sprint (Task 4 → quick follow-up commit) — proactive resolution avoided per-commit friction for the rest of Sprint 0.
- Quality reviews surfaced real forward-looking risks (NaN guard on Money, runtime-resolution cliff for functions ↔ shared) that became carry-forward items for Sprint 3/4 rather than getting lost.

## What didn't

- Plan had a spec typo for `apps/mobile/tsconfig.json` (`types: ["node"]` despite no `@types/node` installed). Caught by implementer's typecheck, fixed inline + plan patched. Lesson: spec-test the tsconfig snippets before publishing plans.
- corepack was blocked by EACCES on the user's machine — fell back to `npm install -g pnpm@9.12.0` with `~/.npm-global` prefix. Required Husky hook PATH update to be portable. Worth noting in a "machine setup" doc for future contributors.

## Next

- **Deferred remote/deploy actions** (user-authorized, controller-handled): create GitHub repo, push, open Sprint 0 PR, wait for CI green, `firebase deploy --only firestore:rules` + `firestore:indexes`, tag `sprint-0-complete`.
- **Sprint 1: Auth + Hello Firebase Rail** — biggest risk is EAS Dev Build + `@react-native-firebase` native module setup. See plan §13.2 Sprint 1. Pre-staged plist + .env reference are at `apps/mobile/.secrets/` (gitignored).
- **Carry-forward items for future sprints**:
  - Sprint 3+: `Money.sum/max/min` helpers, branded `DateString` type, zod schemas under `packages/shared/src/schemas/`.
  - Sprint 4: runtime resolution of `@assetanchor/shared` for functions deploy — decide on tsup build vs deploy-time bundling (breadcrumb in `apps/functions/src/index.ts`).
  - Sprint 1: hand-merge Expo init output without overwriting workspace config (breadcrumb in `apps/mobile/src/index.ts`).
  - Optional polish: `Decimal.clone({...})` to isolate global Decimal config; `Money.of` static factory mirror.
