## Why

Sprint 6（MVP Polish, planning §13.2）的 robustness 收尾。現況盤點：`core/ui` 只有 `EmptyState`，**無 `ErrorState`/`LoadingView`**；**全 app 零 loading 狀態覆蓋**（stores 有 `loading`/`error` flag 但畫面不消費，冷啟動時會閃過空狀態）；多個資料畫面的「空 / 找不到」是純文字而非統一元件。P&L 顏色策略（§13.2 item 4）查核後**已集中於 `Pnl` 元件、無需再做**。theme toggle（item 3）owner 已拍板**不做**（App 維持單一 dark 主題）。

## What Changes

- **新增 `core/ui` 狀態元件**：`ErrorState`（icon + 訊息 + 可選重試）、`LoadingView`（置中 spinner + 可選 label），與既有 `EmptyState` 同視覺語彙。
- **統一空狀態**：把純文字「空 / 找不到」畫面（HoldingsOverview / AssetDetail / AssetTransactions / TransactionDetail / AccountDetail）升級為 `EmptyState` 元件。
- **補 loading 狀態**：資料畫面於首次載入（store `loading` 且尚無資料）顯示 `LoadingView`，避免閃過空狀態。
- **補 data-load error 狀態**：store `error` 時以 `ErrorState` 呈現（先前僅表單/auth 錯誤有處理）。
- **theme 註記 dark-only**：於 `core/theme` 明確註記「MVP 單一 dark 主題、不做切換」（owner 2026-06-17 決策）；不移除聖牛 `settings.theme` 欄位（reserved）、不移除 spec 引用中的 `ACCENT_OPTIONS`。

## Capabilities

### New Capabilities

<!-- 無新 capability -->

### Modified Capabilities

- `design-system`: 新增 `ErrorState`/`LoadingView` 兩個狀態元件，並確立「資料畫面 SHALL 提供 empty / loading / error 三態」的設計系統慣例。

## Impact

- **新增**：`apps/mobile/src/core/ui/ErrorState.tsx`、`LoadingView.tsx`（+ index 匯出）。
- **修改**：holdings / transactions / accounts 各資料畫面 wiring 三態；`core/theme/index.ts` 加 dark-only 註記。
- **無 schema 變更**、**無新相依**、**無 Money/精度**牽動。
- **Gate（不擋 loop）**：帶 UI → 整個 Sprint 6 尾一次 owner iOS Simulator 視覺對圖（owner 2026-06-17 改為 per-sprint 一次）。

## Non-goals

- **不**做 theme light/dark/auto 切換（owner 決策：維持單一 dark）。
- **不**做對帳「帳戶 cash 對比」UI 與 holdings「帳戶」真值化（**無對應 design spec → 缺 spec gate**，留 owner 補 spec 後另案）。
- **不**做 skeleton shimmer（`LoadingView` spinner 已足夠 MVP；skeleton 屬後續打磨）。
- **不**重構表單驗證錯誤樣式集中化（非 robustness 三態範圍，列後續）。
- **不**接 Sentry、**不**真機 dogfood（owner gate）。
