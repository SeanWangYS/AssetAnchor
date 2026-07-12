## 1. 分支

- [x] 1.1 從最新 `main` 開 `fix/analysis-crypto-class` 分支

## 2. shared 純函式改 enum 驅動（TDD）

- [x] 2.1 改寫 `analysisAggregate.test.ts`：改用 `byAssetType`/`assetType`；加「byAssetType 涵蓋每個 ASSET_TYPES（enum 驅動契約）」+ crypto 自成一類 + 保留個股/ETF 佔比無回歸
- [x] 2.2 改 `analysisAggregate.ts`：移除 `AnalysisClass`/`classOf`；`AnalysisHolding.assetType`；`ClassRollup`→`AssetTypeRollup`；`byClass`→`byAssetType`（枚舉 `ASSET_TYPES`）
- [x] 2.3 `pnpm --filter @assetanchor/shared test:coverage` 綠、≥90%

## 3. mobile 顯示層（單一事實來源 + 動態配色 + 用語統一）

- [x] 3.1 新增 `core/assetTypes.ts`：`ASSET_TYPE_LABEL: Record<AssetType,string>` + `assetTypeLabel()`（交易表單與圓餅圖共用）
- [x] 3.2 `core/theme/index.ts`：`chartCategory`→`categoryPalette`（8 色）+ `assetTypeColor(assetType)`（enum 次序取色、modulo 保底）；更新 `theme` 匯總 export
- [x] 3.3 `AnalysisOverviewScreen.tsx`：改用 `byAssetType` + `assetTypeColor`/`assetTypeLabel`；移除寫死 `CLASS_COLOR`；note「依資產類別」→「依資產類型」
- [x] 3.4 `analysisData.ts`：型別 re-export 對齊（移除 `AnalysisClass`/`ClassRollup`，加 `AssetTypeRollup`）
- [x] 3.5 `TransactionForm.tsx`：改 import `core/assetTypes` 的 `ASSET_TYPE_LABEL`（移除本地重複 map）
- [x] 3.6 `Donut.tsx`：註解用語對齊「資產類型」

## 4. 驗證

- [x] 4.1 `shared/mobile typecheck` 綠（mobile typecheck 通過即證明跨檔改名 + 共用 label 皆解析）
- [x] 4.2 `shared/mobile lint` + prettier 綠
- [ ] 4.3 **視覺對圖（ADR-0008 DoD，owner gate）**：seed 一筆 crypto 持倉後，iOS Simulator 進分析頁確認 donut 出現三色切片、圖例用「加密貨幣」、圖卡 note「依資產類型」、無 crypto 時退回兩切片

## 5. 交付

- [x] 5.1 Conventional Commit（scopes `shared` + `mobile`）、推分支、更新 PR #55（附 enum 驅動 + 單一來源說明）
- [ ] 5.2 archive OpenSpec change（視覺對圖與 merge 交 owner；merge 後再 archive+sync 主 spec）
