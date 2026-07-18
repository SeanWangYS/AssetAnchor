# Tasks — fix-accounts-ui-polish

## 1. 實作

- [x] 1.1 P2-7：CashBalanceCard 檢視態 Text 分支；AccountDetail 檢視值改 2 位千分位（fmtNum）
- [x] 1.2 P2-8：valueText 收 account——停用「—」、啟用無持股「無持股」
- [x] 1.3 P2-9：停用確認文案去「軟刪除」
- [x] 1.4 P3-12：AddAccount 關閉鈕；ColorSwatches a11y 色名；ACCOUNT_COLORS 8→6（theme + 色名表）
- [x] 1.5 P3-13：pnlRow 未實現群組不可拆行；停用隱藏編輯現金
- [x] 1.6 P3-14：副標「類型 · 市場」繁中（marketZhLabel 收 accountDisplay、AccountForm 共用）

## 2. 驗證（DoD）

- [x] 2.1 設計稽核：2 獨立子代理（邏輯 / 簡潔）——必改點採納後實作
- [x] 2.2 typecheck / lint / prettier / shared coverage / mobile test 全綠
- [x] 2.3 模擬器對照：清單（類型·市場、無持股 vs —）、詳情（現金 158,000.00、hero 群組、停用無編輯鈕）、停用確認文案、AddAccount（關閉鈕、6 色）
- [x] 2.4 e2e add-account flow 無受影響斷言（grep）

## 3. 收尾

- [x] 3.1 commit → push → PR（stacked on #63；owner 拍板：無持股文案/停用文案/色票 6）
- [x] 3.2 CI 綠（owner-gated 不自 merge）→ `/opsx:archive`
