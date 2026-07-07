# fix-usd-rate-source — 匯率源從台銀 CSV 換成 Yahoo TWD=X

## Why

台銀 `rate.bot.com.tw` 全站自 ~2026-06-30 起對非瀏覽器 client 回 anti-bot JS challenge（需執行 JavaScript + cookie，非誠實 UA 可解），`scheduledUsdRate` 排程自此每日 08:30 UTC 必失敗，production `exchange_rates` 最新一筆停在 **2026-06-29**。app 以「最近一日匯率」fallback 不會壞，但美金換算隨時間漂移；TestFlight 已上線給真實使用者（2026-07-07 首發），需儘快恢復每日更新。Yahoo Finance chart 端點（誠實 UA）已於 production GCP IP 實測穩定可用（fetchQuote/ensureHistory 同源），是現成的替代源。

## What Changes

- `apps/functions` 的 `fetchAndStoreUsdRate` 改用既有 Yahoo chart 端點（`TWD=X`，1 USD = N TWD）取匯率，替換台銀 CSV 抓取
- 新增可獨立測試的純函式：Yahoo chart 回應 → `{ date, rate }`（date 取自來源時戳的 Asia/Taipei 日曆日 = 實際資料日，維持「非交易日不產生假日空文件」語義）
- `exchange_rates/{date}` 文件欄位**結構不變**；值變更：`source: 'YAHOO'`（union 既有值）、`rate_type: 'market'`（**shared `RateType` union 新增此值**，additive）
- 台銀 `parseBotCsv` 與其測試退役（隨實作移除；spec 對應 requirement 以 delta 移除）
- 排程時間由「台銀牌告固定後（16:30 Asia/Taipei）」改為不受牌告時間約束的每日固定時刻（外匯市場近全天候，取當下最新市場價即可）
- 不動：Money 10 位小數紀律、雙向 `USD_TWD`/`TWD_USD` 預存、idempotent 覆寫、client 唯讀 rules、mobile 端（不讀 `source`/`rate_type`，零變更）

## Capabilities

### New Capabilities

（無——本 change 不引入新 capability）

### Modified Capabilities

- `exchange-rates`：三個 requirement 層級變更——①「每日台銀匯率抓取與寫入」的資料源由台銀牌告改為 Yahoo `TWD=X` 市場價（寫入紀律不變）；②「BOT CSV 解析」requirement 移除，代之以「Yahoo chart 匯率解析（純函式、fail loud）」；③「exchange_rates 文件形狀」的 `source`/`rate_type` 值由 `"BOT"`/`"spot_sell"` 改為 `"YAHOO"`/`"market"`（欄位結構不變）

## Impact

- **functions**：`src/exchangeRates/fetchAndStore.ts` 重寫抓取段；`parseBotCsv.ts`（+測試）移除；新增 Yahoo 匯率解析純函式＋測試（TDD）。`scheduledUsdRate`/`seedUsdRate` 介面與匯出不變
- **shared**：`types/exchange-rate.ts` 的 `RateType` union 新增 `'market'`（additive；`source` union 已含 `'YAHOO'` 無須改）。無 zod schema 影響（exchange_rates 無 client 寫入 schema）
- **mobile**：零變更（`exchangeRatesStore` 只讀 `date`/`rates`，已 grep 驗證不依賴 `source`/`rate_type` 值）
- **firebase rules/indexes**：零變更（安全模型不動）
- **資料語義**：匯率基準由「台銀即期賣出」變「Yahoo 市場中間/最新價」——顯示用途差異極小（MVP 僅用於總值換算展示），為 owner 已拍板的取捨
- **部署**：完成後需 `firebase deploy --only functions`（花錢/部署 gate，依慣例另行取得 owner 授權）
- **風險**：Yahoo 對 GCP IP 的 429（ADR-0010 已知）——與報價層共用同一風險池，若 Yahoo 整體被封鎖，報價與匯率同時失效（可接受：同源監控、屆時一併換源）
