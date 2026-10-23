# Runbook：使用者端 HTTP functions 要求登入（Firebase ID token）

> 對應 OpenSpec change `require-auth-for-functions`。部署／真機屬人類介入 gate（planning §2.5），每一步由 owner 執行或逐字授權。
> **狀態**：`AUTH_MODE = 'monitor'`（只記錄、照常回應）。enforce 需等帶 ID token 的新 TestFlight build 安裝後。

## 機制

App 已登入時，`functionsFetch` 在每個 Cloud Functions 請求附 `Authorization: Bearer <Firebase ID token>`（SDK 快取、約每小時自動更新）。`userHttpFunction` 先過 App Check gate，再用 Admin SDK `verifyIdToken` 驗 ID token，log 一筆 `auth`：`{ fn, outcome, mode, uid?, reason? }`。

| outcome    | 意義                                                          | monitor | enforce |
| ---------- | ------------------------------------------------------------- | ------- | ------- |
| `verified` | token 有效，log 帶 `uid`                                      | 放行    | 放行    |
| `missing`  | 沒有 `Authorization: Bearer` header（舊 build、未登入、curl） | 放行    | 401     |
| `invalid`  | 驗證失敗，`reason` 為錯誤碼（如 `auth/id-token-expired`）     | 放行    | 401     |

開關：`apps/functions/src/runtimeOptions.ts` 的 `AUTH_MODE`。`mcp` function 不經此 gate（走自己的 OAuth）。

## 階段 1：monitor（本 change merge 後）

1. owner：`npx -y firebase-tools@15.34.1 deploy --only functions --project assetanchor-832df --non-interactive`
2. 此時舊 build（≤ 0.2.0 (15)）的請求會記為 `missing`，屬預期。
3. 下次 TestFlight 發版（流程見 `testflight-release.md`）→ 手機安裝新 build、開 App 看持倉與走勢。
4. 驗證（Claude 可代做）：
   ```bash
   npx -y firebase-tools@15.34.1 functions:log --project assetanchor-832df -n 300 | grep '"auth"'
   ```
   期望新 build 的請求皆為 `"outcome":"verified"`。`invalid` 看 `reason`；`missing` 代表 App 沒附 token（檢查是否登入、Sentry 的 `auth:idtoken` 事件）。

## 階段 2：enforce（有 verified 證據後）

1. 開小 PR：`AUTH_MODE = 'enforce'`，同步改 `runtimeOptions.test.ts` 的斷言（owner merge）→ owner 部署 functions。
2. 煙霧測試：
   ```bash
   # 沒帶 ID token → 401（App Check enforce 已先擋，故任何無 App Check 的 curl 本來就是 401；
   # 真正驗證 enforce 的是 log：新 build 的請求 outcome 皆為 verified、手機功能正常）
   curl -s -o /dev/null -w '%{http_code}\n' "https://asia-east1-assetanchor-832df.cloudfunctions.net/fetchQuotes?items=US:AAPL:USD"
   ```
   手機 App 報價、走勢、新增代號仍正常。

## 回退

`AUTH_MODE` 改回 `'monitor'` → 部署 functions。

## 本地開發

- functions emulator 與 auth emulator 一起跑（`emulators:fn`）時，Admin SDK 接受 emulator 簽發的 token，本地走同一條驗證路徑（不像 App Check 會 `skipped`）。
- 若 emulator 資料被重設（例如 export 失敗回到舊快照），App 快取的舊 session 會被判 `invalid`、`reason: auth/id-token-revoked`。在 App 登出再用 `test@assetanchor.dev` / `test1234` 登入即可。
- 用 curl 測試時，可向 auth emulator 取 token：
  ```bash
  curl -s -X POST "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake" \
    -H 'content-type: application/json' \
    -d '{"email":"test@assetanchor.dev","password":"test1234","returnSecureToken":true}'
  ```
