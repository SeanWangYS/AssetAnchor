# function-auth Specification

## Purpose

The user-facing HTTP Cloud Functions verify a Firebase Auth ID token (`Authorization: Bearer`) after the App Check gate, with a monitor/enforce rollout, and the app attaches the signed-in user's ID token to every Cloud Functions call.

## Requirements

### Requirement: 使用者端 HTTP functions 驗證 Firebase ID token

使用者端 HTTP functions（fetchQuote、fetchQuotes、fetchIntraday、fetchSymbolMeta、ensureHistory）SHALL 在 App Check gate 之後驗證 `Authorization: Bearer <Firebase ID token>`。模式由 `AUTH_MODE` 決定：`monitor` SHALL 記錄結果並照常回應；`enforce` 對未帶或無效 token SHALL 回 401 `{ ok: false, error: 'unauthorized' }` 且不呼叫外部 API、不存取 Firestore。每個請求 SHALL 記錄一筆 `auth` log（`fn`、`outcome`、`mode`）。`mcp` function SHALL NOT 套用此 gate。

#### Scenario: 有效 token

- **WHEN** 請求帶有效 ID token
- **THEN** outcome 為 `verified`，請求進入 handler

#### Scenario: enforce 下未帶 token

- **WHEN** `AUTH_MODE = 'enforce'` 且請求沒有 `Authorization` header
- **THEN** 回 401 `{ ok: false, error: 'unauthorized' }`

#### Scenario: monitor 下無效 token

- **WHEN** `AUTH_MODE = 'monitor'` 且 token 驗證失敗
- **THEN** outcome 記為 `invalid`，請求照常處理

### Requirement: App 呼叫 Cloud Functions 時附帶 ID token

mobile 對 Cloud Functions 的所有 HTTP 呼叫 SHALL 經由 `functionsFetch`，在使用者已登入時附 `Authorization: Bearer <idToken>`。取 token 失敗時 SHALL 照常送出但不帶 header，並 SHALL 回報 Sentry（每個 session 至多一次）。未登入時 SHALL NOT 帶 header。

#### Scenario: 已登入呼叫報價

- **WHEN** 已登入使用者開啟持倉總覽觸發 `fetchQuotes`
- **THEN** 請求同時帶 `X-Firebase-AppCheck`（正式環境）與 `Authorization: Bearer <idToken>`

#### Scenario: 本地 emulator

- **WHEN** App 連本地 emulator 並以種子帳號登入
- **THEN** 請求帶 auth emulator 簽發的 ID token，functions emulator 驗證為 `verified`
