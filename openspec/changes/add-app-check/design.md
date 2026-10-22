## Context

- Mobile calls functions with plain `fetch` (ADR-0006, `onRequest`, no RNFirebase functions module) from four places: `quotesStore` (`fetchQuotes`), `historyStore` (`ensureHistory`, `fetchIntraday`), `symbolsStore` (`fetchSymbolMeta`). Firestore goes through `@react-native-firebase/firestore` v24.
- Console App Check enforcement covers Firestore but not `onRequest` functions; those must verify the `X-Firebase-AppCheck` header themselves with `getAppCheck().verifyToken()` (Firebase "custom backend" guide).
- The owner is the only TestFlight user, so the usual long monitoring window for old app versions is unnecessary; one confirmed session on the new build is enough evidence.
- iOS `ios/` is generated (CNG, gitignored); native config lives in `app.config.ts`. RNFB on SDK 54 needs each RNFB pod in `forceStaticLinking`.

## Goals / Non-Goals

**Goals:** only the genuine app can call the functions and read/write Firestore once enforced; zero impact on local emulator development; a reversible two-step rollout.

**Non-Goals:** Auth App Check, replay protection, Android, DeviceCheck fallback.

## Decisions

### D1 — Provider: App Attest only (release), nothing in emulator mode

`initializeAppCheck(getApp(), { provider: rnfbProvider, isTokenAutoRefreshEnabled: true })` with `apple: { provider: 'appAttest' }`, run once at startup before any Firestore call, **only when not using emulators**. Entitlement `com.apple.developer.devicecheck.appattest-environment = production`; EAS syncs the App ID capability at build time.

Why: App Attest is available on every iOS 14+ device with a Secure Enclave; DeviceCheck fallback would require an extra private key registration for no benefit. Emulators do not enforce App Check (Firestore emulator ignores it; the functions gate skips in the emulator), so dev builds need no debug token. Alternative: debug provider + console debug token for the simulator — only needed if we ever run a simulator against production, which is not part of the workflow.

### D2 — One `functionsFetch` helper on the client

`services/firebase/functionsFetch.ts` gets a token with `getToken(appCheck, false)` (cached, auto-refreshed) and adds the header. If App Check is not initialised (emulator) or token retrieval fails, the request is sent **without** the header — the server decides. Token failures go to Sentry as a breadcrumb-level message so a broken attestation is visible. A pure `appCheckHeaders(token | null)` is unit-tested.

### D3 — Server gate with monitor / enforce modes

`apps/functions/src/appCheck/appCheckGate.ts` exports `checkAppCheck(req, deps)` → `{ outcome: 'verified' | 'missing' | 'invalid' | 'skipped', allow: boolean }`, with injected `verify` and `mode`. Each of the five user-facing HTTP handlers calls it first; in **monitor** every outcome is allowed and logged (`logger.info('appCheck', { fn, outcome })`), in **enforce** `missing`/`invalid` return `401 { ok: false, error: 'unauthorized' }`. In the emulator (`FUNCTIONS_EMULATOR === 'true'`) the outcome is `skipped`. Mode is a constant in `runtimeOptions.ts` (`APP_CHECK_MODE`); flipping it is a one-line reviewed PR plus deploy.

Alternatives: `onCall` with `enforceAppCheck: true` (requires the RNFB functions native module and rewriting all callers, contradicts ADR-0006); a Functions param / `.env` toggle (still needs a deploy, less traceable than a PR).

### D4 — Rollout (owner-gated)

1. Owner registers the iOS app under App Check → App Attest in the Firebase console (Team ID).
2. Merge this change; owner deploys functions (monitor); owner builds and submits TestFlight (also ships ⑥ MMKV).
3. Owner installs and uses the build; we confirm `appCheck` log lines show `verified` for every function and the console Firestore App Check metrics show verified requests.
4. Follow-up PR sets `APP_CHECK_MODE = 'enforce'`; owner deploys; owner clicks **Enforce** for Cloud Firestore. Enforcement takes up to 15 min.
5. Smoke: `curl` to `fetchQuotes` without a token → 401; app still works.

Rollback: set mode back to monitor and redeploy; un-enforce Firestore in the console.

## Risks / Trade-offs

- [The current TestFlight build stops working after enforcement] → only the owner uses it and installs the new build in step 3 before step 4.
- [App Attest misconfiguration (missing entitlement / console registration) yields no tokens] → monitor phase reveals `missing` outcomes before anything is blocked; Sentry captures token errors.
- [A dev-client build pointed at production on the simulator gets rejected after enforcement] → not a supported workflow; use emulators, or add a debug token later if needed.
- [Extra latency] → `verifyToken` is a local JWT check after the first key fetch; tokens are cached client-side.

## Migration Plan

See D4. No data migration.

## Open Questions

None blocking. The enforcement flip is intentionally a separate small change after the monitoring evidence.
