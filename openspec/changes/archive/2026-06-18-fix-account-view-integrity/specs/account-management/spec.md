## ADDED Requirements

### Requirement: 設定頁現金餘額跨帳戶總覽（唯讀展示）

設定頁（SettingsHome）的「現金餘額」列 SHALL 為**唯讀展示列**：不可點、不導航、無 chevron，右側顯示**跨帳戶現金總計**，由 `accountsStore` 各（啟用）帳戶的 `cash_balances` 依幣別加總（USD / TWD），以 `Money.toDisplayString`（2 位小數）＋幣別前綴呈現（如「NT$ X · US$ Y」），對齊原型 mock（analysis-page-spec §3.2 設定頁）。加總精度 SHALL 走 `Money`（ADR-0005），不得用 native float。

「帳戶管理」列維持可點、導向 Accounts 子頁（現金的逐帳戶編輯仍於 AccountDetail，見既有「手動編輯現金餘額」需求）。

#### Scenario: 現金餘額顯示跨帳戶加總且不可點

- **WHEN** 使用者於設定頁檢視「現金餘額」列，且帳戶含 TWD 現金合計 222,200、USD 現金合計 3,130.42
- **THEN** 該列右側顯示「NT$ 222,200.00 · US$ 3,130.42」之類各幣別加總；點擊該列**不**發生導航

#### Scenario: 某幣別無餘額

- **WHEN** 使用者所有帳戶皆無 USD 現金、僅有 TWD 現金
- **THEN** 現金餘額列 SHALL 僅顯示有餘額的幣別（如「NT$ X」），不顯示 0 值幣別（或依設計呈現），數值由 `Money` 加總
