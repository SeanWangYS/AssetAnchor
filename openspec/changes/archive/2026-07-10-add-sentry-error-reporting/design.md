# Design: add-sentry-error-reporting

## Context

mobile 端無任何錯誤上報基建（無 Sentry/Crashlytics）；fail-soft 邊界只有零散 console.warn；surface-quote-symbol-errors 會建立 `logQuoteError` 集中 seam。專案為 Expo SDK 54 CNG/prebuild + EAS Build；dev 走 Emulator、真機/TestFlight 連正式 Firebase——這個既有分流旗標（`EXPO_PUBLIC_USE_FIREBASE_EMULATOR`）可直接復用為 Sentry 啟用條件。

## Goals / Non-Goals

**Goals**：production build 的 unhandled error / crash / 已知 fail-soft 事件可在 dashboard 看到、stack trace 可讀、$0 成本、dev 零雜訊。
**Non-Goals**：functions 端 Sentry、performance tracing、session replay、user feedback widget（見 proposal）。

## Decisions

- **D1 選 `@sentry/react-native`（官方 Expo config plugin）而非 Crashlytics**：Sentry 對 JS-first RN app 的 stack trace / source map 體驗較好、與 Expo CNG 整合成熟（`npx @sentry/wizard` 或手動 plugin）、free tier 5k events/月；Crashlytics 偏 native crash、JS 錯誤需額外橋接。_替代_：Firebase Crashlytics（已在 Firebase 生態）——JS 錯誤支援弱，否決；自建 log collection——維護成本不成比例，否決。
- **D2 啟用條件復用 Emulator 旗標**：`__DEV__ || EXPO_PUBLIC_USE_FIREBASE_EMULATOR==='true'` → 不 init。與 firebase 接線同一分流點，心智模型一致。
- **D3 DSN 走 `EXPO_PUBLIC_SENTRY_DSN`**（eas.json env / EAS secrets）：DSN 非機密（client 端本就可見），但仍不硬編碼，方便換專案；`SENTRY_AUTH_TOKEN`（source map 上傳用）是機密，只進 EAS secrets。
- **D4 seam 內接入**：Sentry 呼叫只出現在 `logQuoteError` 等 seam 函式與進入點 init；features 層不 import Sentry（維持依賴方向紀律，Sentry 屬 services/core 層）。
- **D5 隱私**：`sendDefaultPii:false`；seam 傳入 detail 以 symbolId/stage/HTTP status 為限，不含金額、email、uid。

## Risks / Trade-offs

- [原生模組需 prebuild，可能與現有原生設定衝突] → config plugin 標準流程；prebuild 後跑 Simulator smoke test 再交 owner build。
- [source map 上傳失敗 → stack 不可讀] → build 流程驗證一次；失敗不擋 build（事件仍可收，僅可讀性降）。
- [免費額度爆量（錯誤風暴）] → Sentry 內建 rate limit + MVP 單人使用，風險極低；dashboard 可設 spike protection。

## Migration Plan

1. mobile code + plugin 設定（AI 可自走，Simulator dev 驗證「停用」路徑）。
2. **owner gate**：Sentry 帳號/專案建立、提供 DSN + AUTH_TOKEN 進 EAS secrets。
3. **owner gate**：EAS build → TestFlight 上傳 → 真機驗證一顆測試錯誤有進 dashboard。
   回退＝移除 plugin 與 init、重新 prebuild，無資料副作用。

## Open Questions

- Sentry org/project 命名與 region（EU/US）——owner 建帳號時決定。
