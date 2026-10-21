## 1. Shared runtime options + enforcement test

- [x] 1.1 Write `src/runtimeOptions.test.ts` (TDD): enumerate `index.ts` exports' `__endpoint`, assert region `asia-east1`, `1 ≤ maxInstances ≤ 3`, user HTTP = 3, background = 1 (fails first)
- [x] 1.2 Add `src/runtimeOptions.ts` (`REGION`, `USER_HTTP_OPTIONS`, `BACKGROUND_OPTIONS`) and switch all 8 function definitions to it; remove per-file `REGION` constants; test passes

## 2. ensureHistory time budget

- [x] 2.1 Write tests for `runEnsureBatch` (TDD): throttle between fetched items, error isolation, deferral once elapsed ≥ budget, completed results preserved (injected clock/sleep)
- [x] 2.2 Extract `runEnsureBatch` from the handler, wire `budgetMs = 50_000`, set `timeoutSeconds: 120`

## 3. Yahoo request timeout

- [x] 3.1 Add test that a hung fetch aborts after the timeout (fake fetch honouring `signal`), then add `AbortSignal.timeout(8_000)` to `fetchChart`

## 4. Verify

- [x] 4.1 DoD: `pnpm -r typecheck`, `pnpm -r lint`, `pnpm exec prettier --check .`, functions `test`, shared `test:coverage`
- [x] 4.2 Local smoke on emulators:fn: build functions, call `ensureHistory` and `fetchQuotes`, app loads quotes/trend on simulator
- [x] 4.3 Open PR (owner merge + owner `firebase deploy --only functions`); after deploy verify `maxScale` / timeout via Cloud Run Admin API
