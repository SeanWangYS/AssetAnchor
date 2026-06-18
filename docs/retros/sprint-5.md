# Sprint 5（賣出 + 即時報價）— Retro

> 🧊 **凍結歷史紀錄（retro）**：本檔是 Sprint 5（賣出 + 報價，完成於 2026-06-17）的完成報告快照，補寫於 Sprint 6。權威來源：OpenSpec changes `archive/2026-06-17-add-sell-realized-pnl/` 與 `archive/2026-06-17-add-live-quotes/`，以及 `docs/adr/0006-quote-cache-strategy.md`。

**狀態：✅ 完成（2026-06-17）** — 5a + 5b 工程全數完成、對 emulator 端到端驗證、PR #16 / #17 已 merge 進 main、兩個 change 已 archive + sync specs。iOS Simulator 視覺對圖經 owner 延後批次。

- **拆兩個 OpenSpec change**：`add-sell-realized-pnl`（5a）+ `add-live-quotes`（5b）
- **關鍵 ADR**：`docs/adr/0006-quote-cache-strategy.md`（報價策略：Yahoo + 雙層 cache + 15min TTL）
- **分支 / PR**：`feature/sell-realized-pnl` → PR #16；`feature/live-quotes` → PR #17（堆疊於 5a，先 merge #16 再 #17）
- **Firebase 專案**：`assetanchor-832df`

## TL;DR

- **5a 賣出 + 已實現損益**：`deriveHoldings` 改時序掃描支援 SELL（加權平均不變、totalCost 等比遞減、全賣歸零重買新週期、超賣 fail-loud、qty=0 不列入）；新增 `Position.realizedPnl`、`deriveRealizedEvents`、`sellableQuantity`；transaction zod `transaction_type` → `enum(['BUY','SELL'])`。mobile SELL 表單（移除「尚未開放」、超賣/無持倉擋送出）、持倉「本月已實現損益」真值、AssetDetail 已實現列。
- **5b 即時報價（ADR-0006）**：Yahoo Finance + Cloud Function `fetchQuote` 代理 + Firestore `quotes/{symbolId}` cache + 15min TTL。架構 A（後端代理）勝 B（前端直連）——owner 已開通 Blaze 並綁卡。moomoo 否決（需 OpenD 桌面 gateway）。
- **真值彙總上線**：現價 / 市值 / 未實現損益 / 今日漲跌% 全改報價真值；持倉 Hero/bento（總資產 / 未實現 / 總報酬率 / 今日損益）全持倉有報價才算、否則「報價載入中…」（不混 demo）；持倉列 + AssetDetail + pull-to-refresh。
- 測試全綠：shared 純函式 100%（5a 賣出/已實現 + 5b sanitize/freshness）、functions parseYahooChart、rules、mobile typecheck+lint。emulator 實證：QQQ 729.86、總資產 US$220,810、總報酬率 +118.96%、今日 ▼−1.35%。

## 任務狀態

| change                     | tasks | 狀態                                |
| -------------------------- | ----- | ----------------------------------- |
| 5a `add-sell-realized-pnl` | 12/12 | ✅ DONE（PR #16 merged + archived） |
| 5b `add-live-quotes`       | 15/15 | ✅ DONE（PR #17 merged + archived） |

## 本次做了什麼（重點）

1. **賣出時序推導（shared，TDD）**：單趟掃描累積 (market,symbol) 持有量/成本/已實現，逐筆 SELL 產生已實現事件；加權平均成本賣出不變、totalCost 等比遞減；全數賣出歸零、重買開新週期；超賣 fail-loud；qty=0 不列入持倉但交易歷史照顯示。
2. **報價資料鏈（ADR-0006，架構 A）**：`fetchQuote` 採 **onRequest**（非 onCall）以免 mobile 需 RNFirebase functions 原生模組；Yahoo v8 chart endpoint（keyless）；shared `sanitizeQuote`（髒資料 fail-loud）+ `isFresh`（15min TTL，未來時戳視為不新鮮）；Firestore `quotes/{symbolId}` 後端 Admin SDK 寫、client 唯讀。
3. **mobile 報價 client**：`services/quotes`（in-memory + Firestore cache + cache-miss 觸發 fetchQuote 回填）；on-demand 載入目前持倉；pull-to-refresh 強制突破 TTL。
4. **同輪修一個 bug**：AssetTransactionsScreen 摘要持股數只加買入未扣賣出 → 改用 `deriveHoldings` 單一事實來源。

## 實作偏離 ADR（已記錄）

- **onRequest 取代 onCall**：避開 RNFirebase functions 原生模組，對齊 Sprint 4 `seedUsdRate` 模式。
- **MMKV 暫以 in-memory 代**：ADR-0006 規劃的本機持久層 MMKV 為原生模組（需 prebuild），本輪先用 in-memory（重啟後由 Firestore cache 在 TTL 內回填，行為近似）；MMKV 為後續 native-build 增強（純優化、非功能缺口）。

## 後續（非阻擋）

- **MMKV 本機 cache 層**：待 native prebuild 一併處理。
- **iOS Simulator 視覺對圖**：owner 延後批次（核心顯示邏輯已單元測試 + emulator 實證覆蓋）。
- **production `firebase deploy --only functions`（fetchQuote）**：owner 部署 gate；dev 全程對 emulator。
