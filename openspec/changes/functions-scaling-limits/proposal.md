## Why

The project is now on the paid Blaze plan (2026-10-20) after the free-trial billing lapse. Budget alerts, a $5 Cloud Run spend cap and usage alerts are already in place, but every Cloud Function still scales to the 2nd-gen default of **100 instances**, and `ensureHistory` may hold an instance for up to **300 s** per request with no per-request timeout on Yahoo calls. A misbehaving client or abusive caller could burn the monthly budget in hours before the cap trips. This is the "backend hardening" item ② from the 2026-10-20 requirements session (owner goal: stay under USD 10/month), sequenced after the holdings UI work (④⑤⑥).

Industry guidance for small/solo projects (Firebase "Manage functions" docs, Cloud Run functions quotas) is to set an explicit `maxInstances` as a cost control and keep `minInstances` at 0; production metrics (60 days) show peak instance counts of 2–4 per function and `ensureHistory` p99 latency ≈ 13 s, so tight caps leave ample headroom.

Planning references: `docs/portfolio_tracker_planning.md` §2.5 (spending is a human gate), §3 (MVP scope unchanged), ADR-0006 / ADR-0010 (quote and history functions).

## What Changes

- Every deployed function declares an explicit `maxInstances`: user-facing HTTP functions **3**, background functions (scheduler, Firestore trigger, manual seed) **1**. `minInstances` stays 0 (no idle cost).
- Region / CORS / scaling options come from one shared module so a new function cannot silently ship without a cap; a unit test enumerates every exported function and fails if any lacks `maxInstances` or exceeds the cap.
- `ensureHistory` timeout drops **300 s → 120 s**, guarded by an in-handler time budget: after 50 s it stops starting new items and returns them as deferred errors (client already keeps old data and retries on its next session-throttle window).
- Every Yahoo request in the history provider gets an **8 s** abort timeout so one hung upstream call cannot pin an instance.

## Non-goals

- App Check (item ⑦, separate change), HTTP authentication, Firestore rules field validation, rate limiting — later backend changes.
- Changing quote functions' timeouts or the quotes provider (live-quotes behaviour unchanged).
- Phase 2/3 features (dividends, imports, OCR) — out of MVP scope.

## Capabilities

### New Capabilities

- `functions-runtime-limits`: every Cloud Function declares bounded scaling (maxInstances) and region from a single source, enforced by a test.

### Modified Capabilities

- `price-history`: `ensureHistory` gains a time budget (deferred items) and bounded Yahoo request time; timeout shortened.

## Impact

- `apps/functions/src/**`: new `runtimeOptions.ts`; all function definitions switch to it; `ensureHistory` batch loop extracted into a testable helper; history provider fetch timeout.
- No schema, rules, mobile or shared changes. No new dependencies.
- **Deploy gate (owner)**: takes effect only after `firebase deploy --only functions` by the owner.
