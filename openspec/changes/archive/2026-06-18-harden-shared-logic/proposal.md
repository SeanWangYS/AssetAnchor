## Why

技術債收尾（post-MVP 硬化，backlog 兩項）：(1) 分析頁聚合邏輯目前在 `apps/mobile/src/features/analysis/analysisData.ts`（feature-local、未測）——應重構為 `packages/shared` 純函式並納入 coverage gate；(2) pre-ADR-0005 建立、缺 `total`/`fee`/`tax`/`quantity` 欄位的舊 transaction doc，讀回時會讓 `deriveHoldings` 的 `Money.fromDecimalString(undefined)` 丟 `DecimalError`——需在 Money 邊界 fail-soft（缺值視為 0）。

## What Changes

- **shared 新增 `analysis` 聚合純函式**：把 `aggregateAnalysis`/`returnPercent`/類別分類等**與資料來源無關**的聚合數學抽到 `packages/shared/src/analysis/`（輸入 raw holdings + rates，輸出 totals / byClass）。**行為保持**；mobile `analysisData.ts` 保留 mock `RAW_HOLDINGS` 作為輸入、改呼叫 shared。TDD、進 coverage gate。
- **shared 新增缺欄位防禦**：新增 `toSafeDecimalString(value, fallback='0')` 純函式（**僅** `undefined`/`null` → fallback；present 值原樣通過、損毀仍由 Money fail-loud），`deriveHoldings` 讀 `tx.total/fee/tax/quantity` 時套用 → 舊 doc 缺欄位不再 crash（缺值視為 0）；**ADR-0007 §5b fail-loud 不被弱化**（present-but-invalid 仍擲錯）。TDD。
- **無 UI 變更、無 schema 變更、無新相依**。

## Capabilities

### New Capabilities

<!-- 無 -->

### Modified Capabilities

- `analysis`: 分析聚合改由 `packages/shared` 的可測純函式提供（行為不變，新增「聚合為 shared 純函式且測試覆蓋」需求）。
- `holdings-derivation`: 對缺欄位（舊 schema doc）fail-soft——缺 `total`/`fee`/`tax`/`quantity` 視為 0、不丟 `DecimalError`。

## Impact

- **新增**：`packages/shared/src/analysis/*`（聚合純函式 + 型別 + 測試）、`packages/shared/src/money/` 或 portfolio 內 `toSafeDecimalString`（+ 測試）。
- **修改**：mobile `analysisData.ts`（改 thin consumer，保留 mock 輸入）；`deriveHoldings` 套用 safe parse。
- **無** schema / 相依 / Money 精度規則變更（safe-parse 僅處理「缺值」邊界、不改精度語意）。

## Non-goals

- **不**把分析頁改成真實資料（仍 mock 輸入；真實化需跨 feature 讀 + quotes，屬後續）。
- **不**改 Money 精度語意（10 位小數 canonical 不變；safe-parse 只在「缺值/非法」時回 fallback）。
- **不**做舊資料一次性遷移（防禦於讀取邊界即可；遷移屬後續若需要）。
