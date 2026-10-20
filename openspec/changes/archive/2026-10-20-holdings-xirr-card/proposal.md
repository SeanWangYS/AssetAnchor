## Why

持倉總覽 bento 第 4 格「本月已實現損益」owner 幾乎用不到（多數月份顯示「本月無賣出」）；而「總報酬率 +115%」無法反映持有期間——持有 1 年與 5 年賺 115% 意義完全不同。owner 2026-10-21 拍板改為**年化報酬率（XIRR）**（design spec D9，PR #78），並於同日決定 Money 精度口徑（全程 decimal.js）。個股 XIRR 亦為後續持股表格（change ⑥）的「年化」欄所需，故本 change 一併提供可重用的純函式。

## What Changes

- **shared 純函式（TDD）**：
  - 現金流建構：由交易事件流產生 dated cash flows（BUY＝負、SELL＝正，金額＝`transactionTotalWithFees`），每筆以**交易日歷史匯率**（`FX_USDTWD` 日線，休市日 forward-fill、首筆前無資料時取之後最近一筆；USDT 1:1 釘 USD）換成顯示幣別；可依 symbol 篩選（供 ⑥ 個股年化）。
  - XIRR 求解器：**全程 `decimal.js`**（不轉 JS number），無解 / 不收斂回 `null`。
  - 平均投入時間（AYI，Sharesight 口徑：投入金額 × 投入時長加權）與 `annualized | cumulative` 判定；AYI < 1 年改回累積報酬＝（期末市值 + 賣出淨收入 − 買入成本）÷ 買入成本。
- **mobile**：bento 第 4 格改為「年化報酬率」/（AYI < 1 年）「累積報酬率」+ 副標「投入未滿一年，暫不年化」；任一持股缺報價、或歷史匯率尚未載入完成時顯示「—」。valuation 額外輸出 Money 精度的期末市值（不得用 hero 的 `number`）。歷史匯率**共用**走勢圖已載入的 `historyStore`（零新增 Firestore 讀取）。
- **BREAKING（UI）**：移除「本月已實現損益」指標與其專用程式碼（`realizedInMonth`、`useRealizedEvents` 及測試）。

## Capabilities

### New Capabilities

- `portfolio-returns`：投資組合 / 個股的時間加權年化績效——現金流建構（含歷史匯率換算）、XIRR、AYI 與累積報酬降級，以及持倉總覽 bento 的呈現規則。

### Modified Capabilities

- `holdings-derivation`：REMOVE「本月已實現損益指標的空狀態」（指標下線；全期已實現仍保留於 `Position.realizedPnl` 與 AssetDetail）。

## Impact

- **程式碼**：`packages/shared/src/returns/`（新模組）+ index 匯出；`apps/mobile/src/services/valuation/index.ts`（Money 期末市值、移除 `realizedInMonth`）；`apps/mobile/src/features/holdings/`（bento、新 hook 組裝 XIRR 輸入、移除 `useRealizedEvents`）；`holdingsHero.test.ts` 移除對應測試。
- **不動**：Firestore schema / rules、Cloud Functions、`price_history` 寫入流程、走勢圖邏輯。
- **依據**：`docs/design/holdings-overview/holdings-overview-spec.md` D2（修訂）、D9；planning §4（報酬計算邏輯）、§5（多幣別：顯示時換算，ADR-0005）、§13.4（shared TDD + coverage ≥ 90%）。
- **Gate**：帶 UI → owner merge + iOS Simulator 對圖；**Money/FX 精度**（憲法 #2）→ owner 已於 2026-10-21 拍板「全程 decimal.js、歷史匯率、缺資料顯示 —」。

## Non-goals

- 持股表格與個股「年化」欄的 UI（change ⑥；本 change 只提供函式）。
- 配息 / 現金股利納入現金流（尚未記錄配息；XIRR 會低估高股息標的，只寫於程式碼註解）。
- 現金餘額、存入/提領作為外部現金流（hero 口徑為純持股市值）。
- 自訂期間（YTD / 近 1 年）的年化報酬、與大盤基準比較等第二階段功能。
