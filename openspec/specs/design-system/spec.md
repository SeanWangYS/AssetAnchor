# design-system Specification

## Purpose

TBD - created by archiving change align-to-design-package. Update Purpose after archive.

## Requirements

### Requirement: Dark-first design tokens 為單一視覺來源

`core/theme` SHALL 提供 dark-first design tokens 作為全 app 視覺單一來源：底色（頁底 `#0A0C10`、畫面底 `#0E1117`）、文字四階透明白、分隔線、accent（預設 `#7C6CF0`，4 段可選）、漲跌色（漲 `#2FD37E` / 跌 `#FF5E62`）、買賣漸層（買 `#7C5CE6→#C24FD6` / 賣 `#2E74E6→#35C6EA`）、字型（Nunito 數字 / Noto Sans TC 中文）、8px 間距、圓角階層。畫面 SHALL NOT 自行硬編色票/字級，一律引用 token。

#### Scenario: 畫面引用 token

- **WHEN** 任一畫面需要色彩 / 字級 / 間距
- **THEN** 由 `core/theme` 取得，不在畫面內硬編 hex

#### Scenario: dark-first 預設

- **WHEN** App 顯示任一畫面
- **THEN** 預設深色（畫面底 `#0E1117`），而非 light-mode 佔位（`#FFFFFF`/iOS 藍）

### Requirement: 漲跌色與買賣色為兩套獨立系統

系統 SHALL 將「漲跌（盈虧語意）」與「買/賣（交易方向）」視為兩套獨立色系：漲跌用綠/紅（▲▼ 數字、圖表正負），買/賣用主題漸層（買 紫→洋紅、賣 藍→青）。兩者 SHALL NOT 互相混用，且 SHALL NOT 採用台股「買紅賣綠」。

#### Scenario: 數字漲跌用綠紅

- **WHEN** 顯示報酬 / 損益正負
- **THEN** 正用漲綠 `#2FD37E`、負用跌紅 `#FF5E62`，前綴 ▲/▼

#### Scenario: 買賣鈕/膠囊用漸層

- **WHEN** 顯示買入 / 賣出（按鈕、交易列表膠囊）
- **THEN** 買用紫→洋紅漸層、賣用藍→青漸層

### Requirement: 顯示格式規則

顯示層 SHALL 統一：正負以 ▲/▼ 標示；金額前綴 `NT$`(TWD) / `US$`(USD)；百分比帶正負號；所有數字套 `tabular-nums`。金額計算 SHALL 用 `Money`/decimal.js，禁 native float；原型寫死數字僅顯示示意，不得作為精度依據。

#### Scenario: 金額與漲跌顯示

- **WHEN** 顯示一筆 TWD 金額與其漲跌
- **THEN** 形如 `▲ NT$ 88,200`、`+7.66%`，數字等寬（tabular-nums）

### Requirement: 共用 UI 元件集

`core/ui` SHALL 提供設計稿所需共用元件（Card[含 glow variant]、Segmented、TimeTabs、Avatar/代號圓標、Pnl、Fab、ConfirmDialog、EmptyState、Toast、CashBalanceCard、品牌組件 AALogoMark/AAWordmark/AABrandLockup、以及 `charts/`：Chart/Donut/DualBar/HBar），供各 feature 組裝。features SHALL NOT 各自重刻共用元件。

#### Scenario: feature 組裝共用元件

- **WHEN** 某畫面需要分段切換 / 圖表 / 確認對話框
- **THEN** 使用 `core/ui` 既有元件，不在 feature 內重刻

### Requirement: 狀態元件 ErrorState / LoadingView

`core/ui` SHALL 提供 `ErrorState`（錯誤狀態）與 `LoadingView`（載入狀態）兩個展示型元件，視覺語彙與既有 `EmptyState` 一致（置中、消費 `core/theme` token、不 import features/services）。`ErrorState` SHALL 顯示訊息並提供可選重試動作；`LoadingView` SHALL 顯示置中 spinner 與可選 label。

#### Scenario: ErrorState 顯示訊息與重試

- **WHEN** 畫面以一段錯誤訊息與一個 `onRetry` callback 渲染 `ErrorState`
- **THEN** 顯示該訊息與一個可點擊的重試動作，點擊觸發 `onRetry`

#### Scenario: LoadingView 顯示載入中

- **WHEN** 畫面以 `LoadingView` 渲染（可選 label）
- **THEN** 顯示置中 spinner（有 label 時一併顯示）

### Requirement: 資料畫面三態慣例

凡「載入後端資料」的畫面 SHALL 提供三態：載入中（首次載入且尚無資料時顯示 `LoadingView`）、錯誤（資料來源 `error` 時顯示 `ErrorState`）、空（無資料時顯示 `EmptyState`）。冷啟動 SHALL NOT 在資料抵達前先閃過空狀態。

#### Scenario: 首次載入顯示 loading 而非空

- **WHEN** 畫面對應的 store `loading` 為 true 且尚無資料
- **THEN** 顯示 `LoadingView`，不顯示空狀態文字

#### Scenario: 載入錯誤顯示 ErrorState

- **WHEN** 畫面對應的 store `error` 非空
- **THEN** 顯示 `ErrorState`（含訊息）

#### Scenario: 載入完成且無資料顯示 EmptyState

- **WHEN** 載入完成（非 loading、無 error）且資料為空
- **THEN** 顯示 `EmptyState`（統一元件，非純文字）

### Requirement: 單一 dark 主題（MVP）

App SHALL 僅提供單一 dark 主題、不提供 light/dark/auto 切換（owner 2026-06-17 決策）。聖牛 schema 的 `settings.theme` 欄位 SHALL 保留為 reserved（不移除、不消費）。

#### Scenario: 無主題切換入口

- **WHEN** 使用者瀏覽設定相關畫面
- **THEN** 不存在任何 light/dark/auto 主題切換控制；全 app 套用單一 dark palette

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
