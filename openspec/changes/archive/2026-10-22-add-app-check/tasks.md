## 1. Functions gate (monitor)

- [x] 1.1 Write `appCheck/appCheckGate.test.ts` (TDD): verified / missing / invalid / skipped outcomes; monitor always allows; enforce rejects missing and invalid
- [x] 1.2 Implement `checkAppCheck` with injected verifier and mode; add `APP_CHECK_MODE = 'monitor'` to `runtimeOptions.ts`
- [x] 1.3 Wire the gate into the five user-facing HTTP handlers (log outcome with function name; 401 path for enforce); extend the runtime guard test so every user HTTP function is gated

## 2. Mobile App Check

- [x] 2.1 Add `@react-native-firebase/app-check@^24`, config plugin, `forceStaticLinking` entry and App Attest entitlement in `app.config.ts`
- [x] 2.2 `services/firebase/appCheck.ts`: initialise App Attest provider once before Firebase use, skipped in emulator mode
- [x] 2.3 Pure `appCheckHeaders` + test; `functionsFetch` helper (token → header, failure → no header + Sentry); add to mobile coverage list
- [x] 2.4 Switch the four call sites (`quotesStore`, `historyStore` ×2, `symbolsStore`) to `functionsFetch`

## 3. Verify locally

- [x] 3.1 DoD: typecheck, lint, prettier, shared coverage, functions tests, mobile tests/coverage
- [x] 3.2 Prebuild + simulator build (emulator mode): app loads quotes, trend, symbol add; functions emulator logs `skipped`
- [x] 3.3 Write rollout runbook section (`docs/runbook/app-check-rollout.md`): console registration, monitor checks, enforce flip, rollback

## 4. Owner-gated rollout (monitor)

- [x] 4.1 Owner: register iOS app with App Attest in Firebase console
- [x] 4.2 Owner: merge PR, deploy functions, EAS build + submit TestFlight
- [x] 4.3 Owner installs and uses the build; confirm `verified` in function logs and Firestore App Check metrics
