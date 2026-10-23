## Why

App Check（2026-10-22 enforce）只證明「請求來自正版 App」，不證明「是哪個使用者」：使用者端的 5 支 HTTP functions（fetchQuote / fetchQuotes / fetchIntraday / fetchSymbolMeta / ensureHistory）目前不檢查登入。只要能拿到正版 App 的 App Check token（例如裝了 TestFlight 但未登入），就能無身分地觸發 Yahoo 抓取與 Firestore 寫入。要求 Firebase Auth ID token 讓每個請求可追溯到 uid，也是之後做 per-user rate limit 的前提。

## What Changes

- functions：`userHttpFunction` 在 App Check gate 之後加一道 **ID token gate**，驗 `Authorization: Bearer <Firebase ID token>`（Admin SDK `verifyIdToken`），模式 `AUTH_MODE: 'monitor' | 'enforce'`，與 App Check 相同的分階段上線。
- 初始上線為 **monitor**（只記錄 `auth` outcome、照常回應）；新 TestFlight build 上線並在 log 看到 App 請求皆 `verified` 後，另開小 PR 切 **enforce**（未帶 / 無效 → 401 `{ ok:false, error:'unauthorized' }`）。
- mobile：Cloud Functions 呼叫統一經 `functionsFetch`，在使用者已登入時附 `Authorization: Bearer <idToken>`；取 token 失敗時照送不帶 header，並回報 Sentry（每 session 一次）。
- `mcp` function 不受影響（走自己的 OAuth）。

## Capabilities

### New Capabilities

- `function-auth`：使用者端 HTTP functions 的 Firebase Auth ID token 驗證與 monitor/enforce 分階段上線。

### Modified Capabilities

（無；`app-check` 的 gate 行為不變）

## Impact

- `apps/functions/src/appCheck/userHttpFunction.ts`、新增 `apps/functions/src/auth/idTokenGate.ts`（純函式 + 測試）、`runtimeOptions.ts`（`AUTH_MODE`）、`runtimeOptions.test.ts`
- `apps/mobile/src/services/firebase/`：`functionsFetch` 移到獨立檔、新增 `authHeaders.ts`（純函式 + 測試）
- 部署：functions（owner）；App 改動需新 TestFlight build 才會帶 ID token → enforce 必須等新 build 安裝後。
- 無 schema / Money / 原生依賴變更。
