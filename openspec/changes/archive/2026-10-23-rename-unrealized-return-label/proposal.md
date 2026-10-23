## Why

持倉總覽 bento 第 1 格標「總報酬率」，實際算的是**未實現損益 ÷ 目前持股成本**（只算持有中部位、成本用最新匯率換算），不含已實現損益、也不含買入當時到現在的匯兌差。第 4 格「累積報酬率 / 年化報酬率」則用全部交易現金流與交易日歷史匯率計算。兩格並排時，「總」字讓人以為是整體報酬，owner 在 TestFlight 看到 +40.15% 與 +42.31% 不一致而誤以為是 bug（2026-10-23）。

## What Changes

- 持倉總覽 bento 第 1 格標題「總報酬率」→「**未實現報酬率**」（owner 2026-10-23 選 A：只改文字）。
- 公式、數值、樣式（強調卡光暈）、位置皆不變。
- 同步設計包：`docs/design/holdings-overview/holdings-overview-spec.md`、holdings-overview 原型與 `app-prototype` 原型、`holdings-redesign-mock.html` 的該格標籤。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `portfolio-returns`：新增「持倉總覽未實現報酬率 bento」requirement，明定第 1 格的標題與口徑，與第 4 格區分。

## Impact

- `apps/mobile/src/features/holdings/screens/HoldingsOverviewScreen.tsx`（單一字串）
- `apps/mobile/src/core/ui/Card.tsx`（註解）
- 設計包文件與原型（標籤文字）
- 無 schema / Money / functions / 依賴變更；分析頁不受影響。
