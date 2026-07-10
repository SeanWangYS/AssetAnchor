# Proposal: surface-quote-symbol-errors

## Why

TestFlight 首個 production bug（2026-07-09）：使用者把台股 ETF（0050 / 00631L）的交易存成 `market=US`，Yahoo 查無代號回 HTTP 404，但整條鏈路把這個**永久錯誤**當成「還沒拿到報價」處理——functions 逐筆錯誤只進 server log、`fetchQuotes` 回應的 per-item error 到了 mobile 被 `parseFetchQuotesResponse` 吞成「無報價」、`triggerFetchQuotes` 空 `catch {}` 連 console 都不留——持倉頁因此**永遠顯示「報價載入中…」**，使用者與開發者在 client 端都拿不到任何線索（resilient-quote-display 的降級只救「曾有報價 doc」的 stale case，救不了從未成功抓過的代號）。

planning §3（股價資料）要求持倉顯示現價；ADR-0007 §5（報價來源政策）與 live-quotes spec 已有 stale 降級，但缺「代號查無」這類**永久錯誤**的顯示出口與 client 端錯誤能見度。

## What Changes

- **functions 錯誤分類**：`fetchQuotes` per-item error 從純訊息字串升級為**帶錯誤碼**的結構（`symbol_not_found`＝Yahoo 404 永久錯誤 vs `transient`＝其他暫時性失敗），回應格式向後相容擴充。
- **mobile 停止靜默吞錯**：`parseFetchQuotesResponse` 解析 per-item error 並保留錯誤碼；`triggerFetchQuotes` / `readFirestoreCache` 的空 catch 改為集中式 `logQuoteError`（console.warn 為底，留未來接 Sentry 的 seam）。
- **持倉 UI「查無代號」降級**：store 記錄 per-symbol 錯誤狀態；`symbol_not_found` 的持倉在清單列與 Hero 彙總顯示「查無報價代號」標示（引導檢查市場/代號），**不再納入「更新中」**；當所有持倉都拿不到報價且至少一檔為 `symbol_not_found` 時，Hero 顯示錯誤降級文案而非永遠「報價載入中…」。
- **暫時性錯誤維持現行為**：transient 錯誤仍走既有「更新中／延遲」路徑（15min TTL + retry），不改變 stale 降級語義。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `live-quotes`：新增「報價錯誤分類與查無代號降級」requirement——批次端點 per-item error 帶錯誤碼；mobile 對 `symbol_not_found` 顯示明確降級而非永遠載入中；client 端錯誤不得靜默吞掉（至少 console 記錄、集中 seam）。

## Impact

- `apps/functions/src/quotes/`：`yahooProvider.ts`（404 → 分類錯誤）、`fetchQuotes.ts`（回應帶 error code）；`fetchQuote.ts` 沿用不動（單檔端點非本次重點）
- `apps/mobile/src/services/quotes/`：`quotesBatch.ts`（解析 error code）、`quotesStore.ts`（per-symbol error state + logQuoteError）
- `apps/mobile/src/features/holdings/`：`holdingsHero.ts`（notFound 持倉的彙總語義）、`HoldingsOverviewScreen.tsx`（降級文案 UI）
- `packages/shared`：若錯誤碼 enum 放 shared 則新增（純函式 + 測試）
- Firestore schema：**不動**（不寫錯誤到 quotes collection；錯誤是 runtime 狀態）
- 部署：functions 需重新部署（owner gate）；mobile 走下一版 TestFlight build

## Non-goals

- 不做 Sentry / 錯誤上報服務整合（獨立 change：add-sentry-error-reporting）
- 不做交易表單的市場/幣別防呆與代號驗證（獨立 change：guard-transaction-market-consistency）
- 不改 stale（過期報價）降級語義、不動 15min TTL 與 cache 架構（ADR-0006）
- 不處理 trend-charts / price_history 的 404 顯示（走勢圖已有自己的空狀態）
- 不做代號自動修正／搜尋建議（第二階段）
