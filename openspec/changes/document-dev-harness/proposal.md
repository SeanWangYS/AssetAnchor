## Why

CLAUDE.md 已長成 120 行、每 session 全量載入，且核心概念散落重複：「設計包＝最高權威」在憲法 #1 與整節「設計驅動工作流」各講一次、Money 紀律與 GitHub Flow 亦然，而「什麼算通過開發（DoD）」則散在憲法 #7、`autonomous-dev-loop.md`、planning §2.5，**沒有單一權威定義**。同時專案缺三樣讓 LLM 與人類工程師「快速從 top-view 掌握」的東西：一張元件架構圖、一份本地測試環境速查、一套以 Claude 原生 `/goal` 驅動的自主開發循環與其 harness 框架定義。此 change 把開發框架文件化、去重、並建立可機器驗證的完成標準，讓未來每一輪開發（人類或 LLM）都有單一、清楚、可自我判斷的依據。

## What Changes

- **重構 CLAUDE.md（中度）**：收斂成「憲法 + DoD + 索引」骨架；憲法 9 條每條壓成不變量一句話 + 指向權威 ADR；重複的「設計驅動工作流」「GitHub Flow 細節」壓成指標式引用（權威細節留在既有 ADR / planning，不再於 CLAUDE.md 複述）。
- **新增單一權威 DoD**（通過開發的標準）：核心清單（每個 change 都要）+ 條件式加項（帶 UI / 動 schema / 動 Money），每項對應一個可機器驗證的指令，供 `/goal` evaluator 使用。
- **新增 `docs/architecture.md`**：兩張 mermaid——(1) 元件拓樸圖（前後端 / Firestore / cache / auth / external / dev）、(2) 報價取得流程 sequence；CLAUDE.md 放摘要 + 指向。
- **新增本地環境速查表**：CLAUDE.md inline 一張「service × port × 何時需要」表（含「預設 emulators 不含 functions、需 `emulators:fn`」關鍵細節）+ 指向 `local-testing.md`。
- **新增 `docs/runbook/goal-dev-cycle.md`**：以 `/goal` 條件驅動整個 sprint/佇列為新主驅動；定義 harness 兩層框架（機制核心＝Claude Code 提供 / 治理層＝專案定義）、完成條件範本、軟/硬 gate 機制與 BLOCKED 訊號。**繼承並取代** `autonomous-dev-loop.md`（舊檔保留 + 頂部標 deprecation 指向新檔，對齊「保留歷史」偏好）。
- 微調 `local-testing.md` 使 port 敘述與 CLAUDE.md 速查一致。

## Capabilities

### New Capabilities

- `dev-harness`: 專案開發框架的權威文件化——單一 DoD（通過開發的標準）、top-view 架構參考、本地測試環境參考、以及 `/goal` 驅動的自主開發循環與 harness（機制核心 + 治理層）定義。涵蓋 CLAUDE.md 骨架、`docs/architecture.md`、`docs/runbook/goal-dev-cycle.md`。

### Modified Capabilities

<!-- 無：本 change 不改任何產品 capability 的 spec-level 行為，純開發框架文件化。 -->

## Impact

- **純文件 change**：不動 code、UI、Firestore schema（聖牛）、Money/decimal 精度規則——依 CLAUDE.md §8 分級屬**低風險層級**（docs），AI 可自 merge。
- 受影響檔案：`CLAUDE.md`（重構）、`docs/architecture.md`（新建）、`docs/runbook/goal-dev-cycle.md`（新建）、`docs/runbook/autonomous-dev-loop.md`（加 deprecation 標頭、內容保留）、`docs/runbook/local-testing.md`（port 敘述對齊）。
- 不改 planning §6 schema、不改 ADR 決策；新框架與既有憲法/ADR/planning 一致（引用而非取代）。
- 對齊 planning §13.4 測試紀律與 §2.5 自動化開發契約；`goal-dev-cycle.md` 是 §2.5 的可執行化，非新決策。

## Non-goals

- **不改任何產品功能 / UI / schema / Money 規則**——純開發框架文件化。
- **不引入自動化執行機制**（不寫 Stop-hook 腳本、不改 CI、不建 `/goal` 自動觸發設定）；本 change 只產出「文件與定義」，實際跑 `/goal` 是後續使用行為。
- **不刪除既有文件**：`autonomous-dev-loop.md` 保留（僅標 deprecation），對齊「merge 後保留歷史」偏好。
- **不重啟已拍板決策**（planning §2–§8、ADR-0005/0007/0008、GitHub Flow §8）——僅去重、集中、指向。
- **不涵蓋第二/三階段功能規劃**（券商自動匯入、i18n、多資產類別擴充等）——與 MVP 邊界無關。
