## 1. Token 與共用元件

- [x] 1.1 `core/theme/index.ts`：`fontSize` 新增 `screenTitle: 23`（additive，不動既有鍵）
- [x] 1.2 新增 `core/ui/ScreenHeader.tsx`（`title` + 可選 `right` slot；`useSafeAreaInsets().top` 頂距；23px/800 左對齊；`spacing.page` 水平內距）並自 `core/ui/index.ts` export

## 2. 四頁換裝

- [x] 2.1 交易紀錄：`TransactionsScreen.tsx` 自繪標題列改用 ScreenHeader（日曆鈕入 `right` slot，a11y label「日期區間」不變）
- [x] 2.2 持倉總覽：`HoldingsStack.tsx` 落地 screen `headerShown:false`；`HoldingsOverviewScreen.tsx` 移除 `setOptions({ headerRight })`，🔔/＋ 移入 ScreenHeader `right` slot（a11y label「通知」「新增交易」不變）
- [x] 2.3 分析：`AnalysisStack.tsx` 落地 screen `headerShown:false`；`AnalysisOverviewScreen.tsx` 加 ScreenHeader
- [x] 2.4 設定：`SettingsStack.tsx` 的 `SettingsHome` `headerShown:false`；`SettingsScreen.tsx` 加 ScreenHeader

## 3. 驗證（自動 + 視覺）

- [x] 3.1 `pnpm -r typecheck && pnpm -r lint && pnpm -r test` 全綠
- [x] 3.2 Maestro e2e：跑既有依賴持倉 ＋ 鈕的 flow（如 `add-crypto-transaction.yaml`）確認 a11y 入口未斷
- [x] 3.3 iOS Simulator 逐頁視覺對圖（四 tab 落地頁 vs prototype/spec：23px/800、不壓時鐘、子頁 header 不變）並截圖存證
