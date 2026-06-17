## 1. shared 已實現損益 + SELL 推導（TDD：先測後做）

- [x] 1.1 先寫測試 `deriveRealizedEvents`：§4 已實現公式、零手續費、多次賣出累加、時序（賣出當下均價）
- [x] 1.2 先寫測試 `deriveHoldings` SELL：部分賣出（減股數、均價不變、totalCost 等比遞減）、全賣歸零後重買新週期（avg 重算）、超賣 fail-loud、無 SELL 時與舊結果一致
- [x] 1.3 實作：`deriveHoldings` 改時序單趟掃描、支援 SELL；`Position` 加 `realizedPnl`；新增 `deriveRealizedEvents` + `RealizedEvent` 型別，由 index 匯出
- [x] 1.4 `pnpm --filter @assetanchor/shared test:coverage` 綠 + gate（≥90%）通過（176 tests）

## 2. transaction 輸入：SELL 驗證

- [x] 2.1 先寫測試：transaction zod（SELL 通過 / 公司行動拒）＋衍生「可賣股數」`sellableQuantity`（有持倉 / 無持倉 / 全賣後 0）
- [x] 2.2 實作：zod `transaction_type` enum(['BUY','SELL'])；`sellableQuantity` 純函式；綠燈

## 3. mobile 交易表單 + service（SELL）

- [x] 3.1 AddTransaction 加 BUY/SELL 切換（既有 toggle，移除「尚未開放」擋）；SELL 顯示可賣股數、超賣 / 無持倉 inline 紅字並擋送出（吃 `sellableQuantity`）
- [x] 3.2 transactionService 寫 SELL（既有 `writeTransaction`/`buildTransactionDoc` 型別無關，無需改）

## 4. holdings UI：已實現損益真值

- [x] 4.1 持倉頁「本月已實現損益」改真值：`useRealizedEvents` → 當月 SELL 已實現跨幣別合計（顯示幣別偏好換算；缺率沿用 toDisplay 降級）
- [x] 4.2 AssetDetail 加「已實現損益」列（`Position.realizedPnl`，依顯示幣別換算 + Pnl 漲跌色）

## 5. Definition-of-Done

- [x] 5.1 `pnpm -r typecheck` / `lint` / `format:check` 全綠；mobile 純邏輯測試綠
- [x] 5.2 rules 未動（`firebase/` 零 diff 確認）
- [ ] 5.3 emulator + Simulator：bundle smoke + owner 記一筆 SELL 驗收（驅動表單輸入屬 owner 視覺對圖 gate）
- [ ] 5.4 feature 分支 commit + 開 PR；帶 UI → 視覺對圖為 owner gate；依延後 merge 規則：對圖過即 archive、續做（不等 merge）
