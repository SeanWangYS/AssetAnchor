# Design — fix-seed-sell-coverage

## Context

`seed-emulator.mjs` 是唯一本地種子來源：12 筆 BUY、4 帳戶、7 symbols、1 匯率 doc。`buildTxDoc`（L422-442）鏡射 shared `buildTransactionDoc`（ADR-0005：`total = price × quantity`、10 位小數 canonical string），但 `transaction_type` 硬編 `'BUY'`（L429）。App 端 `deriveHoldings.scan()` 對 SELL 有 fail-loud 不變量：同 `(market, symbol, currency)` lot 賣量不得超過持有量、依 `transaction_date` 排序處理（賣在買前 = oversell throw）；帳戶層另有 `sellableQuantityForAccount` 驗證。曾有 orphan SELL 造成帳戶頁白屏的前例（fix/account-oversell-crashfix）——**種子 SELL 必須帳戶內自洽**。

## Goals / Non-Goals

**Goals**：讓每次 reseed 後，交易清單有賣出膠囊、AssetTransactions 有已實現損益列、持倉頁「本月已實現」恆為非零、TWD 與 USD 兩條已實現路徑皆可視覺驗證。
**Non-goals**：見 proposal（不動 app / schema / 報價種子；不做清倉路徑）。

## Decisions

1. **`buildTxDoc` 帶 `transaction_type: input.transaction_type ?? 'BUY'`**——預設 BUY 讓既有 12 筆 input 零改動；替代案「逐筆補欄位」噪音大無益。
2. **SELL ×3（TW 正 / US 正 / US 負）**：
   - `tx-2330-s01`：acc-capital 賣 2330 ×500 @ 2200（貼近現價量級，避免畫面出現離譜價）；fee = 1,100,000×0.1425% = 1567.5 → `'1567'`（券商捨去）；tax = ×0.3% = `'3300'`（台股賣出證交稅，讓 TransactionDetail「交易稅」列有值——P0/P1 change 已做「非零才顯示」）；**日期動態 = 執行當日**，遠晚於兩筆 BUY（2024-03/09）→ 無 oversell、且落在當月使「本月已實現」有值。已實現 = (1,100,000−1567−3300) − 751.068×500 = **+719,599 精確**（綠色路徑）。
   - `tx-aapl-s01`：acc-firstrade 賣 AAPL ×10 @ 225.10、fee/tax 0、日期固定 `2025-03-20`（晚於兩筆 BUY 2024-04/10）；已實現 = 2,251 − 192.19875×10 = **+329.0125**（USD 綠色路徑）。
   - `tx-qqq-s01`：acc-ibkr 賣 QQQ ×5 @ 450、fee `'1'`、tax 0、日期固定 `2025-05-09`（晚於兩筆 BUY 2024-07/2025-01）；avgCost = (9,513+5,124)/30 = 487.9 → 已實現 = (2,250−1) − 487.9×5 = **−190.5**（**負已實現紅色路徑**；設計稽核 S1 採納：reseed 即重現勝過手動補交易）。
3. **動態日期只用於 tx-2330-s01，且必須以本地時間拼字串**（`getFullYear()/getMonth()+1/getDate()` + padStart，**禁用 `toISOString()`**——UTC 會在每月 1 日 00:00–08:00（UTC+8）落到上個月，打穿「任一月份 reseed 恆有值」；app 端 monthPrefix 也是本地時間，HoldingsOverviewScreen L338-342）。其餘保持確定性。副作用（每日 reseed 日期漂移）對視覺驗證無害。
4. **Read-back 驗證擴充**：`txCount === TX_INPUTS.length` 硬斷言（原本只印不斷言）；GET `tx-2330-s01` 斷言 `transaction_type==='SELL'` 且 `tax === '3300.0000000000'`（canonical）；GET `tx-aapl-s01`、`tx-qqq-s01` 斷言 type SELL。
5. **順序不敏感**：`TX_INPUTS` 尾端 append 即可（app 端 `chronological` 排序，種子寫入順序無語意）。

## Risks / Trade-offs

- [持股數字改變使既有 e2e/文件失準] → e2e 位於 `apps/mobile/.e2e/*.yaml`（五條 flow）已逐一查核：僅可見性斷言（2330 賣後仍持 1500 股、仍可見），無數字斷言；`docs/runbook/local-testing.md` 的「12 筆交易」同步為 15 筆、reseed 後 `.emulator-data` 快照隨 export 更新；稽核截圖屬歷史證據不追改。
- [動態日期讓 seed 非全確定] → 僅一筆、僅日期欄位；read-back 驗證不依賴該日期值。
- [賣價 2200 與未來實際報價脫節] → 種子本就是 mock；已實現損益計算只依交易欄位，與報價無關。

## Migration Plan

單檔改動；`pnpm --filter @assetanchor/firebase seed:emulator` 重跑即生效（腳本自帶 wipe + read-back verify）。Rollback = revert commit + reseed。

## Open Questions

（無——低風險 dev tooling，決策已於上方定案。）
