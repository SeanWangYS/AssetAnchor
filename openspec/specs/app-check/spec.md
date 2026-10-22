# app-check Specification

## Purpose

The iOS app attests itself with App Attest and sends App Check tokens to Firestore (SDK) and to the user-facing Cloud Functions (`X-Firebase-AppCheck` header); the functions verify tokens with a monitor/enforce gate, and both are enforced in production since 2026-10-22.

## Requirements

### Requirement: iOS App 以 App Attest 取得 App Check token

正式環境（非 emulator 模式）的 iOS App SHALL 在任何 Firebase 後端呼叫前初始化 App Check，provider SHALL 為 App Attest，並開啟 token 自動更新；App SHALL 帶 `com.apple.developer.devicecheck.appattest-environment = production` entitlement。連本地 emulator 時（`EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true`）SHALL NOT 初始化 App Check。

#### Scenario: 正式 build 啟動

- **WHEN** TestFlight build 啟動
- **THEN** App Check 以 App Attest 初始化，Firestore 請求自動附帶 App Check token

#### Scenario: emulator 開發

- **WHEN** App 以 emulator 模式在模擬器啟動
- **THEN** 不初始化 App Check，報價、走勢等功能照常運作

### Requirement: 呼叫 Cloud Functions 時附帶 App Check token

mobile 對 Cloud Functions 的所有 HTTP 呼叫 SHALL 經由單一 helper，在取得 token 時加上 `X-Firebase-AppCheck` header。取不到 token（未初始化或失敗）時 SHALL 照常送出但不帶 header，並 SHALL 回報 Sentry（取得失敗時）。

#### Scenario: 帶 token 呼叫

- **WHEN** App Check 已初始化並取得 token，App 呼叫 `fetchQuotes`
- **THEN** 請求帶 `X-Firebase-AppCheck: <token>`

#### Scenario: token 取得失敗

- **WHEN** 取 token 失敗
- **THEN** 請求仍送出但不帶 header，錯誤回報 Sentry

### Requirement: Functions 驗證 App Check token（monitor / enforce）

面向使用者的 HTTP functions（`fetchQuotes`、`fetchQuote`、`fetchIntraday`、`fetchSymbolMeta`、`ensureHistory`）SHALL 在處理前以 Admin SDK 驗證 `X-Firebase-AppCheck`，判定為 `verified`、`missing`、`invalid` 之一並寫入 log（含 function 名稱）。模式為 `monitor` 時 SHALL 一律照常處理；模式為 `enforce` 時 `missing` 或 `invalid` SHALL 回 HTTP 401 `{ ok: false, error: 'unauthorized' }` 且不呼叫 Yahoo、不讀寫 Firestore。在 Functions emulator 中 SHALL 跳過驗證（判定 `skipped`）。

#### Scenario: monitor 模式缺 token

- **WHEN** 模式為 `monitor`，請求未帶 header
- **THEN** 記錄 `missing` 並照常回應

#### Scenario: enforce 模式缺 token

- **WHEN** 模式為 `enforce`，請求未帶 header
- **THEN** 回 401，不執行業務邏輯

#### Scenario: enforce 模式 token 無效

- **WHEN** 模式為 `enforce`，token 驗證失敗
- **THEN** 判定 `invalid` 並回 401

#### Scenario: 有效 token

- **WHEN** token 驗證成功
- **THEN** 判定 `verified` 並照常處理（兩種模式皆然）

#### Scenario: emulator

- **WHEN** 在 Functions emulator 執行
- **THEN** 判定 `skipped`，照常處理

### Requirement: 分階段啟用強制驗證

App Check SHALL 先以 `monitor` 部署；只有在新版 TestFlight build 的實際使用中，log 顯示各 function 皆為 `verified`、且 console 的 Firestore App Check 指標顯示已驗證請求後，才 SHALL 切換 functions 為 `enforce` 並於 console 啟用 Cloud Firestore 強制驗證。切換與回退 SHALL 由 owner 部署／操作。

#### Scenario: 切換前檢查

- **WHEN** 準備切換為 enforce
- **THEN** 已有新版 build 的 `verified` log 證據與 Firestore 指標截圖，否則不切換
