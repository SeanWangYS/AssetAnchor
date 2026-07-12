## Context

分析頁「資產配置」donut 是**真實資料**（`deriveHoldingsSafe(transactions)` × 報價，非 mock）。但分類寫死、與交易表單脫鉤：

- `packages/shared/.../analysisAggregate.ts`：`AnalysisClass='個股'|'ETF'`；`classOf=ETF?'ETF':'個股'`；`byClass=['個股','ETF'].map(...)`。
- 顯示層兩份寫死兩色 map（`chartCategory`、螢幕 `CLASS_COLOR`）。
- 交易表單（`TransactionForm.tsx`）的資產類型選項**已是 enum 驅動**（`ASSET_TYPES.map(...)`），但標籤 map 是表單本地一份。

owner 意圖：圓餅圖分類＝交易表單資產類型、**未來自動同步**（新增 enum 類型自動多切片+配色），且用語統一為「資產類型」。`Donut.tsx` 是泛用 SVG 元件（吃任意 segments），非限制點。

## Goals / Non-Goals

**Goals:**

- 圓餅圖維度＝`asset_type` enum，enum 驅動：新增類型自動多切片。
- 標籤與配色為交易表單與圓餅圖共用的單一事實來源。
- 配色 zero-touch：新增類型自動取色。
- 用語「資產類別」→「資產類型」統一。
- shared 純函式走 TDD、維持 ≥90% coverage。

**Non-Goals:**

- 不改 `asset_type` enum 成員；不改 donut 以外圖卡/hero/報價降級/換算；不動 schema/Money 精度。

## Decisions

### D1：shared 聚合改 enum 驅動（移除寫死分類）

- **選擇**：移除 `AnalysisClass`/`classOf`；rollup 直接鍵在 `AssetType`：`byAssetType = ASSET_TYPES.map(assetType => rollup)`。`AnalysisHolding.assetType`、`AssetTypeRollup { assetType, count, value, sharePct }`。未持有的類型 count 0，交由 UI `filter(count>0)`。
- **為何**：`byAssetType` 由 enum 派生 → 新增 enum 值自動多一 rollup，根除「加了類型但圓餅圖沒同步」的 bug 模式。shared 保持純數學、不含繁中/顏色。
- **替代**：保留寫死 `classOf` 只多加 crypto——仍硬編碼、加新類型要再改三處，不符 owner「自動同步」意圖；否決。

### D2：配色 = enum 次序色盤（zero-touch）

- **選擇**：`core/theme` `categoryPalette`（8 色）+ `assetTypeColor(assetType)=palette[ASSET_TYPES.indexOf(assetType) % len]`。前三色沿用個股紫 `#7C6CF0`/ETF 青 `#35C6EA`/加密貨幣 amber `#F5A623`，續債券玫紅/基金綠/其他灰 + 2 預留色。
- **為何**：新增 enum 類型自動取得下一色，無需手改配色（owner「動態新增色塊」）。modulo 防未來 enum 超過色盤長度。
- **替代**：`Record<AssetType,string>` 顯式色 map——每加類型須手補色（非 zero-touch）；與 owner 意圖不符，否決。色相分散（紫/青/琥珀/玫紅/綠/灰）確保可辨；MVP 為單一 dark 主題。

### D3：標籤單一事實來源（core/assetTypes）

- **選擇**：`ASSET_TYPE_LABEL: Record<AssetType,string>` 移到 `core/assetTypes.ts`，交易表單與圓餅圖共用。Chinese 標籤留在 mobile `core`（非 `packages/shared`，維持 shared 純淨、不含 UI 字串）。
- **為何**：消滅表單/圓餅各一份而失同步；`Record<AssetType>` exhaustiveness 讓「新增 enum 類型」時 typecheck 逼你在**唯一一處**補標籤，兩邊同步取得。
- **替代**：把標籤放 `packages/shared`——會讓 shared 綁 zh-TW 顯示字串，破壞層界；否決。

### D4：用語統一「資產類型」

- 圖卡 note「依資產類別」→「依資產類型」；內部 `byClass/cls/ClassRollup` → `byAssetType/assetType/AssetTypeRollup`；Donut 註解對齊。對齊交易表單既有用語，降低未來「class vs type」混淆（本 bug 的溫床）。

## Risks / Trade-offs

- [色盤 index 依賴 ASSET_TYPES 次序，重排會換色] → enum 次序穩定；重排屬罕見且刻意行為，可接受。
- [BOND/MUTUAL_FUND/OTHER 目前 MVP 無資料] → 但已完整支援（有 label+色），未來持有即自動顯示，符合 enum 驅動精神。
- [動到交易表單] → 僅把本地 label map 換成 import 同內容，選項渲染不變；typecheck + 表單 lint 把關。
- [既有測試鎖定舊 API] → 全面改寫測試，保留個股/ETF 佔比斷言證明無回歸，新增 enum 驅動契約守門。

## Migration Plan

無資料/schema 遷移。純分類/顯示重構，改壞可即時 revert。視覺對圖需 seed 一筆 crypto 持倉（seed 目前無 crypto，於 DoD 階段補）。

## Open Questions

- 圖例排序目前依 ASSET_TYPES 次序（過濾 0 檔後）；如需依市值排序另議，不阻塞。
