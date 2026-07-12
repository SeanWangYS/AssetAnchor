## 1. 分支與定位

- [ ] 1.1 從最新 `main` 開 `fix/account-value-autofit` 分支（`git fetch origin && git pull` 後）
- [ ] 1.2 確認 `AccountDetailScreen.tsx` 中 hero 主數字的所有格式化呼叫點（`fmtNum`/`fmtBase`），釐清是否與 hero 拆分小字共用，避免波及 Non-goals 範圍

## 2. 小數位數（一律 2 位）

- [ ] 2.1 將 hero 主數字的 `dp` 由 `base === 'USD' ? 2 : 0` 改為固定 `2`，讓 TWD 帳戶也顯示到小數第二位（如 `NT$ 1,234,567.89`）
- [ ] 2.2 確認此改動**只**影響 hero 主數字；hero 拆分小字（持股市值 · 現金）、成本/未實現、持股列、帳戶列表 row 維持原格式（必要時分離主數字與其他數字的 helper）

## 3. 字級自動縮放

- [ ] 3.1 hero 主數字 `<Text>` 加 `adjustsFontSizeToFit`、保留 `numberOfLines={1}`、設 `minimumFontScale`（初值 `0.5`）
- [ ] 3.2 `styles.heroValue` 維持基礎 `fontSize.hero = 38`（短數字仍大器；長數字由 autofit 縮小）

## 4. 驗證

- [ ] 4.1 `pnpm --filter @assetanchor/mobile typecheck` 綠
- [ ] 4.2 `pnpm --filter @assetanchor/mobile lint` 綠（含 prettier --check）
- [ ] 4.3 若將 hero 主數字格式化抽為純函式，補輕量單元測試（TWD/USD 皆 2 位小數、千分位）
- [ ] 4.4 **視覺對圖（ADR-0008 DoD，owner gate）**：iOS Simulator 進 TWD 帳戶詳情，確認 hero 顯示到小數第二位、極長金額自動縮放單行完整、短數字維持大字級

## 5. 交付

- [ ] 5.1 Conventional Commit（scope `mobile`）、推分支、開 PR（帶前後對照說明）
- [ ] 5.2 archive OpenSpec change（PR 開出、視覺對圖與 merge 交 owner；AI 繼續下一個 change）
