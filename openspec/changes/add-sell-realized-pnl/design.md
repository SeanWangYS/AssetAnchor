## Context

`deriveHoldings`（`packages/shared/src/portfolio`）目前只聚合 BUY，且依陣列順序（BUY 加總可交換、順序無關）。SELL 引入順序相依（賣出當下的加權平均成本）、持倉週期歸零重置、與已實現損益。交易 schema（§6 `TransactionDocument`）已含 `SELL` 所需全部欄位（`total/fee/tax/quantity/price/transaction_date`），無需動 schema。

## Goals / Non-Goals

**Goals:**

- `deriveHoldings` 正確處理 BUY/SELL 時序、加權平均（賣出均價不變）、歸零重買新週期、超賣 fail-loud。
- 已實現損益純函式（§4 公式）+ `Position.realizedPnl`（per-symbol 全期）。
- SELL 交易輸入（BUY/SELL 切換 + 不可超賣驗證）。
- 持倉「本月已實現損益」由 demo 改真值；AssetDetail 顯示該 symbol 已實現。

**Non-Goals:** 報價 / 現價 / 未實現損益（5b）；年化 / TWR / IRR；公司行動型別；lot 週期分析。

## Decisions

### D1：時序處理 + 單趟掃描

`deriveHoldings` 先以 `transaction_date` 穩定排序（同日依既有順序），再單趟掃描累積。每個 `(market, symbol)` 維護 `{ quantity, totalCost, txCount, realized }`。

- BUY：`quantity += q`、`totalCost += total+fee+tax`。
- SELL：令 `avgCost = totalCost / quantity`（賣出當下）；`realized += (total − fee − tax) − avgCost × q`；`totalCost -= avgCost × q`；`quantity -= q`。
- `quantity` 歸零 → `totalCost` 同步歸零（`avgCost × 0`），自然達成「重買為新週期」（後續 BUY 從 0 累加）。
- **為何 totalCost 依 avgCost 等比遞減而非 SELL 的 total**：加權平均法下賣出不改變均價；用 `avgCost × soldQty` 移除已售部位的成本基礎，剩餘 `totalCost/quantity` 恆等於原 `avgCost`。

### D2：超賣 fail-loud

SELL 時若 `q > quantity` → 擲 `Error`（資料異常）。對齊 ADR-0007「安靜且嚴重要 fail loud」。UI 端以「不可超賣」驗證在進入前擋掉，故正常流程不會觸發；觸發代表資料損毀，寧可炸不可靜默產生負股數。

### D3：已實現損益的輸出形狀

提供 `deriveRealizedEvents(transactions): RealizedEvent[]`（`{ market, symbol, currency, transaction_date, realized }`，時序）。`deriveHoldings` 內部複用同一掃描邏輯填 `Position.realizedPnl`（per-symbol 加總）。跨幣別 / 區間合計（如「本月已實現損益（TWD）」）在**顯示層**用最新匯率換算加總（對齊 currency-display「總成本」慣例），不在純函式做 FX。

- **為何另出 events 而非只放 Position**：「本月」需依日期過濾、跨 symbol 跨幣別加總 → events 是最小可組合單位；Position.realizedPnl 是其 per-symbol 投影。

### D4：SELL 表單可賣股數來自衍生持倉

AddTransaction 選 SELL 時，以 `deriveHoldings(目前 transactions)` 取該 `(market, symbol)` 的 `quantity` 為「可賣上限」；zod superRefine（或表單層）擋 `soldQty > 可賣`。symbol 選擇限「目前有持倉」者。

## Risks / Trade-offs

- **同日多筆 BUY/SELL 排序**：`transaction_date` 為日（`YYYY-MM-DD`），同日先後不可由日期分辨 → 以穩定排序保留輸入順序（交易清單既有排序），同日同 symbol 先買後賣的常見情境成立；若同日先賣後買且輸入順序相反屬 edge，記錄於測試備註。
- **超賣 fail-loud 影響整頁**：deriveHoldings 擲錯會讓持倉頁降級空態 → 由 SELL 輸入驗證在源頭防止，極少觸發。
- **realized 跨幣別合計**：與「總成本」同樣依顯示層匯率快照；rates 未就緒時降級提示（沿用既有行為）。

## Migration Plan

無資料遷移。既有 BUY-only 資料在新邏輯下結果不變（無 SELL 時 realized=0、totalCost/avg 同舊）。回滾＝revert PR。

## Open Questions

無阻塞項。（跨幣別 realized 合計的 rates 降級沿用 currency-display 既有策略。）
