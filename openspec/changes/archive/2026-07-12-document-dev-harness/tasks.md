## 1. 新增架構參考（docs/architecture.md）

- [x] 1.1 蒐集事實：對照 `apps/`、`packages/shared/src/`、`apps/functions/src/`、`firebase/firestore.rules`，列出 workspace / functions 模組 / Firestore 集合 / 寫入權限（作為畫圖依據）
- [x] 1.2 新建 `docs/architecture.md`，撰寫元件拓樸 mermaid（subgraph：Client / Shared / Backend / Firestore / External / Auth / Monitoring / Dev；邊標資料流 + 寫入權限）
- [x] 1.3 於同檔加報價流程 sequence mermaid（symbol 新增 → onSymbolCreated → Yahoo → 寫 quotes/{symbolId} → client 讀回 → MMKV 快取 → 失敗降級）
- [x] 1.4 檔頂標「權威仍為 code，本圖為 top-view 導覽」；驗證兩段 mermaid 語法可解析、內容與 1.1 事實一致

## 2. 新增 goal-dev-cycle runbook（docs/runbook/goal-dev-cycle.md）

- [x] 2.1 新建檔案，寫 harness 兩層定義（機制核心＝Claude Code 提供 / 治理層＝專案定義）+「LLM 創造、harness 約束驗證」分工原則
- [x] 2.2 寫 `/goal` 完成條件範本，含三道防呆（transcript-echo、anti-hack 條款、回合上限 N=2 / 20 turn 預設）與「evaluator 不能呼叫工具」說明
- [x] 2.3 寫軟/硬 gate 機制：soft 准入判準（傷害延遲 > 審查延遲）、硬 gate 清單、結構化 BLOCKED 訊號格式、tier-orthogonal 封鎖清單、circuit breaker、永不 auto-merge soft-gated PR 紅線
- [x] 2.4 從 `autonomous-dev-loop.md` 遷移仍適用的內容（工作佇列、分級 merge、環境關鍵事實），改用 `/goal` 敘述；附業界依據引用（LangChain / Anthropic / /goal 官方 / OWASP）
- [x] 2.5 於 `docs/runbook/autonomous-dev-loop.md` 頂部加 deprecation 標頭指向新檔，內容保留不刪

## 3. 重構 CLAUDE.md（憲法 + DoD + 索引骨架）

- [x] 3.1 重構前：把現行 9 條憲法與人類介入 gate 逐條抄出（作為 3.5 語意對照基準）
- [x] 3.2 憲法去重：每條壓成不變量一句話 + 指向權威 ADR/planning；設計包權威 / Money / GitHub Flow 各只留一處完整敘述、其餘改指標式引用
- [x] 3.3 新增單一權威 DoD 區塊：核心清單（typecheck/lint/prettier、shared coverage≥90%、變動純函式有測試、動 rules 就測、change 已 archive+spec sync）每項標可機器驗證指令 + 條件式加項（UI→視覺對圖 / schema→聖牛 / Money→ADR-0005）
- [x] 3.4 新增架構摘要 + 指向 `docs/architecture.md`；新增本地環境 port 速查表（Auth 9099 / Firestore 8080 / UI 4000 / Functions 5001[emulators:fn] / Metro 8081）+ 指向 `local-testing.md`；新增 `/goal` 循環摘要 + 指向 `goal-dev-cycle.md`
- [x] 3.5 語意保真驗收：以 3.1 基準逐條對照，確認每條約束力與內容不變、僅表述精簡

## 4. 對齊與收尾

- [x] 4.1 對齊 `docs/runbook/local-testing.md` 的 port 敘述與 CLAUDE.md 速查表一致（含 emulators 預設不含 functions 的說明）
- [x] 4.2 交叉引用檢查：DoD ↔ goal-dev-cycle、CLAUDE.md 摘要 ↔ architecture.md / goal-dev-cycle.md 指向正確、無斷連結
- [x] 4.3 跑 `pnpm exec prettier --check .`（docs 格式）綠；mermaid CLI 實 render 兩張圖驗證語法
- [x] 4.4 從最新 `main` 拉 `feature/document-dev-harness` 分支、commit（scope: docs）、開 PR；因改動專案憲法 CLAUDE.md → 視為 owner-gated，PR 交 owner merge（不自 merge）
