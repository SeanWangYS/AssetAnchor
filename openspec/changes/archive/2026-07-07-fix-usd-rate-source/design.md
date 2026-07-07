# fix-usd-rate-source — 設計

## Context

`fetchAndStoreUsdRate`（`apps/functions/src/exchangeRates/fetchAndStore.ts`）自 Sprint 4 起抓台銀 L6M CSV；2026-06-30 起台銀全站上 anti-bot JS challenge，伺服器端不可行。報價層（ADR-0006/0010）已有同專案內、production 驗證過的 Yahoo chart 抓取鏈：`quotes/yahooProvider.ts`（QuoteProvider 介面）＋ `quotes/parseYahooChart.ts`（純解析）。本 change 讓匯率改走同一條 Yahoo 端點慣例。三端影響已於 proposal 評估：mobile 零變更、shared 僅 `RateType` additive、functions 換抓取段。

## Goals / Non-Goals

**Goals**

- 恢復 `exchange_rates` 每日更新，資料源可長期無人值守
- 解析邏輯為純函式、TDD、fail loud（沿專案測試紀律 §13.4 / ADR-0007）
- 文件結構 / 安全模型 / 消費端介面零變更

**Non-Goals**

- 不做多幣別擴充（仍只有 USD/TWD 雙向）
- 不回填 6/30–上線日的缺口（app 讀「最新一筆」，缺口日無消費場景）
- 不引入第三方付費匯率 API、不加 API key 管理
- 不重構報價層共用抽象（見 Decisions D3）

## Decisions

**D1：資料源＝Yahoo chart `TWD=X`，而非其他免費源**
`TWD=X` 即「1 USD = N TWD」。同專案已有兩條 production 驗證的 Yahoo 抓取（報價、歷史），429 風險已知且有 ADR-0010 的請求慣例（誠實 UA）。替代案：`exchangerate.host`（shared type 已預留 union 值）——需 API key 且免費層限流；台銀其他端點——全站被擋。選 Yahoo：零新依賴、風險池與報價層共用（監控一處看完）。

**D2：`rate_type` 新增 `'market'`，不沿用 `'spot_sell'`**
Yahoo 給的是市場中間/最新價，非台銀「即期賣出」。沿用舊值語義不誠實；`RateType` union 加值屬 additive（不破壞既有讀者），消費端已驗證不依賴此欄。

**D3：新增獨立的 `parseYahooFxRate` 純函式，不重用 `parseYahooChart`**
`parseYahooChart` 回 `RawQuote`（price/prevClose，for 報價卡）；匯率需要的是 `{date, rate}`（含 Asia/Taipei 日期換算），語義不同。硬套會讓兩個消費端互相牽制（改一邊壞另一邊）。抓取端點與 UA 慣例相同、解析各自純函式——重複的是 ~5 行 fetch 樣板，換得解耦。時區換算用 `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' })`（Node 22 內建 ICU，`en-CA` 直接輸出 `YYYY-MM-DD`），不引日期庫。

**D4：排程改 `30 9 * * *` Asia/Taipei（09:30）**
原 16:30 是遷就台銀牌告時間。外匯近全天候，任何時刻抓都是「最新市場價」；選台北早盤時段（週二至週六 09:30 對應外匯活躍時段），使用者白天看到的匯率即當日。時刻本身非關鍵決策，可調。

**D5：`seedUsdRate` 手動端點保留原樣**
仍是「呼叫同一 `fetchAndStoreUsdRate` 的 onRequest」，部署後可手動補種第一筆（注意：production 需以有 run.invoker 權限的身分呼叫，或部署後靠排程自然補上）。

## Risks / Trade-offs

- [Yahoo 429 / 封鎖 GCP IP] → 與報價層同一風險池（ADR-0010 已知），一處失效會一起失效；接受並同源監控，屆時整批換源。fail loud 讓 logs 可見。
- [市場價 vs 銀行牌告的語義差] → MVP 僅用於展示層總值換算，差異 <1%；owner 已拍板接受。文件 `rate_type: 'market'` 誠實標示，未來要回牌告語義時可按 `rate_type` 區分新舊。
- [排程當下恰逢 Yahoo 短暫故障] → 該日不寫入（fail loud），app fallback 用前一日；次日排程自然補回最新。不做重試佇列（複雜度不值）。

## Migration Plan

1. 實作 + 測試全綠（shared coverage gate 照舊）
2. PR + owner merge（functions 邏輯 + shared type，跨端屬高風險層）
3. 🛑 `firebase deploy --only functions`（花錢/部署 gate，owner 授權後執行）
4. 部署後驗證：`firebase functions:log --only scheduledUsdRate` 次日確認成功寫入；或即刻以授權身分打 `seedUsdRate` 驗證
5. 回滾：revert PR + 重新 deploy（舊 code 對台銀已失效，回滾僅為止血 Yahoo 版新問題，無資料遷移需回退）

## Open Questions

（無——D4 排程時刻若 owner 有偏好可於 review 時改，一行設定。）
