## 1. core/ui 狀態元件（foundational，先做）

- [x] 1.1 新增 `ErrorState.tsx`（復用 EmptyState 版面語彙：icon 槽 + 訊息 + 描邊「重試」鈕；props: message/subtitle?/onRetry?/icon?）
- [x] 1.2 新增 `LoadingView.tsx`（置中 `ActivityIndicator` tint=accent + 可選 label）
- [x] 1.3 從 `core/ui/index.ts` 匯出兩者
- [x] 1.4 `core/theme/index.ts` 加 dark-only 註記（MVP 單一 dark 主題、settings.theme 為 reserved 不消費）

## 2. holdings 畫面三態（agent A，僅動 holdings/）

- [x] 2.1 HoldingsOverview：transactionsStore loading（首次且空）→ LoadingView；error → ErrorState；無持倉 → EmptyState（list section 三態，hero/bento/chart 不擋）
- [x] 2.2 AssetDetail：找不到持倉 → EmptyState（取代純文字 fallback）
- [x] 2.3 AssetTransactions：此標的無交易 → EmptyState（取代純文字）

## 3. transactions 畫面三態（agent B，僅動 transactions/）

- [x] 3.1 TransactionDetail：找不到交易 → EmptyState（取代純文字）
- [x] 3.2 Transactions：已用 EmptyState；補冷啟動 loading/error（transactionsStore）

## 4. accounts 畫面三態（agent C，僅動 accounts/）

- [x] 4.1 AccountDetail：找不到帳戶 → EmptyState（取代純文字）
- [x] 4.2 AccountList：已用 EmptyState；補冷啟動 loading/error（accountsStore 有 loading/error flag）

## 5. Definition of Done

- [x] 5.1 `pnpm -r typecheck` / `lint` / `format:check` 全綠
- [x] 5.2 整合 3 個 parallel agent 產出（檔案不重疊、零衝突）；commit 累積到 feature/symbol-metadata
- [x] 5.3 更新 Sprint 6 進度記憶
- [ ] 🛑 5.4 視覺對圖：留 Sprint 6 尾一次 owner iOS Simulator 驗收（per-sprint 規則）
