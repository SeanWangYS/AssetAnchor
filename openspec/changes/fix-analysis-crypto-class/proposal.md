## Why

分析頁「資產配置」donut 只顯示**兩種**切片（個股 / ETF），即使使用者已持有加密貨幣——crypto 市值被默默併入「個股」。

根因是分類**寫死**、與交易表單的資產類型選項**脫鉤**：`packages/shared/.../analysisAggregate.ts` 把六種 `AssetType` 硬壓成兩值展示分類（`classOf` 把 CRYPTO 併入個股、`byClass` 只枚舉 `['個股','ETF']`），顯示層再各有一份寫死兩色的 map。因此每次在 `asset_type` enum 新增類型（如 CRYPTO），圓餅圖都不會自動同步——這正是本 bug 的模式。

owner 的真實意圖不只是「補一個 crypto 切片」，而是：**圓餅圖的分類＝交易表單的資產類型，且未來自動同步**——以後在 enum 新增任一資產類型，圓餅圖就自動多一塊切片＋自動配色，無需再改分類/配色碼。並要求把圖卡右上角字串「資產類別」統一為「資產類型」。

## What Changes

- **圓餅圖改為 enum 驅動**：`analysisAggregate` 不再有寫死的 `AnalysisClass`/`classOf`，改為逐一列舉 `ASSET_TYPES` 產生 `byAssetType` rollup（每個 asset_type 一個 rollup，未持有者 count 0）。持有某類型即成獨立切片。**新增 asset_type enum 值 → 圓餅圖自動多一 rollup**，本檔零改動。
- **顯示標籤單一事實來源**：把資產類型繁中標籤（個股/ETF/加密貨幣/債券/基金/其他）從交易表單抽到 mobile `core/assetTypes.ts` 的 `ASSET_TYPE_LABEL`（`Record<AssetType,string>`）；**交易表單與圓餅圖共用同一份**，不再各寫一份而失同步。
- **動態配色（zero-touch）**：新增 `core/theme` 的 `categoryPalette` + `assetTypeColor(assetType)`——依 `ASSET_TYPES` 次序取色（前三色沿用個股紫/ETF 青/加密貨幣 amber，其後債券/基金/其他 + 預留色），**新增類型自動取得下一色，無需手改配色**。
- **關鍵字統一**：資產配置圖卡右上角 note「依資產類別」→「依資產類型」；相關內部命名（`byClass`→`byAssetType`、`cls`→`assetType`、`ClassRollup`→`AssetTypeRollup`）一併對齊「資產類型」。
- **測試**：`analysisAggregate.test.ts` 改用新 API，含「byAssetType 涵蓋每個 ASSET_TYPES」enum 驅動契約守門 + crypto 自成一類 + 既有個股/ETF 佔比無回歸。

## Capabilities

### New Capabilities

<!-- 無新增 capability -->

### Modified Capabilities

- `analysis`: 「圓餅維度為資產類別」需求改為「圓餅維度為資產類型」——維度由寫死兩類改為 **`asset_type` enum 驅動**（每類型一切片、動態配色、與交易表單同源）；「分析聚合為可測 shared 純函式」的 rollup 由 `byClass`（兩類）改為 `byAssetType`（枚舉 ASSET_TYPES）。

## Impact

- **shared（根因）**：`packages/shared/src/analysis/analysisAggregate.ts`——移除 `AnalysisClass`/`classOf`；`AnalysisHolding.cls`→`assetType`；`ClassRollup`→`AssetTypeRollup`；`byClass`→`byAssetType`（枚舉 `ASSET_TYPES`）。＋ `analysisAggregate.test.ts`。純函式、走 TDD、納入 coverage gate。
- **mobile（顯示層）**：
  - 新增 `core/assetTypes.ts`（`ASSET_TYPE_LABEL` 單一事實來源）。
  - `core/theme/index.ts`：`chartCategory`→`categoryPalette` + `assetTypeColor()`。
  - `features/analysis/screens/AnalysisOverviewScreen.tsx`：用 `byAssetType` + `assetTypeColor`/`assetTypeLabel`；note 改「依資產類型」；移除寫死 `CLASS_COLOR`。
  - `features/analysis/analysisData.ts`：型別 re-export 對齊（`AssetTypeRollup`）。
  - `features/transactions/components/TransactionForm.tsx`：改用 `core/assetTypes` 的 `ASSET_TYPE_LABEL`（移除本地重複 map）。
  - `core/ui/charts/Donut.tsx`：註解用語對齊。
- **不影響**：Firestore schema（無變更，非聖牛）、`Money`/decimal 精度（ADR-0005，聚合金額仍全程 `Money`）、functions、`asset_type` enum 定義本身（不變動，只是改「消費它的方式」）。
- **測試/驗收**：shared 純函式單元測試（enum 驅動契約 + crypto + 無回歸）＋ 帶 UI → 依 ADR-0008 需 iOS Simulator 視覺對圖（DoD，需 seed 一筆 crypto 持倉才看得到第三色）。**owner 本人 merge**（UI 視覺保真 + 觸及 shared 分類語意 + 動到交易表單）。

## Non-goals

- **不改** `asset_type` enum 的成員（維持 STOCK/ETF/CRYPTO/BOND/MUTUAL_FUND/OTHER）；本 change 是讓消費端 enum 驅動，不動 enum 本身。
- **不改** donut 以外的四張圖卡、hero、報價降級、多幣別換算邏輯。
- **不改** 交易表單的資產類型**選項來源**（本就 enum 驅動）；只把標籤 map 收斂成共用單一來源。
- **不動** Firestore schema、Money/decimal 精度（ADR-0005）。不做 i18n（MVP 純繁中）。
