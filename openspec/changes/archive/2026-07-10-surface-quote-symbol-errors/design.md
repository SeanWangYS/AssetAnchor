# Design: surface-quote-symbol-errors

## Context

正式站實錄（2026-07-09 functions log）：交易存成 `market=US` 的台股 ETF（0050 / 00631L）→ `toYahooSymbol` 不加 `.TW` → Yahoo HTTP 404 → 錯誤鏈路逐層失真：

1. `yahooProvider.ts` 擲一般 `Error("Yahoo fetch 失敗：HTTP 404（0050）")`——**錯誤類型不可辨識**（404 永久 vs 429/5xx 暫時）。
2. `fetchQuotes.ts:27-30` per-item catch 回 `{error}`（僅訊息字串）+ `logger.error`（只有 server 看得到）。
3. mobile `quotesBatch.ts` `parseFetchQuotesResponse` 只取成功筆，**error 筆被丟棄**（與「無資料」不可區分）。
4. `quotesStore.ts:79-81` `triggerFetchQuotes` 空 `catch {}`；`readFirestoreCache` catch 回 null——**client 零記錄**。
5. `holdingsHero.ts` 無報價 → `pendingCount` → `includedCount===0` → hero=null → UI 永遠「報價載入中…」。

約束：不動 Firestore schema（聖牛；錯誤是 runtime 狀態不落地）、不動 `firestore.rules`；金額一律 `Money`（ADR-0005）；UI 對齊 `docs/design/holdings-overview/holdings-overview-spec.md` 既有降級橫幅模式（沿 resilient-quote-display 前例，確切文案/位置於視覺對圖與 owner 確認）；不動 15min TTL 與 cache 架構（ADR-0006）。

## Goals / Non-Goals

**Goals**

- 錯誤在鏈路每一層保真：provider 分類 → 批次端點帶 code → client 解析保留 → store 記錄 → UI 顯示出口。
- `symbol_not_found` 有明確 UI 出口（清單列標示 + Hero 降級文案），終結「永遠載入中」。
- client 端錯誤集中經 `logQuoteError` seam（console.warn），為 add-sentry-error-reporting 預留單一接點。

**Non-Goals**

- 不做 Sentry 整合、不做交易表單防呆（各自獨立 change）。
- 不改 stale 降級語義、不動 `fetchQuote` 單檔端點（mobile 已走批次）、不處理 trend/history 404。
- 不自動修正代號、不清理錯誤的 `symbols/{US:0050}` 文件（無害殘留，rules 本就禁 client 刪）。

## Decisions

### D1：錯誤碼 union 放 `packages/shared`

`QuoteErrorCode = 'symbol_not_found' | 'transient'` + type guard 放 `packages/shared/src/quotes/`（緊鄰 `isFresh`）。兩端（functions 組回應、mobile 解析）共用同一字面值，避免字串漂移。shared 純函式受 coverage gate，補對應測試。
_替代_：兩端各自硬編字串——省一步但正是這類 bug 的溫床，否決。

### D2：provider 以自訂錯誤類別標記 not-found，非解析錯誤訊息

`yahooProvider` 遇 HTTP 404 擲 `SymbolNotFoundError`（帶 market/symbol）；`fetchQuotes` handler catch 時以 `instanceof` 分類為 `symbol_not_found`，其餘一律 `transient`。sanity 失敗歸 `transient`（資料髒 ≠ 代號不存在，下次可能恢復）。
_替代_：在訊息字串上 regex「HTTP 404」——脆弱且綁死文案，否決。

### D3：回應格式向後相容擴充

per-item error 由字串改為 `{ code, message }`（或並存 `errorCode` 欄位，實作時取最小 diff）。現行 TestFlight build 的 parser 本來就丟棄 error 筆，不受影響；新 client 對缺 `code` 的舊格式 fallback 為 `transient`。

### D4：store 以 `errors: Record<symbolId, QuoteErrorCode>` 承載，成功即清

`quotesStore` 新增 per-symbol 錯誤 map：批次回應的 error 筆寫入；該 symbol 拿到報價（任一層 cache 或新抓）即刪除。**有 stale fallback 的 symbol 即使新抓失敗也不標錯**——顯示語義維持「延遲」優先（資料可用性 > 錯誤宣告）；錯誤標記只給「完全無值」的 symbol。`transient` 錯誤不改變現行 UI 行為（仍顯示「更新中」），先記錄備查。

### D5：`computeHoldingsHero` 回傳擴充而非新增分支函式

`pendingCount` 語義拆分：`symbol_not_found` 的持倉計入新欄位 `notFoundCount`（清單列由同一 map 標示「查無報價代號」）。hero 為 null（includedCount===0）時，screen 依「是否存在 notFound」決定顯示「查無代號」錯誤文案或原「報價載入中…」。純函式改動走 TDD（ADR-0007：silent-severe 資料流，補 RNTL 關鍵 flow 一條）。

### D6：`logQuoteError(stage, detail)` 集中 seam

放 `apps/mobile/src/services/quotes/`，MVP 實作＝結構化 `console.warn`。`triggerFetchQuotes`、`readFirestoreCache`、per-item error 解析三處接入，空 catch 全數移除。未來 Sentry 只改此一函式。

## Risks / Trade-offs

- [Yahoo 對「不存在代號」不一定回 404（可能 200 + 空 result）] → provider 對「chart result 為空」同樣歸 `symbol_not_found`；以實測 US:0050 驗證分類正確。
- [「查無代號」誤傷暫時性 404（Yahoo 偶發）] → 錯誤狀態不落地、每次刷新重評；一旦任何一次成功即清除（spec「錯誤狀態於報價成功後清除」）。
- [舊 build 與新 functions 並存] → D3 向後相容；舊 client 行為不變（仍舊 bug，靠新 build 解）。
- [UI 新增狀態未在設計包] → 沿用既有降級橫幅視覺模式，文案/位置於 iOS Simulator 視覺對圖時與 owner 確認（resilient-quote-display 前例）。

## Migration Plan

無資料遷移、無 schema/rules 變更。順序：shared（錯誤碼 + 測試）→ functions（provider + fetchQuotes，emulator 驗證）→ mobile（parser → store → hero → screen，Emulator dogfood）。收尾：iOS Simulator 視覺對圖（owner gate）→ PR。**functions production 部署與新 TestFlight build 皆為 owner gate**（花錢/部署/真機）。回退＝還原各檔，無外部副作用。

## Open Questions

- 「查無報價代號」確切文案與 Hero 降級版位——視覺對圖時與 owner 定稿（spec 僅約束行為）。
