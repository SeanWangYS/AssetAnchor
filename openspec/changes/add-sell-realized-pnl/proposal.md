## Why

Sprint 5 上半（§13.2「賣出 + 報價」之賣出部分）。目前持倉推導只吃 BUY（`deriveHoldings` 明列「SELL 與持有週期為 Sprint 5」），交易表單也只做 BUY。使用者無法記錄賣出、看不到**已實現損益**（§4 的「安靜且嚴重」恐懼 ①④：加權平均成本算錯 / 已實現損益沒按規格）。本 change 補上 SELL 事件與已實現損益推導，並讓持倉頁「本月已實現損益」由 demo 變真值。**不**含報價 / 現價 / 未實現損益（屬 5b，需 ADR-0006 + quotes schema + 花錢，另案）。

## What Changes

- **shared `deriveHoldings` 擴充 SELL**（純函式、TDD）：依 `transaction_date` **時序**處理；SELL 減持有股數、**平均成本不變**（加權平均特性）、`totalCost` 依 `avgCost × soldQty` 等比遞減；全數賣出 → 股數/成本歸零，後續 BUY 視為**新持有週期**（§4，平均成本重算不累加）；超賣（soldQty > 持有）為資料異常 → **fail loud**（擲錯，對齊 ADR-0007）。
- **shared 已實現損益純函式**（TDD）：每筆 SELL 的已實現損益＝`(total − fee − tax) − avgCost × soldQty`（§4）。輸出每筆已實現事件（market/symbol/currency/date/amount）；`Position` 新增 `realizedPnl`（該 symbol 全期已實現，原幣別）。
- **mobile 交易表單支援 SELL**：AddTransaction 加 BUY/SELL 切換；SELL 時驗證 `soldQty ≤ 目前持有股數`（zod + 衍生持倉）；`transactionService` 寫入 SELL（既有 schema，無欄位新增）。
- **holdings UI**：持倉頁「本月已實現損益」bento 由 demo 改真值（當月 SELL 已實現之跨幣別合計，以顯示幣別偏好換算，對齊 5a 之前的合計慣例）；AssetDetail 顯示該 symbol 已實現損益。

## Capabilities

### New Capabilities

<!-- 無新增 capability；擴充既有兩個。 -->

### Modified Capabilities

- `holdings-derivation`: `deriveHoldings` 由「僅 BUY 聚合」擴為「BUY/SELL 時序推導 + 加權平均 + 已實現損益 + 持有週期歸零重置」。
- `transaction-entry`: 交易表單由「僅 BUY」擴為「BUY/SELL」；SELL 加「不可超賣」驗證。

## Impact

- **程式碼**：`packages/shared/src/portfolio/deriveHoldings.ts`（+SELL/realized）、新增 realized 純函式 + 測試；`apps/mobile` 交易表單 + service（SELL）；`features/holdings`（本月已實現真值、AssetDetail realized）。
- **Firestore schema**：**無變更**。SELL 用既有 `transactions` schema（`transaction_type='SELL'` 已在 enum；`total/fee/tax/quantity/price` 既有）。不觸發聖牛 gate。
- **Firestore rules**：**無變更**（transactions per-user 隔離既有；rules 測試須續綠）。
- **Money/decimal**：已實現損益 / 成本一律 `Money`（ADR-0005）；跨幣別合計於顯示層用最新匯率換算（不落地）。
- **測試**（ADR-0007 獎盃）：realized / cost-basis 純函式 **TDD 先測**，§4 worked example（台積電 avg=550.76）+ 賣出 + 歸零重買當 fixture；coverage gate。

## Non-goals

- **報價 / 現價 / 未實現損益 / pull-to-refresh / ADR-0006 / quotes schema / Cloud Function / MMKV**：全屬 **5b**（`add-live-quotes`），需 owner 拍板 ADR + Blaze 花錢。
- 年化報酬率 / TWR / IRR / 含配息總報酬（§4 第二階段）。
- 公司行動（拆股 / 配股 / 合併）等非 BUY/SELL 交易型別。
- 個股「持有週期」年化分析（schema 預留 lot_id，本 change 不實作週期分析）。
