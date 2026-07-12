## Context

CLAUDE.md 每 session 全量載入，已 120 行且概念散落重複（設計包權威、Money、GitHub Flow 各講兩處以上），而「通過開發的標準（DoD）」無單一權威定義。同時專案缺 top-view 架構圖、本地環境速查、以及以 Claude 原生 `/goal` 驅動的自主開發循環定義。本 change 純文件化，不動 code / UI / schema / Money，屬 CLAUDE.md §8 分級的低風險層級。

harness 框架的做法在定案前，經三路 web research 查證業界最佳實務（LangChain「Agent = Model + Harness」、Anthropic effective-harnesses、Claude Code `/goal` 官方文件、OWASP AI Agent Security、verification-driven development），並據此硬化設計，非閉門造車。

## Goals / Non-Goals

**Goals:**

- 讓未來的 LLM 或人類工程師「單看 CLAUDE.md + 兩份新檔」就能掌握開發方法、架構全貌、與「什麼算完成」。
- 建立**單一、可機器驗證**的 DoD，讓 `/goal` evaluator 能自我判定 change 完成。
- 以正確的 harness 框架（機制核心 + 治理層 + 軟/硬 gate）定義自主開發循環，把 planning §2.5 契約可執行化。
- 去重但語意保真——不改任何既有規則的約束力。

**Non-Goals:**

- 不改任何產品功能 / UI / Firestore schema / Money 規則。
- 不引入自動化執行機制（不寫 Stop-hook 腳本、不改 CI、不建 `/goal` 觸發設定）——只產出文件與定義。
- 不刪除既有文件（`autonomous-dev-loop.md` 保留 + 標 deprecation）。
- 不重啟已拍板決策（planning §2–§8、ADR-0005/0007/0008、GitHub Flow §8）。

## Decisions

### D1：CLAUDE.md 中度重構（非輕度、非重度）

收斂成「憲法 + DoD + 索引」骨架，重複長篇壓成指標式引用，權威細節留在既有 ADR / planning。

- **為何不輕度**：輕度只補 DoD、不去重，CLAUDE.md 會更長、重複仍在。
- **為何不重度**：重度把大量敘述搬進 doc/ 專檔，LLM 單看 CLAUDE.md 掌握度下降、且每次要跳檔。
- 中度在「token 精簡」與「self-contained 權威性」間取平衡，且風險最低（純重組）。

### D2：DoD ＝單一清單 + 條件式加項（非分級 DoD、非僅指向 ADR）

一個普適核心清單 + 依 UI/schema/Money 觸發的條件式加項；每項對應可機器驗證指令。

- **為何不分級 DoD**：分級（docs/shared/UI/schema 各一套）與現有「分級 merge 授權」概念重疊、但更複雜、行數多。
- **為何不僅指向 ADR**：DoD 權威會續散、`/goal` 無單一可判定依據。
- 單一清單最利 LLM 自我判定，條件式加項自然對應現有人類 gate。

### D3：架構圖＝拓樸圖 + 1 張報價流程 sequence（非單圖、非多流程圖）

- 單靜態拓樸圖看不出 runtime 時序；多流程圖（報價/交易/匯率）篇幅過長。
- 報價流程是最非直覺、最常出 bug 的 path（見 memory：台股 ETF market=US → Yahoo 404 永遠載入中），故優先畫它一張。
- 放 `docs/architecture.md` 而非 inline CLAUDE.md：圖體積大（60–80 行），依 D1 精簡原則放專檔 + CLAUDE.md 摘要指向。

### D4：`/goal`（條件驅動）取代 `/loop`（時間間隔）為自主開發主驅動

- `/goal` 設定完成條件、每輪由快速 evaluator 判定是否達成，比 `/loop` 固定間隔更貼合「做到 DoD 才停」。
- `/goal` 官方文件把「佇列 drain 到空」列為 canonical 用法，正好對應「跑完整 sprint / 佇列」範圍。
- 舊 `autonomous-dev-loop.md` 保留 + 標 deprecation（對齊「保留歷史」偏好），新 `goal-dev-cycle.md` 繼承其佇列 / 分級 merge / gate 內容並改用 `/goal`。

### D5：harness 兩層定義（機制核心 + 治理層）— 經業界查證修正

初版四部件（佇列/DoD/gate/驗證）經研究發現只涵蓋「治理層」；業界定義 harness 先講機制核心（loop + 工具 + context 管理 + 執行環境）。

- 修正為兩層：**機制核心**（Claude Code 提供）+ **治理層**（專案定義），並保留業界公認的「Agent = Model + Harness / LLM 創造、harness 約束驗證」分工原則。
- 「工作佇列」重定位為輸入面（對應 Anthropic feature-list JSON），非一級 harness 部件。

### D6：完成條件的三道防呆（因應 evaluator 限制與 reward hacking）

`/goal` evaluator 不能呼叫工具、只判讀 transcript，且文獻實測 reward hacking 達 28.57%。故完成條件範本 MUST 含：

1. **transcript-echo**：每輪實跑 `openspec list` / DoD 指令並把輸出印進 transcript 為證。
2. **anti-hack 條款**：不得修改 / 刪除測試、DoD 指令、佇列檔來滿足條件。
3. **回合上限**：連續 N 次無法推進或 20 turn 未達 → 寫 BLOCKED 收手（官方防無限迴圈做法）。

### D7：軟/硬 gate ＋ 業界硬化

軟/硬 gate ＝ 業界 async(deferred) vs sync(blocking) 監督。經研究補三塊：

- **soft 准入判準**＝「傷害延遲 > 審查延遲」（PR 在 merge 前惰性，故合法）。
- **tier-orthogonal 封鎖清單**（洩密 / force-push / 關安全機制 / 大量刪除，不論 change 層級一律硬停）——取自 Claude Code auto-mode danger-zone blocklist。
- **結構化 BLOCKED 訊號**（typed：gate id / 類別 / 原因 / 動作+參數 / owner 要決定什麼）＋ 循環 circuit breaker。
- 紅線：**永不 auto-merge 自己的 soft-gated PR**（否則軟 gate → 無 gate），與現有分級 merge 一致。

## Risks / Trade-offs

- **[去重誤刪某條約束的語意]** → tasks 內設「重構前後憲法/gate 語意逐條對照」步驟；語意保真列入 DoD 驗收。
- **[架構圖隨 code 演進而過時]** → 圖以 subgraph/模組層級（非檔案級）繪製，降低漂移頻率；於 `architecture.md` 標明「權威仍為 code，本圖為 top-view 導覽」。
- **[`/goal` 完成條件被 reward-hack]** → D6 三道防呆；並於文件標註「evaluator 可被話術繞過，必要時改用 deterministic Stop-hook 腳本」為未來強化選項（本 change 不實作）。
- **[新舊 runbook 並存造成混淆]** → 舊檔頂部 deprecation 標頭明確指向新檔；`autonomous-dev-loop.md` 的權威內容以「已遷移至 goal-dev-cycle.md」一句帶過。
- **[純文件 change 仍可能誤觸 UI/schema 敘述]** → Non-goals 明列不動 code/schema；驗收只跑 docs 相關檢查（prettier / markdown lint），不需 emulator / simulator。

## Migration Plan

1. 先寫兩份新檔（`architecture.md`、`goal-dev-cycle.md`），內容自足可獨立審閱。
2. 再重構 CLAUDE.md（憲法去重 + DoD 區塊 + 架構摘要指向 + port 速查 + goal-cycle 摘要指向）。
3. 舊 `autonomous-dev-loop.md` 加 deprecation 標頭；`local-testing.md` port 敘述對齊速查表。
4. 驗收：憲法/gate 語意逐條對照無漂移、`prettier --check .` 綠、所有 mermaid 區塊語法可解析、DoD 與 goal-cycle 交叉引用一致。
5. Rollback：純文件、無 code 影響，`git revert` 單一 commit 即可完全回復。

## Open Questions

- 無阻斷性未決項。`/goal` 完成條件的 `N`（連續無法推進次數）與 turn 上限建議值於 `goal-dev-cycle.md` 給預設（如 N=2、20 turn），實際跑時可按 sprint 大小調整，屬使用參數非本 change 決策。
