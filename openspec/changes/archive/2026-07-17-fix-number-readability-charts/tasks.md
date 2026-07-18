# Tasks — fix-number-readability-charts

## 1. shared（TDD）

- [x] 1.1 `format/axisTick.ts` 測試 + 實作：formatAxisTick（abs 判層＋符號掛回、先捨後升層 99999999→1億、pin 5255500→525.5萬、9999/10000、USD 999/1000/1e6、0、負值 -120000→-12萬）

## 2. 元件

- [x] 2.1 `Chart.tsx`：yTickFormat / xLabels props（RN Text overlay、非 SvgText；<2 點不畫；span 0 單標籤靠底）
- [x] 2.2 `DualBar.tsx`：tickFormatter 必填、刪 shortNum；SECONDARY 0.20→0.32
- [x] 2.3 `HBar.tsx`：labels 欄寬 82→104；rightText autofit
- [x] 2.4 `Pnl.tsx`：opt-in `fit` prop（autofit 三件組）

## 3. 接線

- [x] 3.1 `useTrendSeries` / `useSymbolTrendSeries` 回傳擴充 startDate/endDate（exactOptionalPropertyTypes 省略 key；intraday 1D/1W 不給）
- [x] 3.2 HoldingsOverview：hero 大數 autofit；總未實現 bento Pnl fit；資產走勢 yTicks+xLabels（formatDisplayDate + formatAxisTick）
- [x] 3.3 AssetDetail：股價 hero autofit；走勢圖 yTickFormat=`(v)=>v.toFixed(2)` 裸價 adapter + xLabels（1D/1W 無）
- [x] 3.4 AnalysisOverview：CountUpAmount/donut 中心 autofit（center 加 maxWidth=內孔寬）；DualBar tickFormatter=formatAxisTick(display)

## 4. 驗證（DoD）

- [x] 4.1 設計稽核：2 獨立子代理（邏輯 / 簡潔）——8 必改全採納（SvgText→RN overlay、abs 判層、捨入 pin、formatPrice adapter、intraday 策略、span0 靠底、原型偏離誠實列 owner 項、spec 去 0.5 常數）+ 簡化（props 3→2、DualBar formatter 必填）
- [x] 4.2 typecheck / lint / prettier / shared coverage / mobile test 全綠
- [x] 4.3 模擬器對照截圖：持倉 hero+bento 不截斷、走勢圖軸標籤（1M/1Y 切換）、個股走勢、分析（刻度 500萬、排行金額全顯、圖例對比）
- [x] 4.4 P3-5 owner 建議記入總結報告

## 5. 收尾

- [x] 5.1 commit → push → PR（stacked on #61、註記 base merge 方式勿 squash；owner 拍板：萬/億制、P3-5 不實作）
- [x] 5.2 CI 綠（owner-gated 不自 merge）→ `/opsx:archive`
