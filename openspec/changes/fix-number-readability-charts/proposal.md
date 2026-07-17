## Why

視覺稽核（`docs/qa/visual-audit-2026-07-17.md`）四項「數字/圖表可讀性」發現：**P2-1** 關鍵大數截斷不可讀（持倉 hero「NT$ 3,657,0…」、總未實現 bento、分析排行「+NT$ 3,077,8…」——帳戶市值 hero 已有 autofit 前例 PR#46，未推廣）；**P2-13** 走勢圖無任何軸標籤（讀不出值，「裝飾級」）+ 分析雙柱圖 Y 軸「5000K/2500K」錯層單位；**P3-5** 2330 獨佔 63.9% 使雙柱圖其餘檔壓成小點；**P3-6** 「投入成本」圖例色塊對比極低 + 排行長名稱截斷。

## What Changes

- **P2-1 autofit 推廣**（PR#46 手法 `adjustsFontSizeToFit + minimumFontScale`）：持倉 hero 大數、總未實現 bento（`Pnl` 加 opt-in `fit` prop）、分析 hero `CountUpAmount`、donut 中心值、分析三排行卡右側金額（HBar rightText）、AssetDetail 股價 hero。
- **P2-13a 走勢圖軸標籤**：`Chart` 加 Y 軸 min/max 刻度標籤與 X 軸起訖日期標籤（opt-in props；`useTrendSeries`/`useSymbolTrendSeries` 回傳值擴充 `startDate/endDate`）。持倉「資產走勢」與個股走勢圖啟用。
- **P2-13b 刻度單位修正**：shared format 新增 `formatAxisTick(v, currency)`（TWD → 萬/億、USD → K/M——修「5000K」錯層）；`DualBar` 刻度改吃 formatter prop。
- **P3-6**：`DualBar` SECONDARY 對比 0.20 → 0.32；HBar 標籤欄寬 82 → 104（緩解長名截斷；「靜態圖看全名」需互動設計，列 owner 建議）。
- **P3-5 不實作**（owner 拍板建議）：換橫條/對數刻度＝更動設計原型圖表形式（ADR-0008），交 owner 決定；建議方案記於總結報告。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `trend-charts`：走勢圖 SHALL 提供 Y 軸極值刻度與 X 軸起訖日期標籤（可讀級，非裝飾級）。
- `analysis`：圖表刻度單位 SHALL 正確分層（不得出現 5000K 類錯層）；排行金額 SHALL 完整可讀（autofit）。
- `currency-display`：關鍵大數（hero/bento/排行）SHALL NOT 截斷——溢出時自動縮字級完整顯示。

## Impact

- **packages/shared**：`format/` 新增 `formatAxisTick`（TDD）。
- **apps/mobile**：`core/ui/charts/Chart.tsx`（軸標籤）、`DualBar.tsx`（formatter prop + 對比）、`HBar.tsx`（欄寬 + rightText autofit）、`core/ui/Pnl.tsx`（`fit` prop）、`useTrendSeries.ts`（起訖日期）、HoldingsOverview / AssetDetail / AnalysisOverview（接線）。
- **不影響**：Firestore schema、Money 精度、functions、rules。**設計包**：原型 Chart 無任何文字元素——軸標籤是對原型元件**新增可見視覺元素**（audit P2-13 驅動的設計偏離），列 owner 拍板項；本 change 不回寫原型（待 owner 核可視覺後另補）。
- **owner gate**：帶 UI → 視覺對圖 + owner merge。owner 拍板項：①走勢圖加軸標籤（原型無，fallback=拔掉 props 即回裝飾級）②刻度萬/億制（fallback K/M）③P3-5 不實作。**Stacked on PR #61**（同批檔案，憲法 #8 唯一 stack 例外；base 請用 merge commit / rebase-merge，勿 squash）。

## Non-goals

- 不做 P3-5 橫條/對數刻度重設計（owner 拍板；建議見總結報告）。
- 不做走勢圖 hover/tooltip 互動（原型無此設計）。
- 不做 HBar 長名完整顯示的互動方案（tooltip/展開——需設計）。
- 不動 DualBar 圖表形式（維持直向雙柱）。
