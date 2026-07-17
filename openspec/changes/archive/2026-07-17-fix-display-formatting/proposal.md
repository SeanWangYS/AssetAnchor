## Why

視覺稽核（`docs/qa/visual-audit-2026-07-17.md`）揪出一整類**系統性格式政策不統一**：P2-2（小數位忽 0 忽 2、TWD 均價取整掉精度）、P2-3（日期三套並存）、P2-4（零值掛綠 ▲ 誤導為賺）、P2-6（匯率顯示過度捨入成整數）、P3-1（同畫面兩個「七月」）、P3-2（正負號/箭頭四種樣式）、P3-3（百分比 2 位 vs 1 位）、P3-4（佔比加總 99.9% vs 100.0%）、P3-8（幣別符號空格不一）。根因：`currencyPrefix`/`displayDecimals`/`formatAmount` 在 mobile 三個 feature 各自定義且規則互異（accountDisplay / holdingsDemo / transactionsView）、analysis 又另起爐灶——**沒有單一格式權威**。稽核報告 §6 建議「訂一份 display-formatting 規則表收進 shared format 層，一次消滅一整類」。

## What Changes

- **新增 `packages/shared/src/format/`**（TDD、coverage gate ≥90%）——單一格式權威，實作下列規則表：

  | 規則            | 定義                                                                                                           |
  | --------------- | -------------------------------------------------------------------------------------------------------------- |
  | 幣別前綴        | `NT$` / `US$` / 其餘幣別代碼；與數字間**恆一空格**（P3-8）                                                     |
  | 彙總金額小數位  | TWD 0 位、USD/USDT 2 位、其他幣別 2 位；千分位 en-US（既有慣例保留）                                           |
  | 單價/均價小數位 | **一律 2 位**（P2-2：修 TWD 均價取整掉精度 NT$151→NT$ 151.21、同幣別忽 0 忽 2）                                |
  | 股數            | 至多 4 位小數去尾零 + 千分位（既有行為，收進 shared）                                                          |
  | 百分比          | **報酬率一律 2 位**（分析頁 1 位→2 位統一，P3-3）；**佔比一律 1 位**                                           |
  | 佔比加總        | largest-remainder 分配，**顯示值恆加總 100.0%**（P3-4）                                                        |
  | 正負表達        | 金額損益＝▲/▼（無正負號）；百分比＝+/−（U+2212，無箭頭）——同一數字擇一、不混用（P3-2）                         |
  | 零值            | **中性灰、無箭頭無正負號**（P2-4：杜絕「▲ NT$ 0」）；小數位循幣別規則                                          |
  | 顯示日期        | `YYYY/MM/DD`；時間戳 `YYYY/MM/DD HH:mm`（P2-3 三套→一套）；**表單輸入維持 ISO `YYYY-MM-DD`**（輸入慣例非顯示） |
  | 匯率            | 固定 2 位（`31.99`，不去尾零——修 P2-6「1 USD = 32」）                                                          |
  | 例外（明文）    | 帳戶市值 hero 一律 2 位（PR#46 owner 拍板慣例，含現金/USD 換算精度）；編輯表單帶值不掉尾零                     |

- **mobile 三處重複 util 收斂為 shared 委派**：`accountDisplay` / `holdingsDemo` / `transactionsView` / `analysisData` 的格式函式改為 shared thin re-export（畫面 import 路徑不變、diff 最小）；`fxFootnoteRate` → shared `formatFxRate`。
- **`Pnl` 零值中性化**：值為 0 **或顯示字串捨入後為 0**（如 TWD 0 位下的 0.4）→ 次文字色、無 ▲/▼ 無 +/−（修 AssetDetail「已實現 ▲ NT$ 0」，含捨入殘值案）。
- **交易月分組一律帶年**（P3-1：「七月 · 2026」）。
- **分析頁佔比**（donut 圖例 + 佔比卡）改經 largest-remainder 分配後顯示。
- **設計包同步（獨立 commit、PR 置頂明示；與拍板項成對）**：`aa-v2-txn.jsx`（日期 + 單價 2 位）、`aa-txn-data.jsx`（單價 2 位）、`aa-analysis-charts.jsx`（報酬率 2 位）、`aa-analysis-page.jsx`（金額 USD 2 位）；規則表例外——交易紀錄已實現金額沿原型用 +/−。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `currency-display`：新增「顯示格式政策」requirement（幣別×欄位×小數位×零值×正負號×日期×匯率的單一規則表，shared format 層為唯一實作點）。
- `analysis`：佔比顯示 SHALL 經 largest-remainder 分配、加總恆為 100.0%；報酬率百分比精度與全 app 一致（2 位）。
- `transaction-entry`：交易清單月分組標題 SHALL 恆帶西元年。

## Impact

- **packages/shared**：新 `src/format/`（`currency.ts`、`percent.ts`、`date.ts`、`fx.ts`、index）+ `src/index.ts` export。TDD、coverage ≥90%。
- **apps/mobile**：`accountDisplay.ts`、`holdingsDemo.ts`、`transactionsView.ts`、`analysisData.ts`（改委派）；`core/ui/Pnl.tsx`（零值中性）；`HoldingsOverviewScreen`、`AssetDetailScreen`、`AssetTransactionsScreen`、`TransactionDetailScreen`、`AccountDetailScreen`、`AnalysisOverviewScreen`（call site 收斂：inline `toFixed(2)`/`toLocaleString` → shared；日期顯示統一）。
- **docs/design**：`app-prototype/prototype/aa-v2-txn.jsx`（日期格式）、`aa-analysis-charts.jsx`（報酬率 2 位）——設計包編輯，PR 置頂明示。
- **不影響**：Firestore schema（聖牛不碰）、Money 精度核心（ADR-0005 —— format 層只消費 `toDisplayString`/`toNumber` 逃生門，不動運算）、functions、rules。
- **owner gate**：帶 UI → 視覺對圖 + owner 本人 merge。owner 拍板項（PR 置頂）：①單價一律 2 位（偏離原型 `px%1?2:0`，fallback 維持原型式）②分析報酬率 1→2 位（fallback 維持 1 位）③日期 compact `YYYY/MM/DD`（fallback 原型帶空格式）④分析金額 USD 改 2 位與全 app 一致（fallback 維持原型 0 位）。

## Non-goals

- 不動 P2-1 autofit / P2-13 圖表軸標籤（下一個 change：fix-number-readability-charts）。
- 不動「本月已實現 0 vs 無資料」語意（fix-transactions-ux 的 P3-10）。
- 不動帳戶清單「—」語意與現金卡（fix-accounts-ui-polish 的 P2-7/P2-8）。
- 不加持倉列百分比標籤（P3-8 標籤半項）——留 owner 拍板（prototype 列右側僅百分比，加標籤=版面設計變更；建議見總結報告）。
- 不遷移 groupByMonth 至 shared（維持 feature-local，僅改帶年邏輯——搬家屬既有 backlog 項）。
- 不統一 group header 全名月（七月）vs 列日期短月（7月）——兩者為「標題 vs 資料列」不同層級的既有設計，非 P3-1 範圍。
