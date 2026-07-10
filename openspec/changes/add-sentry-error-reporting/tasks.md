# Tasks: add-sentry-error-reporting

## 1. 依賴與設定

- [x] 1.1 安裝 `@sentry/react-native`、app config 加 Sentry expo plugin（organization/project 佔位，DSN 走 `EXPO_PUBLIC_SENTRY_DSN`）
- [x] 1.2 進入點 init：`__DEV__ || EXPO_PUBLIC_USE_FIREBASE_EMULATOR==='true'` 時不 init；`sendDefaultPii:false`
- [ ] 1.3 `npx expo prebuild` 後 iOS Simulator smoke test：dev 模式 App 正常啟動、Sentry 停用（無事件）

## 2. seam 接入

- [x] 2.1 `logQuoteError` 加送 Sentry 事件（保留 console.warn；detail 限 symbolId/stage/HTTP status）
- [x] 2.2 `useHoldings` 等既有 fail-soft console.warn 邊界收斂進 seam 或加送事件（不散布 Sentry import 到 features 層）
- [x] 2.3 `pnpm -r typecheck lint test` + `pnpm format:check` 全綠

## 3. owner gates（記入 PR，AI 不自行執行）

- [ ] 3.1 owner：建 Sentry 帳號/專案（free tier），提供 DSN；`SENTRY_AUTH_TOKEN` 進 EAS secrets、DSN 進 eas.json env
- [ ] 3.2 owner：EAS build → TestFlight 上傳
- [ ] 3.3 owner：真機觸發一顆測試錯誤，驗證 dashboard 收到且 stack trace 可讀（source map 生效）
- [ ] 3.4 開 PR（stacked on guard-transaction-market-consistency 分支）
