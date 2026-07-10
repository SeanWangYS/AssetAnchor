## ADDED Requirements

### Requirement: 持倉清單「帳戶」分群依真實帳戶

持倉總覽的「帳戶」分群模式 SHALL 依交易的真實 `account_id` 分組，**不得**使用任何 symbol→帳戶的 demo 硬編對照表。`packages/shared` SHALL 提供純函式 `deriveHoldingsByAccount(transactions, accounts)`，對每個帳戶各自以 `deriveHoldingsForAccountSafe` 推導持倉（per-account，逐 symbol 容錯），回傳有序的帳戶分組（每組含 `accountId`、`accountName`、`positions`、`skipped`）。分組標題 SHALL 顯示真實 `account_name` + 檔數 + 原幣別小計，且不含顏色圓點（holdings-overview-spec D3：持倉清單本身）。`account_id` 對不到任何現存帳戶的交易 SHALL 歸入「未分類」群（fail-soft，不靜默消失）。同一 `(market, symbol)` 跨多帳戶持有時 SHALL 於各自帳戶群各成一列（各自股數/均價）。`AssetDetail` 的「帳戶分布」欄 SHALL 同樣由真實交易解析帳戶名（可能多帳戶），不得使用 demo 對照。

#### Scenario: 依真實帳戶分組

- **WHEN** 使用者於持倉總覽切到「帳戶」模式，且其交易分屬帳戶 A（Firstrade）與帳戶 B（群益證券）
- **THEN** 系統 SHALL 顯示標題為「Firstrade」「群益證券」的分組，各組只含該帳戶交易推導出的持倉，標題顯示檔數與原幣別小計；**不得**出現使用者未建立的帳戶名

#### Scenario: 跨帳戶同 symbol 各自成列

- **WHEN** 同一 `(market, symbol)` 在帳戶 A 與帳戶 B 皆有持有
- **THEN** 該 symbol SHALL 於帳戶 A 群與帳戶 B 群各出現一列，各列的股數/均價依該帳戶自身交易計算

#### Scenario: orphan account_id 歸未分類

- **WHEN** 某交易的 `account_id` 對不到任何現存帳戶（例如帳戶已刪除）
- **THEN** 其推導的持倉 SHALL 歸入「未分類」群（顯示於最後），不得靜默消失、不得歸入任意其他帳戶

#### Scenario: 不使用 demo 對照表

- **WHEN** 任一 symbol 不在（已移除的）demo 對照表中
- **THEN** 分群結果 SHALL 完全由真實 `account_id` 決定，與 symbol 字面無關；`holdingsDemo` 的 `accountOf`/`DEMO_ACCOUNT` SHALL 不復存在

### Requirement: 本月已實現損益指標的空狀態

持倉總覽「本月已實現損益」指標 SHALL 在**本月無任何 SELL 事件**時顯示中性空狀態（如「本月無賣出」或灰色「—」），不得以綠色上漲樣式（`▲`）呈現「NT$ 0」而誤導為上漲。月度過濾與跨幣別加總 SHALL 由 `packages/shared` / `holdingsHero` 的具測試純函式提供（本地時間月前綴過濾 + 顯示幣別換算加總），不得僅存在於 screen 的 inline 邏輯而無測試。

#### Scenario: 本月無賣出顯示中性

- **WHEN** 使用者本月無任何 SELL 交易（僅持有或本月僅買入）
- **THEN** 「本月已實現損益」SHALL 顯示中性空狀態，不顯示綠色「▲ NT$ 0」

#### Scenario: 本月有賣出顯示真值

- **WHEN** 使用者本月有 SELL 事件，已實現損益加總為正 / 負 / 恰為 0
- **THEN** 指標 SHALL 以 `Pnl` 呈現真值（正綠 `▲`、負紅 `▼`、恰為 0 亦以事件真值顯示），並正確落在本月（月邊界以本地日曆日判定，`2026-06-30` 歸六月、`2026-07-01` 歸七月）
