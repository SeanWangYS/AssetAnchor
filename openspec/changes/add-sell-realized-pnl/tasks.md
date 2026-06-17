## 1. shared 已實現損益 + SELL 推導（TDD：先測後做）

- [ ] 1.1 先寫測試 `deriveRealizedEvents`：§4 已實現公式、零手續費、多次賣出累加、時序（賣出當下均價）
- [ ] 1.2 先寫測試 `deriveHoldings` SELL：部分賣出（減股數、均價不變、totalCost 等比遞減）、全賣歸零後重買新週期（avg 重算）、超賣 fail-loud、無 SELL 時與舊結果一致
- [ ] 1.3 實作：`deriveHoldings` 改時序單趟掃描、支援 SELL；`Position` 加 `realizedPnl`；新增 `deriveRealizedEvents` + `RealizedEvent` 型別，由 index 匯出
- [ ] 1.4 `pnpm --filter @assetanchor/shared test:coverage` 綠 + gate（≥90%）通過

## 2. transaction 輸入：SELL 驗證

- [ ] 2.1 先寫測試：transaction zod / 衍生「可賣股數」守則——超賣拒、無持倉拒、合法 SELL 過
- [ ] 2.2 實作 SELL 驗證（zod superRefine 或表單層 helper，吃 deriveHoldings 可賣上限）；綠燈

## 3. mobile 交易表單 + service（SELL）

- [ ] 3.1 AddTransaction 加 BUY/SELL 切換；SELL 時 symbol 限「有持倉」、數量上限＝可賣股數、超賣 inline 錯誤
- [ ] 3.2 transactionService 寫 SELL（既有 schema，transaction_type='SELL'）

## 4. holdings UI：已實現損益真值

- [ ] 4.1 持倉頁「本月已實現損益」改真值：當月 SELL 之已實現跨幣別合計（顯示幣別偏好換算；rates 未就緒降級，沿用合計慣例）
- [ ] 4.2 AssetDetail 顯示該 symbol 已實現損益（Position.realizedPnl）

## 5. Definition-of-Done

- [ ] 5.1 `pnpm -r typecheck` / `lint` / `format:check` 全綠；mobile 純邏輯測試綠
- [ ] 5.2 rules 未動（確認 `firebase/` 零 diff）
- [ ] 5.3 emulator + Simulator 自測：記一筆 SELL → 持倉股數降、已實現入帳、本月已實現更新（截圖）
- [ ] 5.4 feature 分支 commit + 開 PR；帶 UI → 視覺對圖為 owner gate；依延後 merge 規則：對圖過即 archive、續做（不等 merge）
