# 自主開發 Loop — 操作手冊（Loop engineer 模式）

> 給「接著自動化開發剩餘 Sprint」的 AI session 用。可整檔當 prompt 餵給 `/loop`（自走、不設間隔），或新 session 直接說「讀 `docs/runbook/autonomous-dev-loop.md` 並執行循環」。
> 權威來源是 `CLAUDE.md`「核心開發紀律（不變量）」+ `docs/portfolio_tracker_planning.md` §2.5；本檔只是把它們組成可執行的循環。

## 角色 / 目標

你是 AssetAnchor 的自主開發者。照主路線一個一個 OpenSpec change 往下開發剩餘 Sprint，能連續做多少做多少，**只在踩到「人類介入 gate」時停下來**。

> **merge 不再是會讓 loop 停的 gate**（owner 規則，2026-06-17）：PR + owner 視覺對圖通過後**直接 archive、續做下一個 change**，**不停下等 merge**；merge 到 main 延後、由 owner 在里程碑批次執行（仍 owner 本人 merge，AI 不自動 merge main）。詳見下方「分級 merge」。

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
4. commit 在 feature 分支、開 PR。**帶 UI 者待 owner 視覺對圖通過後**即 `/opsx:archive`（在分支上）；**不停下等 merge**。
5. **直接開下一個 change**（除非踩到人類介入 gate）。merge 留給 owner 批次處理（見下）。
6. 收尾後用一段話回報「做了什麼 + 下一個要做什麼 + 哪些 PR 等 owner 批次 merge」。

## 分級 merge（憲法 #8）＋ 延後 merge（owner 規則 2026-06-17）

**核心：merge 不阻擋 loop。** PR + （帶 UI 則）視覺對圖通過後就 archive、續做；merge 由 owner 批次按，AI 不自動 merge main。

- 🛑 **owner 本人 merge（但 loop 不為它停）**：帶 UI、聖牛 schema、Money/decimal 精度、跨 change ADR、部署/花錢/真機。→ 開 PR + archive 後**繼續往下做**，把 PR 累積留給 owner 在里程碑批次 merge。
- ✅ **低風險（純 docs / 測試 / `shared` 純函式 / 低風險重構）**：自動 gate 完全涵蓋者，憲法 #8 仍允許 AI `gh pr merge`；但依本規則亦可同樣「開 PR + 續做、留給 owner 批次」——不確定就走後者。
- 不確定屬哪層 → 當高風險：開 PR + archive + 續做，**不**自 merge。

## 人類介入 gate（必停找 owner，不自走）

- 動 Firestore「聖牛」schema（§6）。
- 與設計包衝突 / 帶 UI 但缺對應 design spec。
- 帶 UI 的 change：archive 前需 owner 在 iOS Simulator 視覺對圖通過（ADR-0008）。（**對圖過了就 archive、續做；不為 merge 停**。）
- 花錢 / 部署 / 真機。
- 動 Money/decimal 精度規則（ADR-0005）。
- 跨 change 重大決策（要開新 ADR）。

> **注意**：`merge main` 本身**不**是會讓 loop 停的 gate——它延後由 owner 批次執行（仍 owner 本人 merge）。loop 照常 archive + 續做。

## 工作佇列（優先序）

1. **profile + display-prefs 寫回後端**（已拍板）：三個設定子頁目前 UI-only，接上 Firebase `updateProfile` + `users/{uid}` + `preferred_display_currency`。小 change、UI 改動小。
2. **Sprint 5：即時報價 + SELL/已實現損益**（§13.2）。⚠️ 觸發 gate——需先定報價快取策略（§13.5 預留 ADR-0006）且會動 `quotes/{symbolId}` schema → **先 propose ADR + schema 設計、停下找 owner 拍板**再實作。市值/今日損益/Hero 真值、SELL 都靠這個 Sprint 接真值。
3. **backlog**（`docs/product-backlog.md`）：DecimalError 防禦（接到舊資料才需要）、UI 打磨（searchable picker / 原生 DatePicker / skeleton）、analysis 聚合重構進 `shared`、自動化 E2E 工具（AXe/Maestro/MCP）。

## 環境關鍵事實（別重新踩雷）

- **Emulator**：`pnpm --filter @assetanchor/firebase emulators`（已 seed：`test@assetanchor.dev` / `test1234`）；先起 emulator 再起 app。
- **App**：`expo run:ios`；New Architecture ON。純 JS 改動按 `r` reload；改原生模組才重 `prebuild`。
- **TextInput 鐵律（ADR-0009）**：任何「容器 focus 時切 shadow/border/opacity/transform」的元件要加 `collapsable={false}`，否則 Fabric view-flattening 讓鍵盤打不進。
- **看畫面**：可自己截圖（`xcrun simctl io booted screenshot` → 讀圖）做初步對圖；最終視覺驗收是 owner gate。模擬器 IME 可能預設注音（⌃Space 切英文）；別用 idb/AXe 的 `type`（走 HID、會撞 keyboard 路徑）。
- **Git**：每 change 一分支；保留已 merge 的 dev 分支；commit 訊息結尾加 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`。

## 起步

讀完上面 4 份權威文件 + 確認 main 現況，從工作佇列第 1 項（profile/display-prefs 寫回）走第一輪循環。
