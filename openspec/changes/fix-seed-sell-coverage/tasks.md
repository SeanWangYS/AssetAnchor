# Tasks — fix-seed-sell-coverage

> 設計稽核（2 子代理：邏輯正確性 / 架構簡潔性）已完成，必改點已採納：①動態日期本地時區（禁 toISOString）②e2e 路徑更正為 `apps/mobile/.e2e/` ③補負已實現 SELL（tx-qqq-s01）④spec scenario 去實作化 ⑤檔頭註解與 runbook 同步。

## 1. 實作

- [x] 1.1 `buildTxDoc` 改 `transaction_type: input.transaction_type ?? 'BUY'`（含 JSDoc 與 TX_INPUTS 檔頭註解 L238-241 同步——「全 BUY / tax 0 on BUY」措辭失真）
- [x] 1.2 `TX_INPUTS` 追加三筆 SELL：
  - `tx-2330-s01`（acc-capital 賣 500 @ 2200、fee 1567、tax 3300、**動態當日日期＝本地時間拼 YYYY-MM-DD**）→ 已實現 +719,599
  - `tx-aapl-s01`（acc-firstrade 賣 10 @ 225.10、fee/tax 0、2025-03-20）→ 已實現 +329.0125
  - `tx-qqq-s01`（acc-ibkr 賣 5 @ 450、fee 1、tax 0、2025-05-09）→ 已實現 −190.5（紅色路徑）
- [x] 1.3 Read-back 驗證擴充：txCount 硬斷言 = TX_INPUTS.length；三筆 SELL doc 的 type 斷言；tx-2330-s01 `tax === '3300.0000000000'`
- [x] 1.4 `docs/runbook/local-testing.md`「12 筆交易」→ 15 筆（含 3 筆 SELL）

## 2. 驗證（DoD）

- [x] 2.1 `pnpm --filter @assetanchor/firebase seed:emulator` 跑過、read-back verify OK
- [x] 2.2 查核 `apps/mobile/.e2e/*.yaml` 無持股數字斷言失準（稽核已預查：僅可見性斷言，實跑後複核）
- [x] 2.3 `pnpm -r typecheck`、`pnpm -r lint`、`pnpm exec prettier --check .` 全綠
- [x] 2.4 模擬器登入 test@assetanchor.dev：交易清單見賣出膠囊、2330/AAPL/QQQ 交易歷史見已實現列（含紅色 −190.5 路徑）、持倉「本月已實現」非零（截圖）
- [x] 2.5 設計稽核：2 個獨立子代理（邏輯正確性 / 簡潔性）對照程式碼稽核設計，必改點採納（見上方註記）

## 3. 收尾

- [ ] 3.1 commit（`fix(firebase): seed 補 SELL 交易覆蓋已實現視覺路徑`）→ push → 開 PR
- [ ] 3.2 CI 綠 → 低風險分級自 merge（PR 說明中明示分級依據）→ `/opsx:archive`
