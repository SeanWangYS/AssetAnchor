## ADDED Requirements

### Requirement: 四 tab 落地頁統一 ScreenHeader（23px/800 + safe-area）

四個 tab 落地頁（HoldingsOverview、TransactionList、AnalysisOverview、SettingsHome）的畫面標題 SHALL 使用共用元件 `core/ui/ScreenHeader`，不使用原生 stack header。ScreenHeader SHALL：標題字級為 `fontSize.screenTitle`（23）、字重 800（`fontFamily.text.extrabold`）、左對齊；以 `useSafeAreaInsets().top` 作為頂部內距，使標題不與系統狀態列重疊；提供可選右側 actions slot 供頁面放置操作鈕。頁面既有的標題列操作入口（持倉 🔔/＋、交易 日曆鈕）SHALL 移入 slot 且 accessibility label 不變。

#### Scenario: 落地頁標題樣式統一

- **WHEN** 使用者切換到持倉 / 交易 / 分析 / 設定任一 tab
- **THEN** 頁面頂部顯示 23px / 800 左對齊標題，四頁視覺一致，且標題完整顯示於狀態列下方（不壓時鐘）

#### Scenario: 持倉頁標題列入口不變

- **WHEN** 使用者在持倉總覽點擊標題列右側「新增交易」鈕
- **THEN** 開啟 AddTransaction modal（行為與原生 header ＋ 相同），且「通知」「新增交易」accessibility label 維持原值

#### Scenario: 子頁不受影響

- **WHEN** 使用者自落地頁 push 進子頁（如 AssetDetail、個人資料）
- **THEN** 子頁仍顯示原生 stack header（含返回鍵），樣式不變
