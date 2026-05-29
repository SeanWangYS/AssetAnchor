# Sprint 0 Retrospective

**Period**: 2026-05-22 → 2026-05-24
**Goal**: Foundation — monorepo + shared (types/enums/Money) + tooling + CI + firebase config
**Closed**: 2026-05-24, tagged `sprint-0-complete` @ 9e7d897

## Summary

Sprint 0 completed via subagent-driven development (14 tasks, 22 commits on main). Local exit-gate met on day 1 (2026-05-22→23); remote/deploy actions and branch protection settled on day 2 (2026-05-24).

## Exit gate status (per plan §13.2)

- [x] `pnpm install --frozen-lockfile` passes
- [x] `pnpm -r typecheck` green
- [x] `pnpm -r lint` green
- [x] `pnpm -r test` green
- [x] `packages/shared` coverage ≥ 90% (actual: 100% on money + errors + all enum files)
- [x] Husky pre-commit + commit-msg hooks active and validated (lint-staged transforms, commitlint scope-enum enforced)
- [x] CI green on GitHub Actions (run 26334182677 — lint/typecheck/test all success in 22s on `push` to main)
- [x] Firebase rules + indexes deployed to `assetanchor-832df` — rules released to cloud.firestore; 5 composite indexes verified on remote via `firebase firestore:indexes`
- [x] ADR-000 + ADR-001 written
- [x] Retro stub (this file)

## Close notes (2026-05-24)

- **GitHub repo bootstrap deviated from the original "PR-into-main" plan**: feature/sprint-0-foundation was pushed first; user created `main` on GitHub UI from feature tip (no PR ceremony — the 22 commits ARE the genesis of main). CI ran on the resulting `push` to main and went green. Net effect equivalent; saved one degenerate PR. Future sprints will use proper feature → PR → main flow now that protection is on.
- **`gh` OAuth needed `workflow` scope added mid-flow** (`gh auth refresh -h github.com -s workflow`) because the foundation commits include `.github/workflows/ci.yml`. Existing scopes (`gist, read:org, repo`) were insufficient.
- **Repo went public** (was created private) to unlock free branch protection — classic branch protection AND rulesets are gated to GitHub Pro on private repos. Code is non-sensitive (secrets gitignored), so the trade-off was acceptable.
- **main branch protection installed**: PR required (0 approvals — solo dev), CI required (`lint` + `typecheck` + `test` must pass + strict up-to-date base), `enforce_admins=true` (admin cannot bypass), linear history only (no merge commits), no force-push, no deletion, conversation resolution required.
- **A6 (clear old Firestore data) was a no-op**: planned to wipe legacy data in `assetanchor-832df` but the `(default)` database (created 2025-12-04, asia-east1) had zero collections — never been written to. `firebase firestore:delete --all-collections --force` returned exit 0 with empty deletion list. Concept caveat documented: `firebase deploy --only firestore:rules,firestore:indexes` only deploys server-side metadata; collections appear only after the first `setDoc/addDoc` write. This will land naturally in Sprint 1.
- **Branch retention policy**: dev branches (feature/_, fix/_, etc.) are kept on origin after merge; never auto-delete. Recorded in Claude memory `feedback-keep-dev-branches`.

## What worked

- Subagent-driven flow with two-stage review caught real issues early (e.g., redundant `@typescript-eslint/*` legacy deps in Task 1's package.json caught by Task 1 code review and absorbed into Task 2; missing `.prettierignore` for docs caught by both Task 2 reviewers and patched inline).
- TDD discipline on Money class delivered 100% coverage in one batch — the test-first ordering forced API clarity (constructor signature, error types, immutability contract) before any implementation cycle.
- Husky PATH portability fix landed mid-sprint (Task 4 → quick follow-up commit) — proactive resolution avoided per-commit friction for the rest of Sprint 0.
- Quality reviews surfaced real forward-looking risks (NaN guard on Money, runtime-resolution cliff for functions ↔ shared) that became carry-forward items for Sprint 3/4 rather than getting lost.

## What didn't

- Plan had a spec typo for `apps/mobile/tsconfig.json` (`types: ["node"]` despite no `@types/node` installed). Caught by implementer's typecheck, fixed inline + plan patched. Lesson: spec-test the tsconfig snippets before publishing plans.
- corepack was blocked by EACCES on the user's machine — fell back to `npm install -g pnpm@9.12.0` with `~/.npm-global` prefix. Required Husky hook PATH update to be portable. Worth noting in a "machine setup" doc for future contributors.

## Next

- **Sprint 1: Auth + Hello Firebase Rail** — biggest risk is EAS Dev Build + `@react-native-firebase` native module setup. See plan §13.2 Sprint 1. Pre-staged plist + .env reference are at `apps/mobile/.secrets/` (gitignored). First sprint to actually exercise the new PR-into-main flow end-to-end (branch → CI → review → squash merge).
- **Carry-forward items for future sprints**:
  - Sprint 3+: `Money.sum/max/min` helpers, branded `DateString` type, zod schemas under `packages/shared/src/schemas/`.
  - Sprint 4: runtime resolution of `@assetanchor/shared` for functions deploy — decide on tsup build vs deploy-time bundling (breadcrumb in `apps/functions/src/index.ts`).
  - Sprint 1: hand-merge Expo init output without overwriting workspace config (breadcrumb in `apps/mobile/src/index.ts`).
  - Optional polish: `Decimal.clone({...})` to isolate global Decimal config; `Money.of` static factory mirror.
