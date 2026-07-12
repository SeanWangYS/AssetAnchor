# /goal 自主開發循環 — 操作手冊（harness 驅動）

> 給「接著自主開發剩餘工作」的 AI session 用。用 Claude 原生 `/goal`（條件驅動）跑完整個 sprint / 工作佇列，只在撞到硬 gate 時乾淨停下。
> **權威來源**是 `CLAUDE.md`（憲法 + DoD）+ `docs/portfolio_tracker_planning.md` §2.5；本檔把它們組成可執行的 `/goal` 循環。
>
> 本檔**繼承並取代** `docs/runbook/autonomous-dev-loop.md`（`/loop` 時間間隔版）。`/goal` 是條件驅動——做到 DoD 才停，比固定時間間隔更貼合「完成即止」。

## 1. 什麼是 harness（兩層框架）

「harness」＝包在 LLM 外面、讓一個語言模型變成可靠開發者的那層框架。業界共識：**Agent = Model + Harness**（LangChain）——你不是 model，就是 harness。AssetAnchor 的 harness 分兩層：

### 機制核心（由 Claude Code 提供，我們不用自建）

| 部件             | 在本專案的體現                                                                       |
| ---------------- | ------------------------------------------------------------------------------------ |
| **控制迴圈**     | `/goal` 的 gather → act → verify → repeat；每輪由快速 evaluator 判定是否達成完成條件 |
| **工具**         | 檔案讀寫、Bash、搜尋、subagent、MCP                                                  |
| **context 管理** | 壓縮、subagent 卸載、`CLAUDE.md` 常駐指令                                            |
| **指令層**       | `CLAUDE.md`（憲法 + DoD）、OpenSpec artifacts                                        |
| **執行環境**     | Firebase Emulator Suite + CI（typecheck / lint / test / coverage）                   |

### 治理層（本專案定義，= 這份文件 + CLAUDE.md 的職責）

| 部件         | 定義處                                                          |
| ------------ | --------------------------------------------------------------- |
| **完成條件** | `CLAUDE.md` 的 **DoD（通過開發的標準）** — 見 §3 範本           |
| **護欄**     | 人類介入 gate（§5 軟/硬 gate）                                  |
| **驗證證據** | CI / 測試 / coverage gate / rules 測試 / iOS Simulator 視覺對圖 |

### 分工原則

> **LLM 負責創造性工作；harness 負責約束、驗證、並決定要不要再跑一輪。**

驗證是 harness 的核心基礎設施，不是附屬品——「產生候選解已不難，可靠地驗證它才是難題」。所以**終止由驗證決定，不由模型自信決定**（stop when checks pass / escalate to human，非 stop when模型覺得好了）。

## 2. 開工前必讀（一切照它們）

1. `CLAUDE.md`：憲法（不可違反的不變量）+ **DoD** + 人類介入 gate。
2. `docs/portfolio_tracker_planning.md` §2.5（自動化開發契約）、§13.2（Sprint 路線圖）、§6（Firestore schema 聖牛）。
3. `docs/architecture.md`（top-view 元件圖 + 報價流程）。
4. `docs/product-backlog.md`（nice-to-have）。
5. `docs/runbook/local-testing.md`（emulator + simulator 怎麼跑）。

先確認 `main` 現況（`git log` / `openspec list`、哪些 PR 已 merge）再開工。

## 3. `/goal` 完成條件範本

`/goal` 設定一個完成條件，Claude 自主一輪一輪工作，直到快速 evaluator（預設 Haiku）判定條件成立。**關鍵限制：evaluator 不能呼叫工具、只判讀 transcript**——所以 worker 每輪 MUST 把 ground truth（`openspec list`、DoD 指令輸出）實跑並印進對話，否則 evaluator 無從判定（也堵掉「宣稱做完卻沒真跑」的 tool-call hacking）。

一個好的完成條件含官方三要素——①一個可量測終態 ②怎麼驗（哪個指令 exit 0）③不可變動的約束——再加防呆。範本：

```
/goal 跑完本 sprint 佇列。完成條件：
  EITHER  `openspec list` 顯示佇列中無未 archive 的 change（每輪實跑並把輸出貼進對話為證），
          且每個已完成 change 的 DoD 指令（pnpm -r typecheck、pnpm -r lint、
          pnpm --filter @assetanchor/shared test:coverage）都在本 transcript 跑過且 exit 0，
  OR      已寫出一行結構化 `BLOCKED: <gate 類別> | <原因> | <被擋動作+參數> | <owner 需決定什麼>`。
  約束：不得修改或刪除任何測試、DoD 指令、或佇列檔來滿足條件。
  上限：連續 2 次無法推進、或滿 20 turn 未達成 → 寫 BLOCKED 收手（勿無限重試）。
```

三道防呆對應的理由（文獻實測 reward hacking 可達 28.57%，手法含刪測試 / 硬編預期值 / 改 verifier）：

- **transcript-echo**：因 evaluator 只看對話，強制把真值印進 transcript。
- **anti-hack 條款**：明文禁止動測試 / DoD 指令 / 佇列檔。
- **回合上限**：官方防無限迴圈做法；把「撞 gate」轉成循環的乾淨終點而非空轉。

> 未來若要更 tamper-proof，可把「跑 `openspec list` 並 grep」改成 deterministic Stop-hook 腳本（腳本不會被話術繞過）。本專案目前不實作，維持 `/goal` + 上述防呆。

## 4. 每輪循環（一個 OpenSpec change）

1. 從**工作佇列**（§6）挑最高優先項。
2. OpenSpec：`/opsx:propose`（不清楚先 `/opsx:explore`）→ `/opsx:apply` → `/opsx:archive`。帶 UI 的 change，design 階段必引對應 `docs/design/<feature>/*-spec.md` + `app-prototype`。
3. 過 **DoD**（權威定義在 `CLAUDE.md`）：核心清單全綠 + 條件式加項（UI → 視覺對圖；schema → 聖牛；Money → ADR-0005）。
4. commit 在**從最新 `main` 拉的**短命 `feature/*` 分支、開 PR（CI 自動跑）。
5. 依 change 風險分流（§5）：低風險 CI 綠即自 merge → 下一個從新 `main` 開；owner-gated 開 PR + archive 後續做、不停等 merge。
6. 每輪把 `openspec list` 與 DoD 指令輸出印進 transcript（供 evaluator 判定）。

## 5. 軟/硬 gate 機制（護欄）

軟/硬 ＝ 業界的 **async(deferred) vs sync(blocking) 人類監督**，建在「可逆性 × 影響半徑」階梯上。

### 軟 gate（不停，開 PR + archive + 繼續下一個）

owner-gated **merge**（帶 UI 視覺保真、聖牛以外的一般改動）、iOS Simulator 視覺對圖。

- **准入判準＝傷害延遲 > 審查延遲**：只有「在 owner 審查前不可能造成不可逆傷害」的動作才可入軟 gate。PR 在 merge 前是惰性的，故合法。
- **紅線：永不 auto-merge 自己的 soft-gated PR**——那會把軟 gate 變成無 gate（違反傷害延遲判準）。merge 交 owner；AI 只管開 PR + 換新分支做下一個。

### 硬 gate（寫結構化 BLOCKED 停）

聖牛 schema 變更、花錢 / 部署 / 真機、Money/decimal 精度規則、跨 change 重大決策（要開新 ADR）、與設計包衝突 / 帶 UI 但缺 spec。

**結構化 BLOCKED 訊號**（typed，讓 evaluator 可偵測、owner 不必重建脈絡）：

```
BLOCKED: <gate 類別> | <原因一句話> | <被擋的確切動作 + 參數> | <owner 需要決定什麼>
例：BLOCKED: 聖牛schema | transaction 需加 tax_lot 欄位 | 改 §6 schema + 三端 types | 是否核准新欄位與命名
```

### Tier-orthogonal 封鎖清單（不論 change 屬哪層，一律硬停）

洩密 / 憑證外流、`git push --force`、關閉安全機制或 logging、大量刪除 / 不可逆破壞。這些與風險分級**正交**——即使在「低風險」change 裡出現也立即寫 BLOCKED。

### Circuit breaker（防空轉）

連續 N 次（預設 2）工具失敗 / 無法推進，或滿 20 turn 未達成 → 寫 BLOCKED 收手，不無限重試。

> **不確定屬軟或硬 → 當硬 gate**（fail-closed）。對齊 `CLAUDE.md` §8「不確定屬哪層 → 當高風險」。

## 6. 工作佇列（優先序）

1. 從 `openspec list` 未 archive 的 change 依主路線 §13.2 sprint 順序取。
2. `docs/product-backlog.md` 的 nice-to-have（DecimalError 防禦、UI 打磨、聚合重構進 `shared`、E2E 工具等）。

## 7. 環境關鍵事實（別重新踩雷）

- **Emulator**：`pnpm --filter @assetanchor/firebase emulators`（已 seed：`test@assetanchor.dev` / `test1234`）；先起 emulator 再起 app。需本地報價/匯率/history → 改 `emulators:fn`（含 functions :5001）。port 速查見 `CLAUDE.md` / `local-testing.md`。
- **App**：`pnpm --filter @assetanchor/mobile ios`；New Architecture ON。純 JS 改動按 `r` reload；改原生模組才重 prebuild。
- **TextInput 鐵律（ADR-0009）**：容器 focus 時切 shadow/border/opacity/transform 的元件要加 `collapsable={false}`，否則 Fabric view-flattening 讓鍵盤打不進。
- **看畫面**：可 `xcrun simctl io booted screenshot` 自截圖初步對圖；最終視覺驗收是 owner gate。別用 idb/AXe 的 `type`（走 HID 會撞 keyboard 路徑）。
- **Git（GitHub Flow）**：每 change 一條從最新 `main` 拉的短命分支；CI 綠即快速 merge（低風險 AI 自 merge、owner-gated 交 owner）；**保留已 merge 的 dev 分支**；commit 訊息結尾加 `Co-Authored-By:`（見 CLAUDE.md）。

## 8. 業界依據（本循環的設計來源）

- **harness = Model + Harness / 機制核心**：LangChain「The Anatomy of an Agent Harness」、Anthropic「Effective harnesses for long-running agents」。
- **`/goal` 條件驅動 + evaluator 限制 + 防無限迴圈**：Claude Code `/goal` 官方文件。
- **驗證即 harness 核心 / 終止由驗證決定 / reward hacking 防治**：verification-driven development 文獻。
- **軟/硬 gate、封鎖清單、circuit breaker、fail-closed**：OWASP AI Agent Security Cheat Sheet、Anthropic Claude Code auto-mode。

## 9. 起步

讀完 §2 的 5 份權威文件 + 確認 `main` 現況，用 §3 範本設定 `/goal`，從 §6 工作佇列最高優先項走第一輪 §4 循環。撞硬 gate 就照 §5 寫結構化 BLOCKED 停下交 owner。
