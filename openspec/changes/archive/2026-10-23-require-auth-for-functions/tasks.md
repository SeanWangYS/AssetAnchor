## 1. Functions

- [x] 1.1 TDD：`auth/idTokenGate.ts` 純函式 `checkIdToken` + 測試（monitor/enforce × verified/missing/invalid、Bearer 解析）
- [x] 1.2 `runtimeOptions.ts` 加 `AUTH_MODE = 'monitor'`
- [x] 1.3 `userHttpFunction` 在 App Check 之後接 ID token gate，加 `auth` label 與 log
- [x] 1.4 `runtimeOptions.test.ts`：USER_HTTP 皆有 auth label、mcp 沒有、`AUTH_MODE` 斷言

## 2. Mobile

- [x] 2.1 TDD：`authHeaders.ts` 純函式 + 測試，加入 jest coverage 名單
- [x] 2.2 `functionsFetch` 移到 `functionsFetch.ts`，合併 App Check 與 ID token header；取 token 失敗回報 `auth:idtoken`（每 session 一次）

## 3. 文件

- [x] 3.1 runbook `docs/runbook/function-auth-rollout.md`（monitor → enforce、驗證查詢、回退）

## 4. 驗證

- [x] 4.1 typecheck / lint / prettier / functions test / mobile test 全綠
- [x] 4.2 本地 emulator：模擬器登入後，functions log 的 `auth` outcome 為 `verified`；curl 不帶 token 為 `missing`（monitor 照常回應）
