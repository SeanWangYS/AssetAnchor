## Context

All functions run in `asia-east1` as Cloud Functions 2nd gen (Cloud Run). Current options: `{ region, cors: true }` per HTTP function, `ensureHistory` adds `timeoutSeconds: 300`; nothing sets `maxInstances`, so each function may scale to 100 instances. Each file re-declares `const REGION = 'asia-east1'`.

Production evidence (Cloud Monitoring, last 60 days):

| service         | p99 latency | peak instance_count |
| --------------- | ----------- | ------------------- |
| ensurehistory   | ≈ 13.2 s    | 2                   |
| fetchquotes     | ≈ 2.1 s     | 4                   |
| fetchintraday   | ≈ 0.45 s    | 2                   |
| fetchsymbolmeta | ≈ 1.7 s     | 2                   |

(`instance_count` includes idle instances and overlap during deploys, so actual concurrent need is lower.) 2nd-gen default concurrency is 80 requests per instance (1 vCPU), so one instance serves far more than the current single user.

Existing guardrails: $10 budget alerts, $5 spend cap each on Cloud Run and Cloud Run Functions, Monitoring alerts on Firestore reads/writes and Cloud Run requests.

## Goals / Non-Goals

**Goals:** bound worst-case compute burn rate; make the bound impossible to forget for future functions; stop `ensureHistory` from holding an instance for minutes.

**Non-Goals:** request authentication / App Check (⑦); per-user rate limits; changing quote function behaviour.

## Decisions

### D1 — Caps: 3 for user-facing HTTP, 1 for background

`fetchQuotes`, `fetchQuote`, `fetchIntraday`, `fetchSymbolMeta`, `ensureHistory` → `maxInstances: 3`. `scheduledUsdRate`, `seedUsdRate`, `onSymbolCreatedFetchQuote` → `maxInstances: 1`.

Rationale: 3 × 80 concurrency = 240 in-flight requests per function, far above any realistic load for a personal app (even ~100 users), while the worst-case burn is ≈ 5×3 + 3×1 = 18 busy instances ≈ USD 1.5/h at tier-1 pricing (1 vCPU + 256 MiB), so the $5 spend cap and budget alerts have hours, not minutes, to react. Background functions are low-volume and idempotent; 1 is enough (trigger events queue/retry).

Alternatives: keep default 100 (no protection); `maxInstances: 1` everywhere (a single slow `ensureHistory` backfill would share an instance with quotes of a different function — fine, but fetchQuotes saw 4 instances during deploy overlap, 3 keeps headroom); `setGlobalOptions` in `index.ts` (works, but ESM import hoisting makes ordering subtle and it can be overridden silently per function — explicit shared option objects are clearer and testable).

### D2 — Single source + enforcement test

New `src/runtimeOptions.ts` exports `REGION`, `USER_HTTP_OPTIONS` (`region`, `cors: true`, `maxInstances: 3`) and `BACKGROUND_OPTIONS` (`region`, `maxInstances: 1`). Per-file `REGION` constants are removed. A test imports `src/index.ts`, iterates every export with a `__endpoint`, and asserts `region` = `asia-east1` and `1 ≤ maxInstances ≤ 3`. A new function without options fails CI-local tests.

### D3 — `ensureHistory` time budget (120 s timeout, 50 s start cutoff)

The loop is extracted into `runEnsureBatch(items, ensureOne, { now, sleep, budgetMs })` (injected clock/sleep → unit-testable). Before starting an item it checks elapsed time; once ≥ 50 s, remaining items return `{ symbolId, error, deferred: true }` without touching Yahoo. Function `timeoutSeconds` = 120.

Worst case per item: provider makes ≤ 4 requests (2 hosts × period/range), `ensureHistoryFor` retries once after a 2 s backoff → ≤ 8 requests × 8 s timeout + 2 s ≈ 66 s. 50 s + 66 s = 116 s < 120 s, so a started item always finishes or fails before the platform kills the request (a killed request would lose the whole response). Typical batches (p99 13 s) are unaffected.

Client impact: none required. `parseEnsureHistoryResponse` already skips error items, `historyStore` keeps old data and retries after its session throttle; the backfilling flag clears in `finally`.

Alternatives: lower `MAX_HISTORY_ITEMS` (50) — still unbounded on hangs; client-side chunking — touches mobile and needs a native-free but UI-adjacent change; streaming/partial responses — overkill.

### D4 — 8 s abort timeout on history Yahoo calls

`fetch(url, { signal: AbortSignal.timeout(8_000) })` in `fetchChart`. An abort throws without `status`, so it is treated as a non-429 failure → item error (isolated). Yahoo normally answers in < 2 s.

## Risks / Trade-offs

- [Burst beyond 3 × 80 concurrency] → Cloud Run returns 429; mobile quote/history paths are already fail-soft (stale data + retry). Raise caps together with Monitoring thresholds when users grow (backlog item).
- [Slow first-time backfill for a large portfolio is split across sessions] → acceptable; deferred items retry automatically and old data stays visible.
- [`__endpoint` is an internal-ish API of firebase-functions] → test-only usage; if it changes on upgrade the test fails loudly rather than silently passing.

## Migration Plan

1. Merge PR (owner gate: deploy-affecting).
2. Owner runs `firebase deploy --only functions` (spending/deploy gate).
3. Verify with Cloud Run Admin API that each service's `autoscaling.knative.dev/maxScale` and `ensurehistory` timeout match; open the app once to confirm quotes/history still load.

Rollback: revert the commit and redeploy (options are pure config).

## Open Questions

None — values derived from production metrics; adjust later via the backlog item "raise thresholds when users grow".
