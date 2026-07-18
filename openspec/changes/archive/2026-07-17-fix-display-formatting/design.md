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
- **契約明定**：`formatPrice`/`formatMoney` 回傳**含幣別前綴**（對齊現行 transactionsView 契約，TransactionList 依賴）；`formatAmount` 回傳裸數字（保留負號）。

### D1b. 委派層簽名保真（稽核必改——typecheck 靜默雷）

各 shim **禁止直接 re-export**、必須保留原簽名與語意的 adapter：

| shim                                                                    | 保真點                                                                                                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transactionsView.formatQuantity(value, currency)`                      | 保留 2-arg 簽名（消費端 2 參數呼叫），內部丟棄 currency                                                                                          |
| `holdingsDemo.fmtAmount/fmtMoney(Money, ccy)`、`fmtShares(string, ccy)` | Money 型輸入 adapter                                                                                                                             |
| `analysisData.formatAmount`                                             | **必須保留 `Math.abs`**（AnalysisOverviewScreen 把它餵 Pnl 的 `display`，Pnl 契約要求絕對值字串——丟了會渲染「▼ NT$ -8,000」且 typecheck 不會抓） |
| `analysisData.formatPercent(pct, signed = false)`                       | 保留 positional 簽名與 **signed 預設 false**（shared 預設 true——直接 re-export 會讓 Pnl display 出現雙符號「+ +7.66%」）                         |
| `analysisData.fxFootnoteRate(rates)`                                    | RateMap 取值邏輯留 mobile，只把數字格式化委派 `formatFxRate`                                                                                     |

shim 檔頭統一註記「**adapter only——禁止任何格式規則**」+ `@deprecated`（backlog：畫面直接 import shared 後刪 shim）。

### D2. mobile 收斂策略＝thin delegation（畫面 import 不變）

`accountDisplay` / `holdingsDemo` / `transactionsView` 的同名函式改一行委派 shared（或 `export { formatMoney } from '@assetanchor/shared'` 直接 re-export）；`analysisData.formatAmount/formatSignedAmount/formatPercent/fxFootnoteRate` 同。**不改畫面 import 路徑**——churn 最小、依賴方向合法（features → shared）。三份重複的 `currencyPrefix`/`displayDecimals` 移除本體。分析金額從 `Math.round` 0 位改 `formatMoney`（USD 於分析頁變 2 位——owner 拍板項④）。

### D3. Pnl 零值中性（以顯示字串為準）

`Pnl` 的 flat 判定＝`value === 0` **或顯示字串不含任何非零數字**（`isDisplayZero(display)`：strip 非數字後全為 0；無數字視同 flat）。理由（稽核必改 4）：value 用 `toNumber()` 精確值、display 是捨入後字串——TWD 0 位下 `unrealized = 0.4` 會顯示「NT$ 0」，只判 value===0 修不掉「▲ NT$ 0」。以顯示字串判 0 恰好對齊使用者所見、零 call site churn。`flat` → `colors.textSecondary`、無前綴。`signOf(value)` 留 shared 供非 Pnl 場景。HoldingsOverview 既有 `count === 0 → '—'` 分支保留（「無資料」與「值為 0」是兩件事，P3-10 另一 change 處理）。

### D3b. 設計包同步（與拍板項成對，獨立 commit 供 owner 單點 revert）

| 原型檔                                      | 同步點                              | 對應拍板項 |
| ------------------------------------------- | ----------------------------------- | ---------- |
| `aa-v2-txn.jsx` L116/L174                   | 日期帶空格 → `YYYY/MM/DD`           | ③          |
| `aa-v2-txn.jsx` L176、`aa-txn-data.jsx` L42 | 單價 `px%1?2:0` → 一律 2 位         | ①          |
| `aa-analysis-charts.jsx` L187               | 報酬率 toFixed(1) → toFixed(2)      | ②          |
| `aa-analysis-page.jsx` L36                  | 金額 `nf(Math.round(v))` → USD 2 位 | ④          |
| （grep）arrowed percent 用法                | `Pct arrow` 於報酬率 → +/−          | D5b        |

`aa-core.jsx` 的 `Pct` toFixed(2)、`PnlAmt` US$2/0 與規則表一致，不動。

### D4. 日期收斂點

- `TransactionDetailScreen.formatDate`（本地）→ 刪，改 shared `formatDisplayDate`。
- `AssetTransactionsScreen` TxRow 直印 `transaction_date` → `formatDisplayDate`。
- `accountDisplay.formatSnapshot` → 內部改組字串為 shared `formatDisplayDateTime(d)`（Timestamp unwrap 留原地）。
- DateRange sheet / 表單輸入維持 ISO（輸入格式，P0/P1 change 已定慣例）；期間 chip「9/5–1/15」縮寫**不在**收斂範圍（spec 限「完整日期顯示」）。
- AssetDetail FX note 的 demo fallback 文案（「1 USD = 30.95 TWD」hardcode，AssetDetailScreen L255）非 P2-6 案發點、不收斂（Non-goals）。

### D5. 佔比 largest-remainder 接線

`AnalysisOverviewScreen`：donut 圖例（per-type `sharePct`）與佔比卡（per-holding share）各自為一個 partition，**分別** `allocatePercentages(..., 1)` 後餵 `formatPercent(p, {decimals:1, signed:false})`。donut 弧形角度仍用原始 float（幾何連續量，無加總顯示問題）；只有**顯示文字**走分配值。兩個 partition 各自恆 100.0。
**明文殘差**：圖例（per-type）與佔比卡（per-holding）為兩個獨立分配，同一 type 的圖例值 vs 該 type 下持股顯示加總仍可能差 ±0.1%——可接受、非本 change 目標（視覺對圖時勿當回歸）。
Alternatives considered：「最後一項 = 100 − 其餘和」——殘差全砸單一項、n 項最壞偏差 (n−1)×0.05%，小佔比項可能失真成 0.0% 或負值；largest-remainder ~15 行、每項誤差有界，複雜度合理。

### D5b. 正負表達的既有例外（稽核必改 3）

交易清單/詳情的**已實現損益金額**沿原型用 `+/−`（`aa-v2-txn.jsx:180`、`aa-txn-data.jsx:64`——設計權威即如此），列規則表明文例外；其餘金額損益一律 ▲/▼。帶箭頭的**百分比**（如持倉「總報酬率」card 的 ▲ 105.86%）一律改 `signMode="plusminus"`；原型如有對應 arrowed-percent 用法，納入設計包同步（PR 置頂）。

### D6. 月分組帶年

`groupByMonth` 去掉 `year === currentYear` 分支 → 恆 `${monthLabel} · ${year}`。既有 `dateRange.test.ts` 若鎖舊行為需同步。

## 規則表 → 畫面對照（實作 checklist 用）

| 畫面                    | 改動                                                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HoldingsOverview        | row 均價 `formatPrice`（修 NT$151→NT$ 151.21 + 空格）；percent `toFixed(2)` ×4 → `formatPercent(signed:false)`；總報酬率 card Pnl 改 plusminus；hero/今日等 `Pnl` 自動零值中性                                                       |
| AssetDetail             | 均價/市值 `formatPrice`/`formatMoney`；已實現 `Pnl` 顯示零自動中性（P2-4 主案發點）；percent ×2 收斂；報酬率 Pnl 改 plusminus                                                                                                        |
| AssetTransactions       | **local `fmt()` 的加權均價（L111）與「@ 單價」（L138）改 `formatPrice`（稽核必改——委派不會自動修到，TWD 仍 0 位）**；日期 `formatDisplayDate`                                                                                        |
| TransactionDetail       | 本地 formatDate 刪→shared；金額既有 transactionsView 委派；已實現 +/− 保留（D5b 例外）                                                                                                                                               |
| TransactionList/Screen  | `groupByMonth` 帶年（**補 groupByMonth 單元測試**——現無測試）；price/qty/money 委派自動生效；已實現 +/− 保留                                                                                                                         |
| AccountDetail           | hero 一律 2 位**保留**（規則表明文例外）；percent ×2 收斂 + 報酬率 plusminus；**均價 subtitle L386 raw toDisplayString → `formatPrice`**；快照時間戳自動生效；USDT 持股列 0→2 位（視覺對圖列入）                                     |
| AccountList / Settings  | `formatMoney`/`formatCashTotals` 委派自動生效（空格規則統一 + USDT 前綴雙空格修復；USDT 列 0→2 位視覺對圖列入）                                                                                                                      |
| Analysis                | 金額 `formatMoney`（USD 2 位）；**hero `CountUpAmount`（L410/428）同步幣別小數位（稽核必改——否則 donut 中心 2 位、hero 0 位同畫面自打）**；**L279 本地 prefix 三元式收斂**；報酬率 2 位；佔比 largest-remainder；匯率 `formatFxRate` |
| AddTransaction 編輯帶值 | `toFormDefaults` price 改 `toDisplayString(2)`（修 512.30→512.3 掉尾零；qty/fee/tax 維持現行 trim）                                                                                                                                  |

## Risks / Trade-offs

- [多畫面同時變動、回歸面大] → shared 純函式全 TDD；groupByMonth 補測試；逐畫面視覺對照截圖（含 AccountList/Detail 的 USDT 列 0→2 位變化）；CI typecheck 抓 signature 漂移（abs/signed 語意雷由 D1b 保真表防）。
- [分析頁 USD 模式金額變 2 位、單價一律 2 位偏離原型] → owner 拍板項列 PR 置頂 + 原型同 PR 回寫（D3b）；單一實作點 ⇒ 回退＝shared 內一行修改 + revert 原型 commit。
- [佔比顯示值與弧形角度微差（分配 ±0.1）] → 肉眼不可辨；圖例與加總自洽的價值更高。
- [thin delegation 留下轉手層] → 標「adapter only——禁止任何格式規則」+ `@deprecated`＋backlog 記「畫面直接 import shared 後刪 shim（實際消費檔 12 個）」；本次不做以壓縮 owner-gated PR 的 review 面。

## Migration Plan

單 PR；shared 先行（TDD）→ mobile 委派 → 畫面 call site → 設計包同步 → 視覺對照。Rollback = revert（無 schema/資料遷移）。

## Open Questions

（無——owner 拍板項以最佳判斷實作並列 PR 置頂，fallback 已備。）
