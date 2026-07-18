# Tasks — fix-transactions-ux

## 1. 實作

- [x] 1.1 P2-9：TransactionDetail 刪常駐 hint（含 style）
- [x] 1.2 P2-11：TransactionForm 帳戶-市場軟提示（帳戶欄下、marketMismatchHint 樣式複用、市場繁中標籤）
- [x] 1.3 P2-14：HoldingsOverview 移除鈴鐺
- [x] 1.4 P3-9：dateRangeStore `presetRange`（日曆月語意、期末訖端）+ **等價性測試 parametrize now（月底/1 月/閏年）+ 未來日 fixture**；sheet 回填（含重開初始化）+ `all 豁免、count > 0` 套用規則；TransactionsScreen paddingBottom 96→128
- [x] 1.5 P3-10：addTitle「新增交易」+ zh-TW empty 文案同步 + **e2e 守門改「股票代號」元素**（勿純換字串——撞 ＋/FAB a11y label）；本月已實現 count=0 補「本月無賣出」
- [x] 1.6 P3-11：AddTransaction route params + AssetDetail 帶入（asset_type 取最近一筆交易）+ AddTransactionScreen route.name 窄化預填（優先序 edit > copy > params）

## 2. 驗證（DoD）

- [x] 2.1 設計稽核：2 獨立子代理（邏輯 / 簡潔）——5 必改全採納（presetRange 日曆月+期末、e2e 守門重構、asset_type 來源、all 豁免、重開回填）
- [x] 2.2 typecheck / lint / prettier / shared coverage / mobile test（含 presetRange 等價性測試）全綠
- [x] 2.3 模擬器對照：詳情無註記、台股帳戶+美股市場提示、header 無鈴鐺、preset 回填（今年→01-01..今日）、0 筆 disable、清單尾列不被 FAB 遮、sheet 標題「新增交易」、本月無賣出註記（需檢視資料月份）、QQQ 頁開新增帶入
- [x] 2.4 e2e 三條 flow 手動跑或至少 grep 斷言一致

## 3. 收尾

- [x] 3.1 commit → push → PR（stacked on #62；owner 拍板：鈴鐺移除/提示文案/標題文案）
- [x] 3.2 CI 綠（owner-gated 不自 merge）→ `/opsx:archive`
