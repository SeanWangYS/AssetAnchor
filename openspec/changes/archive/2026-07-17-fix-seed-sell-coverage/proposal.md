## Why

2026-07-17 全畫面視覺稽核（`docs/qa/visual-audit-2026-07-17.md`）P3-20：emulator 種子資料 12 筆交易**全為 BUY**，導致賣出膠囊、已實現損益列、SELL 相關視覺路徑在本地驗證**零覆蓋**（稽核報告 §4 明列為驗證盲區）。後續 P2/P3 修復批次（零值箭頭、本月已實現、正負號政策）都需要 SELL 資料才能視覺驗證——先補種子是後續各 change 的 enabler。

## What Changes

- `firebase/scripts/seed-emulator.mjs`：
  - `buildTxDoc` 目前硬編 `transaction_type: 'BUY'` → 改為帶入 `input.transaction_type`（預設 `'BUY'`，保持既有 12 筆不變）。
  - `TX_INPUTS` 補 3 筆 SELL：
    1. **2330 賣 500 股**（acc-capital，**動態當月日期、本地時區格式化**——讓「本月已實現損益」恆有非零值可驗）、含台股賣出證交稅 0.3%（planning §6 tax 欄位語意）；
    2. **AAPL 賣 10 股**（acc-firstrade，歷史日期 2025-03-20）、美股 fee/tax 0——覆蓋 USD 已實現路徑；
    3. **QQQ 賣 5 股 @ 450**（acc-ibkr，歷史日期 2025-05-09，低於均價 487.9）——覆蓋**負已實現（紅色）路徑**（設計稽核採納：正負號政策的下游驗證需要紅色半邊）。
  - 兩筆皆滿足 `deriveHoldings` 不變量：同帳戶同標的、賣量 ≤ 先前買量、日期在對應 BUY 之後（違反會 oversell fail-loud）。
  - Read-back 驗證擴充：斷言交易筆數 = `TX_INPUTS.length`、SELL doc 的 `transaction_type === 'SELL'`、台股 SELL `tax > 0`。
- 不動 app 程式、不動 schema（`transaction_type: 'BUY' | 'SELL'` 既有 enum，doc 形狀不變）。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `dev-harness`：本地測試環境的種子資料 SHALL 同時覆蓋 BUY 與 SELL 交易視覺路徑（含已實現損益、當月已實現）。

## Impact

- **firebase**：僅 `scripts/seed-emulator.mjs`（dev tooling；guardrail 僅在 emulator host 環境變數存在時可跑，無 prod 影響面）。
- **不影響**：apps/mobile、packages/shared、functions、firestore.rules、Firestore schema（聖牛不碰）。
- **既有種子數字會變**：2330 現持 2000→1500 股、AAPL 40→30 股、QQQ 30→25 股——視覺稽核歷史截圖的絕對數字不再可比（稽核已收案，可接受）；e2e flow（`apps/mobile/.e2e/*.yaml`）已查核：僅可見性斷言、無持股數字斷言，不受影響。`docs/runbook/local-testing.md` 的「12 筆交易」與 `.emulator-data` 快照需同步（DoD 列入）。
- **風險分級**：dev tooling、自動 gate 全涵蓋、無設計/schema/Money 判斷 → 低風險，適用分級 merge 授權（AI 自 merge）；若 owner 認定不妥可 revert（僅影響本地 emulator）。

## Non-goals

- 不補配息（DIVIDEND）種子——MVP 無此 enum（交易匯入研究中暫緩）。
- 不做全數出清 lot（fully-sold 清倉路徑另由單元測試覆蓋，非視覺盲區主體；且清倉會讓持倉少一檔、傷害其他視覺驗證的資料豐富度）。
- 不動報價 / 匯率種子（報價本就走 live functions；15 分鐘新鮮度陷阱由 runbook 記載）。
- 不改 app 端「本月已實現」顯示邏輯（那是 fix-transactions-ux 的 P3-10）。
