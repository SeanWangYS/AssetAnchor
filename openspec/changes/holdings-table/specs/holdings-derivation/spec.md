## MODIFIED Requirements

### Requirement: 持倉清單檢視（HoldingsOverview）

持倉 Tab SHALL 顯示由 `deriveHoldings` 推導的持倉清單，並以**持股表格**呈現（凍結代號欄 + 同步橫捲、欄位、排序、分組列與降級規則見 `holdings-table` capability；owner 2026-10-21，design spec D10）。清單 SHALL 支援「持股 / 帳戶 / 類別」三種分組；「類別」依 `market` 分組，組標題為市場名。表格內**所有金額**（含組小計）SHALL 以 `preferred_display_currency`（預設 TWD）呈現，以最新匯率換算；SHALL NOT 再顯示各市場原幣別小計與清單上方的跨幣別「總成本」grand total（已移除）。本畫面市值 / 未實現損益 / Hero 彙總由 **live-quotes** 報價提供；**顯示幣別切換鈕設於本頁**＝偏好控制（見 currency-display）。金額運算 SHALL 用 `Money`（儲存與計算 10 位），`toNumber()` 只在顯示與排序邊界。

#### Scenario: 依市場分組

- **WHEN** 使用者持有 TW 與 US 市場的股票並切到「類別」
- **THEN** 清單分「台股」「美股」兩組，各組標題的市值欄顯示該組顯示幣別市值小計

#### Scenario: 不再顯示總成本行

- **WHEN** 使用者檢視持倉清單
- **THEN** 清單上方 SHALL NOT 出現「總成本（{幣別}）」行

#### Scenario: 新交易即時反映

- **WHEN** 使用者新增一筆 BUY（transactionsStore onSnapshot 更新）
- **THEN** 持倉清單即時重新推導並更新該 symbol 的股數與均價，無需手動刷新

#### Scenario: 空持倉狀態

- **WHEN** 使用者尚無任何交易
- **THEN** 持倉清單顯示空狀態提示（引導去新增交易），而非錯誤或空白

### Requirement: 持倉清單「帳戶」分群依真實帳戶

持倉總覽的「帳戶」分群模式 SHALL 依交易的真實 `account_id` 分組，**不得**使用任何 symbol→帳戶的 demo 硬編對照表。`packages/shared` SHALL 提供純函式 `deriveHoldingsByAccount(transactions, accounts)`，對每個帳戶各自以 `deriveHoldingsForAccountSafe` 推導持倉（per-account，逐 symbol 容錯），回傳有序的帳戶分組（每組含 `accountId`、`accountName`、`positions`、`skipped`）。分組標題 SHALL 顯示真實 `account_name` + 檔數 + **顯示幣別市值小計**（holdings-table 分組列），且不含顏色圓點（holdings-overview-spec D3：持倉清單本身）。`account_id` 對不到任何現存帳戶的交易 SHALL 歸入「未分類」群（fail-soft，不靜默消失）。同一 `(market, symbol)` 跨多帳戶持有時 SHALL 於各自帳戶群各成一列（各自股數/均價/年化，年化只計該帳戶交易）。`AssetDetail` 的「帳戶分布」欄 SHALL 同樣由真實交易解析帳戶名（可能多帳戶），不得使用 demo 對照。

#### Scenario: 依真實帳戶分組

- **WHEN** 使用者於持倉總覽切到「帳戶」模式，且其交易分屬帳戶 A（Firstrade）與帳戶 B（群益證券）
- **THEN** 系統 SHALL 顯示標題為「Firstrade」「群益證券」的分組，各組只含該帳戶交易推導出的持倉，標題顯示檔數與顯示幣別市值小計；**不得**出現使用者未建立的帳戶名

#### Scenario: 跨帳戶同 symbol 各自成列

- **WHEN** 同一 `(market, symbol)` 在帳戶 A 與帳戶 B 皆有持有
- **THEN** 該 symbol SHALL 於帳戶 A 群與帳戶 B 群各出現一列，各列的股數/均價/年化依該帳戶自身交易計算

#### Scenario: orphan account_id 歸未分類

- **WHEN** 某交易的 `account_id` 對不到任何現存帳戶（例如帳戶已刪除）
- **THEN** 其推導的持倉 SHALL 歸入「未分類」群（顯示於最後），不得靜默消失、不得歸入任意其他帳戶

#### Scenario: 不使用 demo 對照表

- **WHEN** 任一 symbol 不在（已移除的）demo 對照表中
- **THEN** 分群結果 SHALL 完全由真實 `account_id` 決定，與 symbol 字面無關；`holdingsDemo` 的 `accountOf`/`DEMO_ACCOUNT` SHALL 不復存在
