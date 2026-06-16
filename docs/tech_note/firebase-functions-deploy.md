# Firebase Functions 部署（monorepo）— 技術筆記

> **建立**：2026-06-16（內容自 Sprint 4 runbook 救援）
> **情境**：AssetAnchor Sprint 4 — 部署第一個 Cloud Function（`scheduledUsdRate` + `seedUsdRate` @ asia-east1）。在 pnpm monorepo 裡 `firebase deploy --only functions` 踩了兩個雷，這裡記下根因與修法。
> **來源**：Sprint 4 部署實戰（已上線、`exchange_rates/2026-06-12` 寫入驗證通過）。

---

## TL;DR

monorepo 部署 Cloud Functions 有兩個會卡死部署的雷：

1. **`firebase.json` / `.firebaserc` 必須在 repo 根目錄**——因為 `functions.source` 指向的 functions 專案目錄必須在 firebase 設定檔所在專案的**內部**。設定檔擺錯位置，部署找不到 functions。
2. **functions 不能在雲端 npm install 階段消費 `workspace:*` 依賴**——Firebase 雲端 build 跑的是標準 `npm install`，**看不懂** pnpm 的 `workspace:*` 協定。解法是把 `@assetanchor/shared` 從 functions 的 `package.json` 移除，改用 **tsconfig paths + tsup/esbuild alias** 在 build 期把 shared **bundle 進** `lib/index.js`。

---

## 1. 雷一：`firebase.json` / `.firebaserc` 位置

**症狀**：部署時 Firebase 找不到 / 無法解析 functions source。

**根因**：`firebase.json` 的 `functions.source` 欄位指向的目錄，必須位於 firebase 設定檔所在的**專案目錄之內**。若把 `firebase.json` / `.firebaserc` 留在某個子資料夾（例如 `firebase/`），而 functions 在 `apps/functions/`，相對路徑會跨出去、解析失敗。

**修法**：把 `firebase.json` 與 `.firebaserc` 移到 **repo 根目錄**，`functions.source` 用根目錄為基準指向 functions 專案（如 `apps/functions`）。Sprint 4 已 commit 這個搬移。

> 注意：這份 firebase 設定也同時管 Firestore rules/indexes 與 emulator；搬到根目錄後其他相對路徑（rules、indexes）也要一起對齊到以根目錄為基準。

---

## 2. 雷二：functions 不能消費 `workspace:*`（雲端 npm install）

**症狀**：本機 emulator 跑得起來，但雲端 `firebase deploy --only functions` 在依賴安裝階段失敗 / 部署後 runtime 找不到 `@assetanchor/shared`。

**根因**：

- Firebase 雲端 build 用的是 **標準 npm**，不認得 pnpm 的 `workspace:*` 協定 → npm install 直接失敗。
- 就算硬塞，`@assetanchor/shared` 是**以 source 形式被消費**（`main` 指向 `src/index.ts`），雲端也沒有 monorepo 的 symlink 可以解析。

**修法**（Sprint 4 採用）：

1. 從 `apps/functions/package.json` **移除** `@assetanchor/shared`（不讓雲端 npm install 看到 `workspace:*`）。
2. 用 **tsconfig paths** 讓型別 / 開發期能解析 `@assetanchor/shared`。
3. 用 **tsup（esbuild）alias** 在 build 期把 shared 的程式碼**整包 bundle 進** `lib/index.js`。

這樣部署上去的 `lib/index.js` 已是自帶 shared 程式碼的單一 bundle，雲端 runtime 不需要再 require 任何 workspace 套件，也順帶解掉「runtime 直接 require `.ts`」的問題。

```jsonc
// apps/functions/package.json — 不要列 @assetanchor/shared（workspace:* 雲端不支援）
// 改由 tsup 把 shared bundle 進 lib/，tsconfig paths 供型別解析
```

---

## 3. 部署一次性前置（環境）

- functions 用到外部 / 排程能力 → Firebase 專案要升 **Blaze**（含 budget alert，本專案設 ~25 TWD）。
- 部署指令：`firebase deploy --only functions`（Sprint 4：asia-east1, nodejs22）。
- 排程函式（`onSchedule`）部署後由 Cloud Scheduler 自動跑；emulator 無 pubsub emulator，本機不會自動觸發排程，要驗證邏輯改用共用的 HTTP / 手動觸發函式。

---

## 4. 速查表

- `firebase.json` + `.firebaserc` → **repo 根目錄**；`functions.source` 指向的目錄要在專案內。
- functions `package.json` **不要** `workspace:*` 依賴——雲端 npm install 不支援。
- shared 程式碼用 **tsup/esbuild bundle 進 `lib/`**；型別解析靠 **tsconfig paths**。
- 排程函式在 emulator 不會自動觸發；用共用 HTTP 函式 / 手動觸發驗邏輯。
- 對外能力 → 先升 **Blaze + budget alert**。

---

## 參考

- 根目錄 `firebase.json` / `.firebaserc`
- `apps/functions/`（`package.json`、tsup 設定、tsconfig paths）
- ADR：`docs/adr/0005-single-currency-events-display-fx.md`（Sprint 4 的 FX / Cloud Function 脈絡）
- 歷史紀錄：`docs/retros/sprint-4.md`
