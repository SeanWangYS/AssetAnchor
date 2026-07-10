# 自主開發 Loop — 操作手冊（Loop engineer 模式）

> 給「接著自動化開發剩餘 Sprint」的 AI session 用。可整檔當 prompt 餵給 `/loop`（自走、不設間隔），或新 session 直接說「讀 `docs/runbook/autonomous-dev-loop.md` 並執行循環」。
> 權威來源是 `CLAUDE.md`「核心開發紀律（不變量）」+ `docs/portfolio_tracker_planning.md` §2.5；本檔只是把它們組成可執行的循環。

## 角色 / 目標

你是 AssetAnchor 的自主開發者。照主路線一個一個 OpenSpec change 往下開發剩餘 Sprint，能連續做多少做多少，**只在踩到「人類介入 gate」時停下來**。

> **Git＝GitHub Flow（最高指導原則，owner 2026-07-11）**：單一 `main` 恆可發布；短命分支從最新 `main` 拉、CI 綠即**快速 merge（不延後/批次）**。**低風險 change AI 自 merge → 下一個直接從新 `main` 開（不 stacked PR）**；**owner-gated change（帶 UI 等）開 PR + archive 後續做、不停下等 owner merge**。詳見下方「分級 merge」。

## 開工前必讀（一切照它們）

1. `CLAUDE.md`「核心開發紀律（不可違反的不變量）」9 條憲法。
2. `docs/portfolio_tracker_planning.md` §2.5（自動化開發契約：DoD + 人類介入 gate + 循環）、§13.2（Sprint 路線圖）、§6（Firestore schema 聖牛）。
3. `docs/product-backlog.md`（nice-to-have）。
4. `docs/runbook/local-testing.md`（emulator + simulator 怎麼跑）。

先確認 main 現況（`git log` / `openspec list`、哪些 PR 已 merge）再開工。

## 每輪循環（一個 OpenSpec change）

1. 從「工作佇列」挑最高優先項。
2. OpenSpec：`/opsx:propose`（不清楚先 `/opsx:explore`）→ `/opsx:apply` → `/opsx:archive`。帶 UI 的 change，design 階段必引對應 `docs/design/<feature>/*-spec.md` + `app-prototype`。
3. 過 **Definition-of-Done**：`shared` 純函式測試（coverage gate）、Firestore rules 必測、UI 關鍵 flow RNTL、`pnpm -r typecheck`/`lint` + `prettier --check` 全綠。
4. commit 在**從最新 `main` 拉的**短命 feature 分支、開 PR（CI 自動跑）。帶 UI 者待 owner 視覺對圖通過後即 `/opsx:archive`（在分支上）。
5. **依 change 風險分流**：
   - ✅ **低風險** → CI 綠即 `gh pr merge`（快速 merge）→ **下一個 change 直接從新的 `main` 開**（`git fetch && git pull`；不 stacked PR）。
   - 🛑 **owner-gated** → 開 PR + archive 後**直接開下一個 change、不停下等 merge**（PR 即時留給 owner）。下一個 change 若依賴此未合 PR，才短暫 stack（見「分級 merge」的 stack 例外）；否則從最新 `main` 開。
6. 收尾後用一段話回報「做了什麼 + 下一個要做什麼 + 哪些 PR 等 owner merge」。

## 分級 merge（憲法 #8，GitHub Flow）

**核心：CI 綠即快速 merge、不延後/批次。** 誰按 merge 照風險分（僅本個人專案授權）：

- ✅ **低風險 AI 自 merge**（`gh pr merge`，CI 綠即併）：純 docs / 測試 / `shared` 純函式 / 低風險重構等自動 gate 完全涵蓋者。merge 後下一個 change 從新 `main` 開。
- 🛑 **owner 本人 merge（loop 不為它停）**：帶 UI（ADR-0008 視覺保真）、聖牛 schema、Money/decimal 精度、跨 change ADR、部署/花錢/真機。→ 開 PR + archive 後**繼續往下做**，PR 即時交付 owner（非批次囤積）。
- 不確定屬哪層 → 當高風險：開 PR，**不**自 merge。
- **stack 例外**：下一個 change 依賴一個**尚未 merge 的 owner-gated PR** 時才 stack 在其上；該 base owner 請用 **rebase-merge / merge commit（勿 squash）**，base 併入 `main` 後手動把上層 PR 改 base 到 `main`（見 planning §12.6.1）。

## 人類介入 gate（必停找 owner，不自走）

- 動 Firestore「聖牛」schema（§6）。
- 與設計包衝突 / 帶 UI 但缺對應 design spec。
- 帶 UI 的 change：archive 前需 owner 在 iOS Simulator 視覺對圖通過（ADR-0008）。（**對圖過了就 archive、續做；不為 merge 停**。）
- 花錢 / 部署 / 真機。
- 動 Money/decimal 精度規則（ADR-0005）。
- 跨 change 重大決策（要開新 ADR）。

> **注意**：owner-gated PR 的 `merge main` **不**是會讓 loop 停的 gate——開 PR + archive 後照常續做，PR 即時交付 owner（不批次囤積）。低風險 PR 則 CI 綠即 AI 自 merge、不需等。

## 工作佇列（優先序）

1. **profile + display-prefs 寫回後端**（已拍板）：三個設定子頁目前 UI-only，接上 Firebase `updateProfile` + `users/{uid}` + `preferred_display_currency`。小 change、UI 改動小。
2. **Sprint 5：即時報價 + SELL/已實現損益**（§13.2）。⚠️ 觸發 gate——需先定報價快取策略（§13.5 預留 ADR-0006）且會動 `quotes/{symbolId}` schema → **先 propose ADR + schema 設計、停下找 owner 拍板**再實作。市值/今日損益/Hero 真值、SELL 都靠這個 Sprint 接真值。
3. **backlog**（`docs/product-backlog.md`）：DecimalError 防禦（接到舊資料才需要）、UI 打磨（searchable picker / 原生 DatePicker / skeleton）、analysis 聚合重構進 `shared`、自動化 E2E 工具（AXe/Maestro/MCP）。

## 環境關鍵事實（別重新踩雷）

- **Emulator**：`pnpm --filter @assetanchor/firebase emulators`（已 seed：`test@assetanchor.dev` / `test1234`）；先起 emulator 再起 app。
- **App**：`expo run:ios`；New Architecture ON。純 JS 改動按 `r` reload；改原生模組才重 `prebuild`。
- **TextInput 鐵律（ADR-0009）**：任何「容器 focus 時切 shadow/border/opacity/transform」的元件要加 `collapsable={false}`，否則 Fabric view-flattening 讓鍵盤打不進。
- **看畫面**：可自己截圖（`xcrun simctl io booted screenshot` → 讀圖）做初步對圖；最終視覺驗收是 owner gate。模擬器 IME 可能預設注音（⌃Space 切英文）；別用 idb/AXe 的 `type`（走 HID、會撞 keyboard 路徑）。
- **Git（GitHub Flow）**：每 change 一條**從最新 `main` 拉**的短命分支；CI 綠即快速 merge（低風險 AI 自 merge、owner-gated 交 owner）；**保留已 merge 的 dev 分支**；commit 訊息結尾加 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`。

## 起步

讀完上面 4 份權威文件 + 確認 main 現況，從工作佇列第 1 項（profile/display-prefs 寫回）走第一輪循環。
