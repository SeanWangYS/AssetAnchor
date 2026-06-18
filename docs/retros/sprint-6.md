# Sprint 6（MVP Polish）— Retro

> 📸 **進行中快照（非凍結）**：本檔記錄 Sprint 6 截至 2026-06-17 的狀態。**自走批次已完成**，但 sprint **尚未完全關閉**（owner gate 未過、PR 未 merge、change 未 archive）。權威來源：OpenSpec changes `add-symbol-metadata/`、`polish-ui-states/`（皆在 `feature/symbol-metadata`，尚未 archive）。

**狀態：🟡 自走部分完成、待 owner gate** — Sprint 6 所有「可自走」項已做完並累積於 **PR #18**；reconciliation / Sentry / 真機 dogfood 為 owner gate、未做。

- **OpenSpec changes**：`add-symbol-metadata`（symbol 名稱真值）+ `polish-ui-states`（empty/loading/error 三態 + dark-only）
- **分支 / PR**：`feature/symbol-metadata` → **PR #18**（一個 sprint 累積多 commit；owner 規則：跨 2–3 sprint 一次視覺對圖）
- **Sprint 6 = 最後一個 MVP sprint**（planning §13.2）；MVP 核心驗收（現貨價值/成本/報酬率）早於 Sprint 5 達成，本 sprint 為 polish/robustness/收尾。

## TL;DR

- **Symbol metadata 真值**：持倉/交易/詳情名稱由硬編 demo map（`holdingsDemo` `SYMBOL_META`）→ `symbols/{symbolId}` 真值。**無聖牛 schema 變更**（欄位早已齊，僅 populate）。shared `normalizeSymbolMeta`/`symbolDisplayName`（TDD 100%）；functions `fetchSymbolMeta`（onRequest，Yahoo quoteSummary→chart meta 退化 fallback，symbols 單一寫入者 upsert）；mobile `services/symbols`（讀+enrich+去抖）+ AddTransaction 觸發。
- **empty/loading/error 三態**：新增 `core/ui` `ErrorState`/`LoadingView`（與 `EmptyState` 同語彙）；資料畫面補三態（error→loading(冷啟動)→empty→content），純文字空狀態升級為元件（holdings/transactions/accounts）。
- **損益顏色策略（§13.2 item 4）查核＝已是完成狀態**：早已集中於 `Pnl` 元件，無需再做。
- **theme（item 3）= dark-only 確立**（owner 2026-06-17 拍板不做 light/dark/auto 切換）：`core/theme` 加註記；聖牛 `settings.theme` 留 reserved、`ACCENT_OPTIONS` 留（spec 引用）。
- 測試全綠：shared 203 + functions 18 + rules 17；symbol metadata emulator 端到端（`US_NVDA` create+enrich(`name="NVIDIA Corporation"`)+idempotent）。typecheck/lint/format 全綠。

## 任務狀態

| 項目（§13.2 Sprint 6）                   | 狀態                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------- |
| ① Symbol 動態建立 + Yahoo metadata       | ✅ DONE（`add-symbol-metadata`）                                      |
| ② Empty / Loading / Error states         | ✅ DONE（`polish-ui-states`）                                         |
| ③ Settings theme                         | ✅ DONE（依 owner 決策：dark-only，不做切換）                         |
| ④ 損益顏色策略                           | ✅ 已完成（早集中於 `Pnl`，本 sprint 僅查核確認）                     |
| ⑤ 對帳（個股 timeline + 帳戶 cash 對比） | 🟡 timeline 既有 ✅；**帳戶 cash 對比 = 缺 design spec gate（未做）** |
| ⑥ Crash reporting（Sentry）              | 🛑 owner gate（花錢/相依，未做）                                      |
| ⑦ 真機 dogfood                           | 🛑 owner gate（真機，未做）                                           |

## 本次做了什麼（重點）

1. **symbols 單一寫入者（design D3 修訂）**：原規劃 client-create 識別 + backend enrich，apply 階段發現兩寫入者競態會產生缺識別欄位的畸形文件 → 改 **backend `fetchSymbolMeta` 單一寫入者**（不存在寫完整 SymbolDocument、既有只 merge metadata），與 live-quotes（fetchQuote 為 quotes 單一寫入者）一致、race-safe。
2. **三態元件 + 慣例**：`ErrorState`（訊息+可選重試）、`LoadingView`（ActivityIndicator+label）；確立「資料畫面提供 empty/loading/error 三態、冷啟動不閃空」設計系統慣例（spec delta 寫進 `design-system`）。
3. **parallel sub-agent 開發**：empty/loading/error 的畫面接線由 **3 個 sub-agent 按 disjoint feature dir（holdings/transactions/accounts）並行**產出、零衝突，整合後全綠。（owner 要求積極用 parallel agent 自走。）

## 工作流調整（owner 規則，2026-06-17）

- **視覺對圖可跨 2–3 sprint 一次**（不必每 sprint）；整個 sprint 累積在一個 PR、跨 sprint 分 PR（stacked）。詳見記憶 `feedback_loop_whole_sprint_autonomous`。

## 後續 / Gate（待 owner）

- 🛑 **iOS Simulator 視覺對圖**（ADR-0008）：累積 Sprint 6（+後續）一次驗收。
- 🛑 **production `firebase deploy --only functions`（fetchSymbolMeta）**：延後部署 gate。
- 🛑 **對帳 cash 對比**：需 owner 先補 design spec（accounts/holdings spec 未規範對帳 UI）；帳戶真值化涉及「持倉跨帳戶聚合 vs 單帳戶分組」model 抉擇。
- 🛑 **Sentry / 真機 dogfood**：owner 決定是否納入 MVP。
- 過視覺對圖 + owner 批次 merge → archive `add-symbol-metadata` + `polish-ui-states` + sync specs。

## MVP 收尾盤點（非 Sprint 7）

對照 §3 🟢 MVP，剩餘小缺口（非新 sprint）：**股票代號自動補完**（backlog searchable picker）、**「複製上一筆」快捷**、**MMKV 本機 cache 層**（native 延後）。roadmap 無 Sprint 7；第二階段（🟡：配息/TWR/年化/CSV 匯入/每日走勢圖）需 owner 重新規劃才開新 sprint。
