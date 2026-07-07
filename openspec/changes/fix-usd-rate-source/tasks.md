# fix-usd-rate-source — 任務

## 1. Shared 型別（additive）

- [x] 1.1 `packages/shared/src/types/exchange-rate.ts`：`RateType` union 新增 `'market'`，註解更新（BOT 牌告值保留為歷史文件相容）；跑 shared 測試確認無破壞

## 2. Yahoo 匯率解析純函式（TDD：先測後實作）

- [x] 2.1 新增 `apps/functions/src/exchangeRates/parseYahooFxRate.test.ts`：合法回應抽出 `{date, rate}`／UTC-台北跨日換算（UTC 16:00+ = 台北翌日）／缺 price、非正數、缺時戳各 fail loud——先寫、確認紅燈
- [x] 2.2 實作 `parseYahooFxRate.ts`（純函式，`Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Taipei'})` 換日期），測試轉綠

## 3. 抓取與寫入改源

- [x] 3.1 重寫 `fetchAndStore.ts` 的 `fetchAndStoreUsdRate`：Yahoo chart `TWD=X`（誠實 UA，同 yahooProvider 慣例）→ `parseYahooFxRate` → `Money` 雙向序列化 → 寫 `exchange_rates/{date}`（`source:'YAHOO'`、`rate_type:'market'`，其餘欄位照舊）
- [x] 3.2 排程改 `30 9 * * *` Asia/Taipei（design D4）；`seedUsdRate` 不動
- [x] 3.3 移除 `parseBotCsv.ts` 與 `parseBotCsv.test.ts`，清掉殘留 import

## 4. 驗證與收線

- [x] 4.1 `pnpm -r typecheck && pnpm -r lint && pnpm --filter @assetanchor/shared test:coverage && pnpm --filter @assetanchor/functions test`（若 functions 無獨立 test script 則以 workspace 測試指令為準）全綠
- [x] 4.2 本機 emulator 煙霧測試：`emulators` 起 functions 後打本地 `seedUsdRate`，確認寫入 `exchange_rates/{今日}` 且欄位值正確
- [ ] 4.3 開 PR（fix branch，stacked 於 main）；PR body 註明部署 gate 待 owner 授權
- [ ] 4.4 🛑 owner 授權後 `firebase deploy --only functions`；部署後打 production 驗證或次日看 `functions:log` 確認排程成功寫入
