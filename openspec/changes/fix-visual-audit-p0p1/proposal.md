## Why

2026-07-17 全畫面視覺稽核（`docs/qa/visual-audit-2026-07-17.md`，AI 三角色自動化走訪 18 畫面 + 8 子代理交叉檢核）揪出 P0×1 + P1×5 顯示層/表單層缺陷。owner 指示（2026-07-18）：P0/P1 六項**一次**以單一 change 修復。所有數字勾稽（成本/市值/FX/現金鏈路）皆通過——問題全在顯示口徑與表單驗證層，不涉底層計算錯誤。

六項問題（編號對應稽核報告）：

1. **P0-1**：AddAccount / AddTransaction 空表單送出，picker 欄位直接顯示 zod 原始英文錯誤（`Invalid option: expected one of "FIRSTRADE"|...`），enum 內部值裸露、違反 UI 純繁中紀律——現行 `transaction-entry` spec 已要求「繁體中文錯誤訊息」，實作違反 spec。
2. **P1-1**：「總成本」口徑不一——交易詳情/清單列印 `t.total`（不含 fee/tax）、表單預估含 fee（但不含 tax）、個股歷史摘要含 fee+tax；spec T3/T6 明定含手續費。同一筆交易畫面上出現 5,123.00 與 5,124.00 兩個「總成本」。
3. **P1-2**：AccountForm 修正欄位後錯誤不消失（stale error）——手寫 useState+safeParse 只在 submit 重算；TransactionForm（RHF）會即時清除，兩表單行為不一致。
4. **P1-3**：期間篩選「自訂起訖」為死 UI——按鈕 onPress 綁佔位 handler，spec T5 明列此功能。
5. **P1-4**：持倉 hero 標籤「總資產（TWD）」實為純持股市值（不含現金 NT$223,200+US$3,130.42）；分析頁同口徑叫「持股市值」且明註「不含現金」——設計包內部不一致、標籤誤導。
6. **P1-5**：TransactionDetail 返回鈕顯示工程 route 名「TransactionList」。

## What Changes

- **表單驗證繁中化（P0-1）**：`packages/shared` 兩份 schema 的 8 個 enum 欄位補繁中訊息（zod v4 string shorthand；沿用既有「帳戶名稱必填」inline 慣例，不引全域 locale）。
- **總成本口徑統一為含 fee+tax（P1-1）**：shared 新增純函式 `transactionTotalWithFees`（BUY: total+fee+tax；SELL: total−fee−tax，回傳 decimal string）；三個顯示點（TransactionDetail / TransactionList row / AssetTransactions TxRow）改用之；**表單預估 `computeTotal` 補 tax**（稽核發現原案漏此、實為四口徑）；`deriveHoldings` scan() 收斂改用同一 helper（既有測試鎖行為）；TransactionDetail 補「交易稅」列（非零才顯示，對齊 AssetTransactions 慣例）。Firestore `total` 欄位語意（成交金額，不含費）**不變**——純顯示層。
- **AccountForm 錯誤即時重驗（P1-2）**：submitted flag + onChange 全量 re-safeParse，複刻 RHF `reValidateMode:'onChange'` 語意（含 picker onSelect）；不遷移 RHF（另開 change）。
- **自訂日期區間實作（P1-3）**：dateRangeStore 擴充 `customStart/customEnd` + `filterByPreset`/`inRange` 依 ISO 字串過濾（含當日）；sheet 起訖改受控文字輸入（YYYY-MM-DD，沿用 DateField 慣例、不引第三方 picker）；雙合法日期才切 custom、起>訖 或 custom 缺日期時套用鈕 disable；重開 sheet 保留 custom 狀態與回填。
- **hero 標籤更名（P1-4，owner 拍板項）**：「總資產（TWD）」→「持股市值（TWD）」+ footnote 補「不含現金」；設計包同步（holdings-overview-spec.md + **app-prototype 三個 jsx**——憲法 #1 原型為準，不同步會留下更高權威的內部矛盾）。不採「hero 改含現金」：會破壞 hero 三元組互洽（值=成本+未實現）並與走勢圖序列（ADR-0010 不含現金）脫鉤。
- **返回鈕標題（P1-5）**：新增 `zhTW.transactions.listTitle`，TransactionsStack `TransactionList` 補 `title`（對齊 HoldingsStack 既有寫法），ScreenHeader 共用。

## 設計稽核紀錄（owner 指示：子代理稽核設計後定案）

兩位獨立子代理（邏輯正確性 / 架構簡潔性）稽核原設計，4 個必改點全數採納：computeTotal 補 tax（否則台股賣出仍兩口徑）、DateRange sheet 重開保留 custom、套用鈕 disable 規則補全、設計包同步含 prototype。**不採納**：Fix 4 拆獨立 change（owner 逐字指示一次修復；以補齊狀態機規則控風險——拆分替代案記錄於此供 merge 時參考）、zod 全域 locale、AccountForm 遷 RHF。

## Capabilities

### Modified Capabilities

- `transaction-entry`：交易輸入驗證（enum 欄位繁中訊息明文化）；檢視清單/詳情的總金額口徑（含 fee+tax）；**ADDED** 期間篩選自訂起訖。
- `account-management`：帳戶欄位驗證（enum 繁中訊息 + 送出後錯誤即時重驗）。
- `currency-display`：持倉 hero 標籤「總資產」→「持股市值」+ 不含現金註記。
- `navigation`：in-tab stack 隱藏 header 的畫面 SHALL 設 title 供返回鈕文字（ADDED requirement）。

## Impact

- **packages/shared**：`schemas/account.ts`、`schemas/transaction.ts`（訊息，非 schema 結構）、新 `transactions/transactionTotalWithFees.ts`、`portfolio/deriveHoldings.ts`（收斂重構）、export `isRealDate`。TDD + coverage gate ≥90%。
- **apps/mobile**：TransactionDetailScreen、TransactionList、AssetTransactionsScreen、TransactionForm（computeTotal）、AccountForm、DateRangeSheetScreen、dateRangeStore、TransactionsScreen、TransactionsStack、HoldingsOverviewScreen（label/footnote）、i18n/zh-TW.ts。
- **docs/design**：holdings-overview-spec.md、app-prototype/prototype/aa-screens-v2.jsx、aa-core.jsx、holdings-overview/prototype/aa-screens.jsx（「總資產」→「持股市值」同步）。
- **不影響**：Firestore schema（聖牛不碰——`total` 欄位語意不變）、Money 精度（ADR-0005）、functions、rules。
- **owner gate**：帶 UI → iOS Simulator 視覺對圖 + **P1-4 設計仲裁（憲法 #9）於 PR 置頂明示**；owner 本人 merge。

## Non-goals

- 不修 P2/P3（日期格式三套統一、零值▲箭頭、小數位政策、開發註記文字、「軟刪除」文案等）——另開 change。
- 不遷移 AccountForm 至 react-hook-form（表單機制統一屬重構）。
- 不引第三方 date picker（沿用受控文字輸入；native picker 導入另議）。
- 不統一持倉/分析兩頁 footnote 的標點格式（pre-existing 差異）。
- 不動 `buildTransactionDoc` 的 `total` 計算（Firestore 成交金額語意保留）。
- SELL 淨收入（total−fee−tax）為負時照實顯示負號（極端小額賣出邊界，不特殊處理）。
