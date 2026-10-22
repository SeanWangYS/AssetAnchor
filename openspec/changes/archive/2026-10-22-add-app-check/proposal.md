## Why

The Cloud Functions are public HTTPS endpoints and Firestore accepts any client holding a Firebase config, so anyone can script calls that cost money (Yahoo-backed functions, Firestore reads). Change ② (`functions-scaling-limits`) bounded the burn rate; App Check closes the door by accepting only requests from the genuine iOS app. This is item ⑦ of the 2026-10-20 requirements session, the last backend item before the next TestFlight native build (which also carries ⑥'s MMKV).

Planning references: `docs/portfolio_tracker_planning.md` §2.5 (spending, deploy and device work are human gates), §3 (MVP scope unchanged), ADR-0006 (quote functions are `onRequest`, called with `fetch`).

## What Changes

- Mobile adds `@react-native-firebase/app-check` (new native dependency; config plugin) with the **App Attest** provider and the App Attest entitlement. App Check is initialised before any Firebase call in release builds; it is skipped when the app runs against local emulators.
- All four mobile `fetch` calls to Cloud Functions go through one helper that attaches the `X-Firebase-AppCheck` token. Firestore SDK calls attach tokens automatically.
- The five user-facing HTTP functions verify the token with the Admin SDK through a shared gate. The gate has two modes: **monitor** (log the outcome, always serve) and **enforce** (reject missing or invalid tokens with 401). This change ships **monitor**; the emulator skips verification.
- Rollout runbook: monitor → install the new TestFlight build → confirm verified traffic in logs and in the console App Check metrics → flip functions to **enforce** (small follow-up PR + deploy) and enable Firestore enforcement in the console.

## Non-goals

- App Check for Firebase Authentication, Realtime Database or Storage (not used / not chosen).
- Replay protection (limited-use tokens) — beta, adds latency per request.
- Android provider (MVP is iOS only); DeviceCheck fallback (every supported device has App Attest).
- HTTP sign-in requirement, rules field validation, rate limiting — later backlog.
- Phase 2/3 product features.

## Capabilities

### New Capabilities

- `app-check`: the iOS app attests itself with App Attest; Cloud Functions verify App Check tokens (monitor/enforce); Firestore enforcement is enabled in the console after monitoring.

### Modified Capabilities

(none — quote, history and symbol behaviour is unchanged for the genuine app)

## Impact

- `apps/mobile`: new dependency `@react-native-firebase/app-check@^24`, config plugin + `forceStaticLinking` entry + `ios.entitlements`; new `services/firebase/appCheck.ts` and `functionsFetch` helper; four call sites switch to it. Requires prebuild and a new native build.
- `apps/functions`: new `appCheck/appCheckGate.ts` (+ tests) used by the five user-facing HTTP functions.
- No schema or rules changes.
- **Owner gates**: register the iOS app with App Attest in the Firebase console (Apple Team ID); deploy functions; EAS build + TestFlight submit; install on device; later flip enforcement (functions deploy + Firestore console toggle).
