# Design：fix-visual-audit-p0p1

> 完整設計推導 + 兩位子代理稽核裁定見稽核工作檔；此處收斂為實作依據。

## Fix 1（P0-1）enum 繁中訊息

- 語法（zod 4.4.3，實測驗證）：`z.enum(BROKERS, '請選擇券商')`——string shorthand；`{message}` 已 deprecated 不用。空字串與 `undefined` 皆走 `invalid_value` 同一訊息，單一 message 全覆蓋。superRefine（市場×幣別）在 enum 失敗時不執行，訊息互斥不打架（實測）。
- 訊息表：account→ broker「請選擇券商」/ account_type「請選擇帳戶類型」/ base_currency「請選擇基礎幣別」/ market「請選擇主要市場」；transaction→ market「請選擇市場」/ asset_type「請選擇資產類型」/ transaction_type「請選擇交易類型」/ currency「請選擇幣別」。
- 測試：兩份 schema test 各補「空字串→繁中訊息」斷言（8 欄）。既有 `toContain('TWD')` 測試不受影響。

## Fix 2（P1-2）AccountForm 即時重驗

- `AccountForm.tsx`：加 `submitted` state；抽 `revalidate(next)` helper——`submitted` 時以最新 values 跑 `safeParse` 更新 errors。所有 setter（含 PickerField `onSelect`、Segmented、色塊）改經統一 update 路徑觸發。
- 語意 = RHF 預設（`mode:'onSubmit'` + `reValidateMode:'onChange'`）；schema 無跨欄 superRefine，全量 re-parse 不會產生幽靈錯誤（color 預設值合法、notes 恆 string——稽核已驗證）。
- 覆蓋面：AddAccountScreen 與 AccountDetailScreen 編輯模式共用此 component，一次修兩處。

## Fix 3（P1-1）總成本口徑（四處統一含 fee+tax）

- shared 新增 `packages/shared/src/transactions/transactionTotalWithFees.ts`：
  `transactionTotalWithFees({ total, fee, tax, currency, transaction_type }): string`（decimal string）
  BUY：total+fee+tax；SELL：total−fee−tax。fail-soft 解析對齊 deriveHoldings 現行為。
- `deriveHoldings.ts` scan() 的 BUY cost（:98-100）/ SELL proceeds（:113-115）收斂改用之——既有測試鎖行為，機械替換。
- 顯示點改用（皆 `formatMoney(string, currency)` 相容）：`TransactionDetailScreen.tsx:103`、`TransactionList.tsx:96`（並修 :18 檔頭註解為事實）、`AssetTransactionsScreen.tsx:134`。
- `TransactionForm.tsx` `computeTotal` 補 tax 參數（BUY +、SELL −）；預估卡說明文字改「股數 × 單價 ＋ 手續費 ＋ 稅（原幣別）」（SELL 為 −）。
- TransactionDetail 補「交易稅」列，僅 `tax` 非零顯示（對齊 AssetTransactions TxRow）。
- 驗收：QQQ 10×512.30 + fee 1 → 詳情/清單/預估皆 5,124.00；tax>0 案例入單元測試。

## Fix 4（P1-3）自訂日期區間

- `dateRangeStore.ts`：state 增 `customStart/customEnd: string`（YYYY-MM-DD；plain zustand 不持久化，與 preset 一致）；`setCustomRange(start,end)`；`inRange`/`filterByPreset` 簽名擴充帶 custom 起訖——`custom` 且雙合法時 `start <= d <= end`（ISO 字串比較，schema 保證格式）；缺日期/非法＝防禦性視同 all（UI 已擋，見下）。呼叫點同步：`TransactionsScreen.tsx:28`、`DateRangeSheetScreen.tsx:38`。
- `DateRangeSheetScreen.tsx`：
  - :36 初始化改保留 custom（`useState(current)`）並回填 store 的起訖值——修「重開 sheet 吃掉 custom」缺口（稽核必改點）。
  - 起訖兩欄改受控文字輸入（placeholder YYYY-MM-DD、`numbers-and-punctuation`，樣式同 TransactionForm DateField）；合法性用 shared `isRealDate`（export 之）。
  - 狀態機：**雙欄皆合法**才自動 `setSel('custom')`；單欄/非法不切（避免靜默忽略陷阱——稽核指出）。選 preset 清空兩欄。
  - 套用鈕 disable：`sel==='custom' && !(雙合法 && start<=end)`；起>訖 顯示「起日需早於訖日」。
  - custom 命中筆數即時計算（同 preset 行為）。
- pill（TransactionsScreen:55 現格式「期間：{label}」）：custom 顯示「期間：M/D–M/D」。
- 測試：dateRange 純函式（inRange/filterByPreset custom 邊界：含當日、跨年、起=訖、缺值防呆）進 mobile jest；`isRealDate` export 補 shared 測試。

## Fix 5（P1-4）hero 標籤（owner 拍板項）

- `HoldingsOverviewScreen.tsx:383`「總資產（{displayCcy}）」→「持股市值（{displayCcy}）」；:437 footnote 插入「；不含現金」。
- 設計包同步（憲法 #1 原型為準，缺一不可）：`holdings-overview-spec.md`（:91-92、:143、:150）、`app-prototype/prototype/aa-screens-v2.jsx:177`、`aa-core.jsx:46`（註解）、`holdings-overview/prototype/aa-screens.jsx:105`。
- 程式碼註解殘留同步：`theme/index.ts:223`、`holdingsDemo.ts:119`、`HoldingsOverviewScreen.tsx:344,381`。
- e2e/RNTL 無「總資產」斷言（稽核 grep 驗證），改動面乾淨。
- fallback（owner 否決改名時）：退回僅補 footnote「不含現金」。

## Fix 6（P1-5）返回鈕標題

- `i18n/zh-TW.ts` 增 `transactions.listTitle: '交易紀錄'`；`TransactionsStack.tsx` `TransactionList` options 增 `title: zhTW.transactions.listTitle`（保留 `headerShown:false`，同 HoldingsStack:30 寫法）；`TransactionsScreen.tsx:36` ScreenHeader 改用同常數。
- 全 repo 掃描確認：其他 stack（Holdings/Settings/Analysis/Accounts）皆已設 title，無同類漏網。

## 實作順序

1. shared（TDD）：schema messages → transactionTotalWithFees → deriveHoldings 收斂 → isRealDate export
2. mobile 小件：Fix 6 → Fix 5（含設計包同步）→ Fix 3 顯示點 + computeTotal
3. mobile 大件：Fix 2 → Fix 4
4. 全 gate（typecheck/lint/format/coverage）→ Simulator 六項視覺驗證（前後對照截圖）→ commit/push/PR/archive
