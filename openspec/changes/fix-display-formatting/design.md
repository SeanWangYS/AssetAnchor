# Design — fix-display-formatting

## Context

四套格式化實作並存：`transactionsView.ts`（regex 千分位、price `整數?0:2` 位）、`accountDisplay.ts`（toLocaleString、USD 2 / 其餘 0、**USDT 被歸 0 位**與他處不一）、`holdingsDemo.ts`（toLocaleString、USD/USDT 2）、`analysisData.ts`（`Math.round` 一律 0 位、percent 1 位）。零值方向由 `core/ui/Pnl.tsx` 的 `value >= 0` 判定——**0 被畫成綠 ▲**。日期三套：`TransactionDetailScreen` 本地 `formatDate`（`YYYY / MM / DD`）、`AssetTransactionsScreen` 直印 ISO、`accountDisplay.formatSnapshot`（`YYYY/MM/DD HH:mm`）。匯率 `fxFootnoteRate` 用 `Math.round(n*100)/100` + `String()` 去尾零 → 「32」。分析佔比兩路徑（shared `analysisAggregate.sharePct`（Decimal per-type）vs screen 內 float per-holding），皆四捨五入後直印、不保證加總 100。

設計權威（app-prototype）：`nf()` = en-US 千分位；`Pct` = `toFixed(2)` + 「箭頭或 +/− 擇一」；`txFmt` = `US$ 2 / NT$ 0`（帶空格）；analysis 圖表 `toFixed(1)`。原型自身在百分比精度（2 vs 1）與單價位數（`px%1?2:0`）上不一致——本 change 統一並回寫設計包（owner 拍板項，PR 置頂）。

## Goals / Non-Goals

**Goals**：單一 shared format 權威 + 全 call site 收斂；九項稽核發現（P2-2/3/4/6、P3-1/2/3/4/8-空格）一次修。
**Non-goals**：見 proposal。

## Decisions

### D1. shared `format/` 模組形狀

```
packages/shared/src/format/
  currency.ts   currencyPrefix / amountDisplayDecimals / formatAmount /
                formatMoney / formatPrice / formatQuantity / signOf
  percent.ts    formatPercent / allocatePercentages
  date.ts       formatDisplayDate / formatDisplayDateTime
  fx.ts         formatFxRate
  index.ts      re-export
```

- 輸入一律 canonical decimal string + `Currency`（或 `Money`）；內部經 `Money`，`toNumber()` 僅用於 `toLocaleString` 千分位（既有「顯示逃生門」慣例，ADR-0005 允許）。**千分位改用 `toDisplayString` 字串 + regex 分組**（transactionsView 既有手法）而非 `toNumber().toLocaleString`——大額 TWD（>2^53 之前都安全，但字串路徑零精度風險）且與 Money 小數規則一致。
- `formatAmount(value, ccy)`：幣別小數位（TWD 0 / USD·USDT 2 / 其他 2）+ 千分位；保留負號 `-`。`formatMoney` = 前綴 + 空格 + `formatAmount`。
- `formatPrice(value, ccy)`：**一律 2 位**（規則表）；`formatQuantity`：≤4 位去尾零（自 transactionsView 搬入，去 currency 參數不必要耦合——股數與幣別無關）。
- `signOf(value: number): 'up' | 'down' | 'flat'`：`0 → flat`。供 `Pnl` 與任何方向判斷用（單一定義點）。
- `formatPercent(pct, { decimals = 2, signed = true })`：`+`/`−`（U+2212）、`signed:false` 回絕對值字串（Pnl display 用）；**0 → 無正負號**（`0.00%`）。
- `allocatePercentages(weights: number[], decimals = 1): number[]`：largest-remainder（Hamilton），全零/空輸入回全零陣列；負權重不支援（throw——佔比語意無負值）。
- `formatDisplayDate(iso: string)`：`YYYY-MM-DD` → `YYYY/MM/DD`（非法輸入原樣回傳，防禦與 dayOfMonth 同哲學）；`formatDisplayDateTime(date: Date)`：`YYYY/MM/DD HH:mm`（accountDisplay.formatSnapshot 的 Date 轉換邏輯留在 mobile——Firestore Timestamp unwrap 是 IO 邊界，不進 shared 純函式）。
- `formatFxRate(rate: string | number)`：固定 `toFixed(2)` 字串；非有限值回 `'—'`。

### D2. mobile 收斂策略＝thin delegation（畫面 import 不變）

`accountDisplay` / `holdingsDemo` / `transactionsView` 的同名函式改一行委派 shared（或 `export { formatMoney } from '@assetanchor/shared'` 直接 re-export）；`analysisData.formatAmount/formatSignedAmount/formatPercent/fxFootnoteRate` 同。**不改畫面 import 路徑**——churn 最小、依賴方向合法（features → shared）。三份重複的 `currencyPrefix`/`displayDecimals` 移除本體。分析金額從 `Math.round` 0 位改 `formatMoney`（USD 於分析頁變 2 位——owner 拍板項④）。

### D3. Pnl 零值中性

`Pnl` 改用 `signOf`：`flat` → `colors.textSecondary`、sign 前綴 `''`。呼叫端不變（value=0 自動中性）。HoldingsOverview 既有 `count === 0 → '—'` 分支保留（「無資料」與「值為 0」是兩件事，P3-10 另一 change 處理）。浮點粉塵：呼叫端傳 `toNumber()` 的精確 0 才會 flat，±1e-9 仍算方向——可接受（來源是 Money 精確運算）。

### D4. 日期收斂點

- `TransactionDetailScreen.formatDate`（本地）→ 刪，改 shared `formatDisplayDate`。
- `AssetTransactionsScreen` TxRow 直印 `transaction_date` → `formatDisplayDate`。
- `accountDisplay.formatSnapshot` → 內部改組字串為 shared `formatDisplayDateTime(d)`（Timestamp unwrap 留原地）。
- DateRange sheet / 表單輸入維持 ISO（輸入格式，P0/P1 change 已定慣例）。
- 設計包同步：`aa-v2-txn.jsx` L116（起訖 placeholder）、L174（交易日期 KV）帶空格式 → compact。

### D5. 佔比 largest-remainder 接線

`AnalysisOverviewScreen`：donut 圖例（per-type `sharePct`）與佔比卡（per-holding share）各自為一個 partition，**分別** `allocatePercentages(..., 1)` 後餵 `formatPercent(p, {decimals:1, signed:false})`。donut 弧形角度仍用原始 float（幾何連續量，無加總顯示問題）；只有**顯示文字**走分配值。兩個 partition 各自恆 100.0。

### D6. 月分組帶年

`groupByMonth` 去掉 `year === currentYear` 分支 → 恆 `${monthLabel} · ${year}`。既有 `dateRange.test.ts` 若鎖舊行為需同步。

## 規則表 → 畫面對照（實作 checklist 用）

| 畫面                   | 改動                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| HoldingsOverview       | row 均價 `formatPrice`（修 NT$151→NT$ 151.21 + 空格）；percent `toFixed(2)` ×4 → `formatPercent(signed:false)`；hero/今日等 `Pnl` 自動零值中性 |
| AssetDetail            | 均價/市值 `formatPrice`/`formatMoney`；已實現 `Pnl value=0` 自動中性（P2-4 主案發點）；percent ×2 收斂                                         |
| AssetTransactions      | 日期 `formatDisplayDate`；金額/均價既有委派自動生效                                                                                            |
| TransactionDetail      | 本地 formatDate 刪→shared；金額既有 transactionsView 委派                                                                                      |
| TransactionList/Screen | `groupByMonth` 帶年；price/qty/money 委派自動生效                                                                                              |
| AccountDetail          | hero 一律 2 位**保留**（規則表明文例外）；percent ×2 收斂；快照時間戳自動生效                                                                  |
| AccountList / Settings | `formatMoney`/`formatCashTotals` 委派自動生效（空格規則統一）                                                                                  |
| Analysis               | 金額 `formatMoney`（USD 2 位）；報酬率 2 位；佔比 largest-remainder；匯率 `formatFxRate`                                                       |

## Risks / Trade-offs

- [多畫面同時變動、回歸面大] → shared 純函式全 TDD；mobile 既有 jest（`dateRange.test.ts` 等）+ 逐畫面視覺對照截圖；CI typecheck 抓 signature 漂移。
- [分析頁 USD 模式金額變 2 位、單價一律 2 位偏離原型] → owner 拍板項列 PR 置頂，fallback 一行參數可回退（`decimals` 引數化）。
- [佔比顯示值與弧形角度微差（分配 ±0.1）] → 肉眼不可辨；圖例與加總自洽的價值更高。
- [thin delegation 留下轉手層] → 標 `@deprecated`＋backlog 記「畫面直接 import shared 後刪 shim」；本次不做避免 30+ 檔 import churn。

## Migration Plan

單 PR；shared 先行（TDD）→ mobile 委派 → 畫面 call site → 設計包同步 → 視覺對照。Rollback = revert（無 schema/資料遷移）。

## Open Questions

（無——owner 拍板項以最佳判斷實作並列 PR 置頂，fallback 已備。）
