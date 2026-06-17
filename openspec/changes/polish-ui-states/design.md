## Context

Sprint 6 robustness 收尾。`core/ui` 已有 `EmptyState`；缺 `ErrorState`/`LoadingView`，且畫面未消費 store 的 `loading`/`error`。stores 皆已具 `loading`/`error`（transactionsStore、accountsStore、exchange-rates、quotes）。本 change 純 mobile UI + 一個註記，無 schema/相依/精度牽動。視覺對圖延到 Sprint 6 尾一次（owner 規則）。

## Goals / Non-Goals

**Goals:** 統一三態（empty/loading/error）於資料畫面；新增兩個 core/ui 狀態元件；明確 dark-only。

**Non-Goals:** theme 切換、skeleton shimmer、表單驗證樣式集中化、對帳/帳戶真值化（缺 spec gate）、Sentry、真機。

## Decisions

### D1：三態判定順序 `error → loading(首次) → empty → content`

畫面先看 `error`（顯 `ErrorState`），再看「`loading` 且尚無資料」（顯 `LoadingView`，避免冷啟動閃空），再看「無資料」（顯 `EmptyState`），否則內容。已有資料時的背景刷新不擋畫面（沿用既有 pull-to-refresh）。

### D2：`LoadingView` 用 RN `ActivityIndicator`

MVP 用內建 `ActivityIndicator`（tint = `colors.accent`）+ 可選 label，不引 skeleton。`ErrorState` 復用 `EmptyState` 的版面語彙（icon 槽 + 標題 + 說明 + 描邊動作鈕），動作鈕作「重試」。

### D3：哪些畫面接三態（避免過度）

- **holdings**：HoldingsOverview（loading/error/empty 升級）、AssetDetail（找不到→EmptyState）、AssetTransactions（空→EmptyState）。資料源＝transactionsStore（持倉為其衍生）。
- **transactions**：TransactionDetail（找不到→EmptyState）。TransactionsScreen 已用 EmptyState（驗證即可）。
- **accounts**：AccountDetail（找不到→EmptyState）。AccountList 已用 EmptyState。
- **analysis / settings**：已優雅處理，不動。

### D4：dark-only 以註記表達、不刪 spec 引用物

`core/theme/index.ts` 加註記「MVP 單一 dark 主題」。**不**刪 `settings.theme`（聖牛 reserved）、**不**刪 `ACCENT_OPTIONS`（holdings-overview-spec 引用，刪除＝設計衝突 gate）。

## Risks / Trade-offs

- **冷啟動 loading 判定**：onSnapshot offline-first 下 `loading` 短暫；用「loading && 空」避免閃空，已有本地資料時不顯 spinner（不打斷）。
- **error 復原**：`ErrorState` 重試對 onSnapshot 型 store＝重新 subscribe；對 fetch 型＝重打。各畫面接既有 store 動作即可。

## Migration Plan

無資料/schema 遷移。純新增元件 + 畫面 wiring。Rollback＝還原畫面條件渲染。
