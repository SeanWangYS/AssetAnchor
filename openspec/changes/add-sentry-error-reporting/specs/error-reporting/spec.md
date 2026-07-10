# error-reporting Specification

## Purpose

client 端錯誤上報（Sentry）：讓 TestFlight / 真機使用者遇到的 JS 錯誤、native crash 與已知 fail-soft 邊界事件對開發者可見，補上「後端有 Cloud Logging、前端全黑」的觀測缺口。

## ADDED Requirements

### Requirement: Sentry 初始化與啟用條件

`apps/mobile` SHALL 於 App 進入點初始化 `@sentry/react-native`。初始化 SHALL 僅在**非 dev 且非 Emulator 模式**（EAS build 連正式 Firebase 的組態）啟用；dev / `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true` 時 SHALL 完全停用（不 init 或 DSN 留空）。DSN SHALL 由建置設定注入，不硬編碼於原始碼。`sendDefaultPii` SHALL 為 false；事件不得夾帶使用者 email 或交易金額內容。

#### Scenario: production build 啟用

- **WHEN** EAS build（連正式 Firebase）啟動 App
- **THEN** Sentry 初始化完成，unhandled error 會上報

#### Scenario: dev / Emulator 停用

- **WHEN** 本機開發（dev client 或 Emulator 模式）啟動 App
- **THEN** Sentry SHALL 不上報任何事件（本機錯誤不進 dashboard）

### Requirement: 自動捕捉範圍

啟用時系統 SHALL 自動捕捉：unhandled JS exception、unhandled promise rejection、native crash。上報事件 SHALL 附可讀 stack trace（EAS build 流程 SHALL 上傳 source map）。

#### Scenario: unhandled JS 錯誤上報

- **WHEN** production build 發生未捕捉的 JS 錯誤
- **THEN** Sentry dashboard 出現事件，stack trace 對應到原始 TS 檔（非 minified bundle）

### Requirement: 既有 fail-soft 邊界接入

既有集中式錯誤 seam SHALL 加送 Sentry 事件（保留原 console 行為）：`logQuoteError`（報價鏈路）、holdings 推導 fail-soft 邊界（useHoldings 的 console.warn 處）。接入 SHALL 集中於 seam 函式內，呼叫端不重複散布 Sentry 呼叫。

#### Scenario: 報價錯誤事件上報

- **WHEN** production build 中 `logQuoteError` 被呼叫（如 fetchQuotes HTTP 失敗）
- **THEN** Sentry 收到對應事件（含 stage 與去識別化 detail），console.warn 照舊輸出

#### Scenario: dev 模式 seam 不上報

- **WHEN** dev / Emulator 模式中 seam 被呼叫
- **THEN** 僅 console 輸出，無 Sentry 事件
