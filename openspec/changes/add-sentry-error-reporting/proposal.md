# Proposal: add-sentry-error-reporting

## Why

TestFlight production bug（報價永遠載入中）的 debug 全靠後端 Cloud Functions log；**client 端零錯誤能見度**——沒有 crash 上報、沒有錯誤事件、空 catch 靜默吞錯，真機/TestFlight 使用者遇到的任何 JS 錯誤對開發者都是黑盒。MVP 已上 TestFlight（planning §13.2 收尾階段），需要最低成本的 client 端錯誤觀測；Sentry 自 Sprint 6 起即列為 owner gate 待辦。

## What Changes

- 導入 `@sentry/react-native`（Expo config plugin，CNG prebuild）：自動捕捉 unhandled JS error / promise rejection / native crash。
- App 進入點 init：DSN 由建置設定注入；**dev / Emulator 模式停用**（只在 EAS build 生效），不送 PII。
- 既有錯誤 seam 接上：`logQuoteError`（surface-quote-symbol-errors 建立的 seam）與 mobile 各 fail-soft `console.warn` 邊界（useHoldings 等）加送 Sentry 事件（console 行為保留）。
- EAS build 整合 source map 上傳（stack trace 可讀）。

## Capabilities

### New Capabilities

- `error-reporting`：client 端錯誤上報——初始化條件、捕捉範圍、seam 接點、隱私邊界。

### Modified Capabilities

（無——live-quotes 的 logQuoteError 行為不變，僅 sink 增加）

## Impact

- `apps/mobile`：新依賴 `@sentry/react-native` + `app.json`/`app.config` plugin 設定 + 進入點 init + seam 接點（約 3–4 檔）
- `eas.json` / EAS secrets：`SENTRY_AUTH_TOKEN`（source map 上傳）、DSN 設定——**owner 提供**
- **原生模組 → 需 prebuild + 新 EAS build + TestFlight 上傳（owner gate：花錢/部署/真機）**
- **Sentry 帳號與專案建立（owner gate：外部服務註冊）**；free tier 5k errors/月，MVP 單人使用綽綽有餘，**金錢成本 $0**
- `apps/functions`：不動（Cloud Logging 已足夠，本次即靠它破案）

## Non-goals

- 不做 functions 端 Sentry（Cloud Logging 夠用）
- 不做 performance tracing / session replay / release health 儀表（免費額度雖有，MVP 不需要，避免雜訊）
- 不做使用者回饋對話框（Sentry user feedback widget）
- 不回填歷史錯誤、不做告警規則自動化（Sentry 預設 email 通知即可）
