## ADDED Requirements

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
