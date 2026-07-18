# dev-harness Specification

## Purpose

TBD - created by syncing change document-dev-harness. Update Purpose after archive.

## Requirements

### Requirement: 單一權威的通過開發標準（DoD）

專案 SHALL 在 `CLAUDE.md` 提供**單一權威**的「通過開發的標準（Definition of Done）」區塊，作為判斷一個 OpenSpec change「完成、可 merge」的唯一依據；散落於憲法條文、runbook、planning 的既有 DoD 敘述 SHALL 改為指向此區塊，不再各自複述。

DoD MUST 由兩部分組成：(1) **核心清單**——每個 change 都必須滿足；(2) **條件式加項**——依 change 觸及的面向（UI / schema / Money）才觸發。核心清單每一項 MUST 對應一個可機器驗證的指令或可觀察狀態（供 `/goal` evaluator 使用）。

#### Scenario: 核心清單涵蓋自動化 gate

- **WHEN** 讀者查閱 CLAUDE.md 的 DoD 區塊
- **THEN** 核心清單包含 `pnpm -r typecheck`、`pnpm -r lint`、`prettier --check` 全綠、`@assetanchor/shared` coverage ≥ 90%、變動的純函式有測試、動到 `firestore.rules` 就有 rules 測試、OpenSpec change 已 archive 且 spec 已 sync
- **AND** 每一項旁邊都標明對應的可執行指令或可觀察判準

#### Scenario: 條件式加項對應人類 gate

- **WHEN** 一個 change 帶 UI、或動 Firestore schema、或動 Money/匯率精度
- **THEN** DoD 條件式加項分別要求：帶 UI → iOS Simulator 視覺對圖（owner gate，ADR-0008）；動 schema → 聖牛 gate（owner，planning §6）；動 Money → decimal 精度規則（ADR-0005）

#### Scenario: DoD 為唯一事實來源

- **WHEN** 讀者在憲法 #7、`goal-dev-cycle.md` 或 planning §2.5 尋找「什麼算完成」
- **THEN** 這些位置指向 CLAUDE.md 的 DoD 區塊，而非各自定義一份可能不一致的清單

### Requirement: CLAUDE.md 精簡骨架與去重

`CLAUDE.md` SHALL 收斂成「憲法 + DoD + 索引」骨架：憲法每條壓成不變量一句話並指向權威來源（ADR / planning）；同一主題（設計包權威、Money 紀律、GitHub Flow）SHALL 只有一處權威敘述，其餘位置以指標式引用取代重複長篇。重構 MUST 不改變任何既有規則的**語意**，只改組織與去重。

#### Scenario: 單一主題不重複定義

- **WHEN** 讀者在 CLAUDE.md 搜尋「設計包＝最高權威」「Money 紀律」「GitHub Flow 分級 merge」
- **THEN** 每個主題只有一處完整敘述，其他提及處為指向該處或對應 ADR 的引用

#### Scenario: 語意保真

- **WHEN** 比對重構前後的每一條憲法規則與人類介入 gate
- **THEN** 規則的約束力與內容不變，僅表述更精簡、且附權威來源指向

### Requirement: Top-view 架構參考

專案 SHALL 提供 `docs/architecture.md`，以軟體架構師視角用 mermaid 描述整個 App 的元件架構，讓 LLM 與人類工程師能快速從 top-view 掌握、評估新功能落點；`CLAUDE.md` SHALL 放一段摘要並指向此檔。

#### Scenario: 元件拓樸圖涵蓋各層

- **WHEN** 讀者開啟 `docs/architecture.md` 的拓樸圖
- **THEN** 圖以 subgraph 區分 Client（mobile：features / core / services / Zustand / MMKV）、Shared（純函式模組）、Backend（functions：quotes / history / symbols / exchangeRates）、Firestore（集合 + per-user 隔離）、External（Yahoo Finance）、Auth（Firebase Auth）、Monitoring（Sentry）、Dev（Emulator Suite）
- **AND** 邊上標註主要資料流與寫入權限（client 只寫 `users/**`；`quotes`/`exchange_rates` 只後端寫）

#### Scenario: 報價流程 sequence 圖

- **WHEN** 讀者查閱報價取得流程圖
- **THEN** sequence 圖呈現 symbol 新增 → `onSymbolCreated` trigger → Yahoo → 寫 `quotes/{symbolId}` → client 讀回 → MMKV 快取，並標出失敗降級路徑

#### Scenario: 圖與實際 workspace 一致

- **WHEN** 對照 `apps/`、`packages/shared/src/`、`firebase/firestore.rules`
- **THEN** 架構圖中的 workspace、functions 模組、Firestore 集合與寫入權限與實際程式碼一致

### Requirement: 本地測試環境速查表

`CLAUDE.md` SHALL inline 一張「service × port × 何時需要」速查表，並指向 `docs/runbook/local-testing.md` 取得完整步驟；表與 runbook 的 port 敘述 MUST 一致。

#### Scenario: 速查表列出所有 service 與 port

- **WHEN** 讀者查閱速查表
- **THEN** 表列出 Firebase Auth（9099）、Firestore（8080）、Emulator UI（4000）、Functions（5001）、Metro/Expo（8081），並標明各自的啟動指令與「何時需要」

#### Scenario: 標明 functions emulator 非預設

- **WHEN** 讀者需要本地報價 / 匯率 / history
- **THEN** 速查表明確指出預設 `emulators` 指令**不含** functions，需改用 `emulators:fn` 才會起 5001

### Requirement: /goal 驅動的自主開發循環

專案 SHALL 提供 `docs/runbook/goal-dev-cycle.md`，定義以 Claude 原生 `/goal`（條件驅動）跑完整個 sprint / 工作佇列的自主開發循環，作為新的主驅動；此檔 SHALL 繼承並取代 `docs/runbook/autonomous-dev-loop.md`（`/loop` 時間間隔版）。

#### Scenario: 完成條件範本可自我判定且防呆

- **WHEN** 讀者依範本設定 `/goal` 完成條件
- **THEN** 條件表述為「佇列空（實跑 `openspec list` 印進 transcript 為證）且各 change 的 DoD 指令已在 transcript 跑過並 exit 0，OR 已寫出結構化 `BLOCKED:` 訊號」
- **AND** 條件明列「不得修改或刪除測試、DoD 指令或佇列檔以滿足條件」，並含回合上限（連續 N 次無法推進或 20 turn 未達成 → 寫 BLOCKED 收手）

#### Scenario: 因應 evaluator 無法呼叫工具

- **WHEN** runbook 說明 `/goal` evaluator 的限制
- **THEN** 文件指出 evaluator 只判讀 transcript、不能呼叫工具，故 worker MUST 每輪把 ground truth（`openspec list`、DoD 指令輸出）印進 transcript

#### Scenario: 舊 runbook 標記繼承關係

- **WHEN** 讀者開啟 `docs/runbook/autonomous-dev-loop.md`
- **THEN** 檔案頂部有 deprecation 標頭指向 `goal-dev-cycle.md`，且原內容保留（不刪除）

### Requirement: harness 兩層框架定義

`goal-dev-cycle.md` SHALL 定義 harness 為兩層，並附「LLM 創造、harness 約束＋驗證」的分工原則，讓讀者理解自主開發框架的邊界與職責。

#### Scenario: 兩層定義

- **WHEN** 讀者查閱 harness 定義
- **THEN** 文件區分**機制核心**（由 Claude Code 提供：`/goal` loop、工具、context 管理、CLAUDE.md 指令層、執行環境＝emulator + CI）與**治理層**（由本專案定義：DoD＝完成條件、人類 gate＝護欄、CI/測試/視覺對圖＝驗證證據）

#### Scenario: 分工原則

- **WHEN** 讀者尋找 LLM 與 harness 的職責分界
- **THEN** 文件明述 LLM 負責創造性工作，harness 負責約束、驗證、並決定是否再跑一輪

### Requirement: 軟/硬 gate 機制與 BLOCKED 訊號

`goal-dev-cycle.md` SHALL 定義軟 gate 與硬 gate 的分流，以及自主循環撞到硬 gate 時的乾淨停止機制。軟 gate 的准入 MUST 以「傷害延遲 > 審查延遲」為判準；並 MUST 包含一份與 change 分類正交的封鎖清單。

#### Scenario: 軟 gate 不停、硬 gate 停

- **WHEN** 循環遇到 owner-gated merge 或視覺對圖（軟 gate）
- **THEN** LLM 開 PR + archive + 繼續下一個 change，不停下等 owner
- **AND** 遇到聖牛 schema / 花錢 / 部署 / Money 規則 / 跨 change ADR（硬 gate）時，寫出結構化 `BLOCKED` 訊號並停止

#### Scenario: 結構化 BLOCKED 訊號

- **WHEN** LLM 寫出 BLOCKED 訊號
- **THEN** 訊號為 typed 記錄，含 gate id、類別、原因、被擋的確切動作與參數、owner 需要決定什麼

#### Scenario: tier-orthogonal 封鎖清單

- **WHEN** 任一 change 中出現洩密 / force-push / 關閉安全機制 / 大量刪除
- **THEN** 不論該 change 屬哪個風險層級，一律硬停（寫 BLOCKED）

#### Scenario: 永不 auto-merge 自己的 soft-gated PR

- **WHEN** LLM 完成一個 owner-gated（軟 gate）PR
- **THEN** 文件明訂 LLM 絕不 auto-merge 該 PR（否則會把軟 gate 變成無 gate、違反傷害延遲判準），merge 交 owner

### Requirement: 種子資料覆蓋 BUY 與 SELL 視覺路徑

emulator 種子腳本（`firebase/scripts/seed-emulator.mjs`）SHALL 同時包含 BUY 與 SELL 交易，使賣出膠囊、已實現損益列、「本月已實現損益」等 SELL 相關畫面在本地視覺驗證中有真實資料可對。SELL 種子 SHALL 滿足持倉推導不變量：同帳戶同標的、賣量 ≤ 先前買量、`transaction_date` 晚於對應 BUY；台股 SELL SHALL 帶非零證交稅（`tax`）。

#### Scenario: reseed 後 SELL 路徑有資料

- **WHEN** 執行 `seed:emulator` 完成後登入測試帳號
- **THEN** 交易清單 SHALL 至少出現一筆賣出（TWD 與 USD 各至少一筆），且已實現損益 SHALL 同時涵蓋正值（綠）與負值（紅）各至少一筆；對應標的的交易歷史 SHALL 顯示已實現損益列；`deriveHoldings` SHALL NOT 拋出 oversell

#### Scenario: 本月已實現恆有值

- **WHEN** 任一月份執行 reseed
- **THEN** 至少一筆 SELL 的 `transaction_date` SHALL 落在執行當月，使持倉頁「本月已實現」顯示非零值

#### Scenario: 自我驗證涵蓋 SELL

- **WHEN** 種子腳本執行完寫入後的自我驗證
- **THEN** SHALL 斷言實際寫入的交易筆數等於種子定義的筆數、每筆 SELL 種子的交易類型確為賣出、且台股 SELL 的證交稅為非零 canonical 10 位小數字串；任一斷言失敗 SHALL 使腳本以非零 exit code 結束

### Requirement: Tag 觸發 iOS 發版

推送形如 `x.y.z-release` 的 tag SHALL 觸發自動發版 workflow；workflow SHALL 驗證 (a) tag 指向的 commit 在 `main` 上、(b) tag 版本等於 `apps/mobile/package.json` 的 `version`，任一不符 SHALL fail-fast 且不觸發 build；驗證通過 SHALL 以 EAS 雲端 build（production profile）並自動 submit TestFlight。

#### Scenario: 版號漂移被擋下

- **WHEN** 打 tag `0.0.5-release` 但 package.json version 仍為 `0.0.4`
- **THEN** workflow SHALL 失敗於版號一致性檢查，SHALL NOT 觸發 EAS build

#### Scenario: 非 main commit 被擋下

- **WHEN** 從未 merge 的分支 commit 打 release tag
- **THEN** workflow SHALL 失敗於 main 祖先檢查，SHALL NOT 觸發 EAS build
