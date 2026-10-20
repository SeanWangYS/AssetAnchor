## REMOVED Requirements

### Requirement: 本月已實現損益指標的空狀態

**Reason**: 持倉總覽 bento 第 4 格改為年化報酬率（XIRR），「本月已實現損益」指標下線（owner 2026-10-21，design spec D2 修訂 / D9）。多數月份顯示「本月無賣出」，使用價值低。

**Migration**: 由 `portfolio-returns` capability 的「持倉總覽年化報酬率 bento」取代；移除 `realizedInMonth` 與 `useRealizedEvents`。全期已實現損益仍保留於 `Position.realizedPnl`（AssetDetail 顯示不受影響）。
