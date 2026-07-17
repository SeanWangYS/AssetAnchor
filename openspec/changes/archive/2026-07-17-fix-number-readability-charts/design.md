# Design — fix-number-readability-charts

## Context

autofit 全 codebase 僅 AccountDetail hero 一處（`adjustsFontSizeToFit + minimumFontScale={0.5}`，PR#46）。截斷點：HoldingsOverview hero（L386-392 `numberOfLines={1}` 無 autofit）、總未實現 bento＝`Pnl` 內部 Text（Pnl.tsx `numberOfLines={1}`）、Analysis `CountUpAmount`（L452）、donut 中心（L345-347）、HBar rightText、AssetDetail 股價 hero（L156-160）。`Chart.tsx` 只有 Defs/漸層/虛線基準/線/面積/末點——`buildPath` 已算 min/max（L38-39）可直接標刻度；X 起訖需日期，`useTrendSeries` 內部 points 有 `date` 欄位、回傳時丟棄。`DualBar.shortNum`（L30-36）只除 1000 加 K → 5,000,000 顯示「5000K」。

## Goals / Non-Goals

**Goals**：四項可讀性發現（P2-1、P2-13、P3-6）修復；P3-5 明確不實作（owner 拍板）。
**Non-goals**：見 proposal。

## Decisions

### D1. autofit 推廣形狀

- 純 Text 的 hero（HoldingsOverview 大數、CountUpAmount、donut 中心、AssetDetail 股價）：直接加 `numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}`（PR#46 同款）。
- `Pnl` 加 **opt-in** `fit?: boolean`（預設 false）→ 內部 Text 附加 autofit 三件組。**不全域開**：21 個 call site 多在列表 row，全域開會讓 row 文字被擠壓時靜默縮字、視覺不穩定；只在 bento 總未實現與 HBar rightText 場景開。
- `HBar` rightText：rightText Text 直接加 autofit（右欄固定寬、溢出即縮）。

### D2. Chart 軸標籤（opt-in、不破既有用法）

```ts
interface ChartProps {
  // 既有… +
  yTickFormat?: (v: number) => string; // 存在即開啟 Y 極值刻度（稽核簡化：刪 yTicks boolean）
  xLabels?: readonly [string, string] | null; // X 起訖標籤（如 2025/07/18 → 2026/07/18）
}
```

- Y 刻度＝**RN Text 絕對定位 overlay**（外層 `View position:relative`，max 貼 top-left、min 貼 bottom-left 的 pad 帶內）——**不用 SvgText**：Chart 的 `width="100%"` + 固定 viewBox 320 + `preserveAspectRatio="none"` 會把 SVG 文字非等比水平拉伸（機型相依變形，稽核必改 1）。字 9px `textFaint`，同 DualBar gridLabel 視覺族；min 標籤可壓 baseline 虛線（挑色可辨即可）。
- **span 0（水平線）**：線畫在 y=h−pad（底部、非中間）→ 只畫一個標籤且**靠底**跟線走（稽核必改 6）。
- X：底部一行 flex `space-between` 兩個 RN Text（起/訖日期，`formatDisplayDate` 後的字串由 screen 傳入）。
- `useTrendSeries` / `useSymbolTrendSeries` 回傳擴充 `startDate?: string; endDate?: string`（points 首末 `date`；今日 append 時 endDate=today）。`exactOptionalPropertyTypes`：無日期分支**省略 key**、不得 `undefined` 賦值。**intraday（1D/1W）分支 points 只有 ts 無 date → 不回傳起訖、X 標籤不顯示**（稽核必改 5）。
- 啟用點：HoldingsOverview 資產走勢（Y 用 `formatAxisTick(v, displayCcy)`）、AssetDetail 走勢（Y 用**裸價 2 位 local adapter `(v) => v.toFixed(2)`**——formatPrice 含前綴且吃 string，9px 刻度帶 NT$ 太長；稽核必改 4）。

### D3. formatAxisTick（shared format/，TDD）

```
formatAxisTick(v: number, currency: Currency): string
  以 abs = Math.abs(v) 判層（稽核必改 2：負值也要進萬/億層，符號另掛回）：
  TWD：abs ≥ 1e8 → `${trim(abs/1e8)}億`；abs ≥ 1e4 → `${trim(abs/1e4)}萬`；else 整數
  USD/其他：abs ≥ 1e6 → `${trim(abs/1e6)}M`；abs ≥ 1e3 → `${trim(abs/1e3)}K`；else 整數
  trim＝toFixed(1) 去尾零（float 語意：5,255,500 → 525.5萬，測試 pin 此值；稽核必改 3）。
  捨入後升層（先捨後判）：萬層 round 到 ≥10000 → 進億（99,999,999 → 1億，不出「10000萬」）；K→M 同理。
```

修 P2-13b：5,000,000 TWD → 「500萬」（原「5000K」）；zh 慣用萬/億（audit 建議「5M 或 500萬」擇繁中）。owner 拍板項（fallback：一律 K/M）。`DualBar` 的 `tickFormatter: (v:number)=>string` 改**必填**、刪 `shortNum`（全 codebase 僅一個 call site，雙軌預設是零使用者防禦碼——稽核簡化 4）；Analysis 傳 `(v) => formatAxisTick(v, display)`。

### D4. P3-6 對比與欄寬

- `DualBar` SECONDARY `rgba(255,255,255,0.20)` → `0.32`（圖例色塊同源變數，一處改）。
- `HBar` labels width 82 → 104；rightText autofit（D1）。長名仍會省略——完整顯示需 tooltip/展開互動，原型未定義 → owner 建議（總結報告）。
- Donut 中心槽（absoluteFillObject）Text 實際可用寬僅內孔 ≈112px（168−2×28），autofit 以 168 為界名存實亡 → center 內容加 `maxWidth = size − 2×thickness − 8`（稽核建議採納）。

### D5. P3-5 明確不實作

橫條化/對數刻度＝改圖表形式，屬設計原型層決策（ADR-0008 設計最高權威）。記錄建議：改用 HBar 橫條雙欄（市值/成本並列 bar）或 per-symbol 正規化。不動程式。

## Risks / Trade-offs

- [autofit 縮字後視覺不一致] → minimumFontScale 0.5 有下限；僅 hero/bento/排行右欄啟用，列表 row 不開。
- [X 起訖標籤在資料 <2 點時無意義] → xLabels 由 screen 依 state==='ready' 才傳；Chart 對 null 直接不畫。
- [formatAxisTick 萬/億對 USD 模式錯置] → 依 currency 分流；分析頁切 USD 自動 K/M。
- [stacked PR 依賴 #61] → base 分支 merge 方式限 merge commit / rebase-merge（PR 說明置頂註記）。

## Migration Plan

單 PR（stacked on #61）；shared 先（TDD）→ chart 元件 → screens 接線 → 視覺對照。Rollback = revert。

## Open Questions

（無——P3-5 已列 owner 拍板不實作；萬/億 vs K/M 已列 owner 拍板項附 fallback。）
