# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **權威來源指向**：主計劃書（ADR-000）`docs/portfolio_tracker_planning.md`（第 2–8 章決策已拍板，修改前須評估影響）· 完整 tech stack / 開發慣例 / 測試紀律見 `openspec/config.yaml` 的 `context` · **架構 top-view 見 [`docs/architecture.md`](docs/architecture.md)** · **自主開發循環見 [`docs/runbook/goal-dev-cycle.md`](docs/runbook/goal-dev-cycle.md)**。

## 核心開發紀律（不可違反的不變量）

> 專案「憲法」——每次開發都必須遵守。每條只列不變量 + 權威來源；違反任一條前停下找 owner。

1. **設計包＝產品最高權威**（ADR-0008）：`docs/design/`（以 `app-prototype/` 為準）是**功能 / UI / 資料需求**的最終對齊依據，凌駕 planning / ADR / code / Firestore schema；衝突時設計贏、後端為設計而調整。兩護欄：(A) 金額精度仍歸第 2 條；(B) schema 變更走第 3 條聖牛。操作細節見 §設計驅動工作流。
2. **Money/decimal 紀律**（ADR-0005）：金錢 / 數量 / 匯率 / 成本一律用 `packages/shared` 的 `Money`（包 decimal.js），**禁用 native number**。Firestore 存 `toDecimalString()`＝固定 10 位小數 string（canonical），讀回 `fromDecimalString(s, currency)`，顯示才 `toDisplayString(n)`。異幣別丟 `CurrencyMismatchError`、NaN/Infinity 丟 `InvalidMoneyValueError`；`toNumber()` 是丟精度逃生門、只給 UI/charting。
3. **Schema 變更紀律（聖牛）**：schema 可為設計而改，但**改前逐欄評估三端（mobile/functions/shared）影響**，且**屬人類介入 gate——先找 owner**（planning §2.5、§6 為單一事實來源）。設計決定「要什麼資料」，schema 改動「怎麼改」仍受紀律與 gate 約束。
4. **依賴方向**：`features/* → core | services | packages/shared`；feature 之間不互 import。
5. **Firebase**：一律 `@react-native-firebase` v24 modular API（`getAuth`/`getFirestore`/`connectXxxEmulator`；禁 namespaced）。
6. **OpenSpec 工作流**：每個 change 走 explore→propose→apply→archive；**帶 UI 的 change 必引對應 `docs/design/<feature>/*-spec.md` + 通過 iOS Simulator 視覺對圖**。
7. **測試紀律**（ADR-0007）：測試金字塔寫進每個 change 的 DoD（見 §通過開發的標準）——shared 純函式 coverage gate、rules 必測、UI 關鍵 flow RNTL。
8. **Git ＝ GitHub Flow**（最高指導原則，owner 2026-07-11 拍板；權威細節 planning §12.6）：單一 `main`（**永遠可發布、CI 恆綠**）；一切工作開**短命** `feature/*`·`fix/*` 分支、**從剛 pull 的最新 `main` 拉**；**絕不直接 push `main`**、一律 PR；CI 綠**即快速 merge，不延後/批次**。
   - **誰 merge 照分級授權**（僅限本個人專案，對齊 global CLAUDE.md「分級 merge 例外」；**AI 永不 merge/push `main` 的高風險類別**）：
     - ✅ **低風險 AI 自 merge**：純 docs / 測試 / `shared` 純函式 / 低風險重構等「自動 gate 完全涵蓋、無設計/schema/Money/UX 判斷」者。
     - 🛑 **owner 本人 merge**：帶 UI（ADR-0008）、聖牛 schema、Money 精度、跨 change ADR、部署/花錢/真機。AI 開 PR + archive 後**續做下一個、不停等 merge**（即時交付、非批次）。
     - 不確定 → **當高風險**：開 PR、不自 merge。
   - **分支基準＝一律最新 `main`**（開工前 `git fetch && git pull`）；**預設不 stacked PR**。唯一 stack 例外：下一個 change 依賴**尚未 merge 的 owner-gated PR** 時才短暫 stack，且該 base PR 用 rebase-merge / merge commit（**勿 squash**）。
   - **merge 後保留分支**（不刪；owner 偏好）。**未完成功能用 feature flag 藏**（保 `main` 可發布）。
   - **iOS 部署**：「merge = 部署」對手機不成立——`main` 恆可發布，實際發布＝**定期從 `main` 切 TestFlight / App Store build**（release tag 標版本）；緊急修用 `hotfix/*` 從 release tag 開、修完併回 `main`。
9. **人類介入 gate**（planning §2.5）：聖牛 schema 變更、設計衝突/缺 spec、花錢·部署·真機、Money 精度規則、跨 change 重大決策——**必停找 owner**；其餘可自走。
10. **英文程式碼註解與 commit**（owner 2026-10-20 拍板）：自此之後新寫或修改的**程式碼註解一律用英文**（含 JSDoc / TODO / 行內註解；UI 字串仍為繁中，不受影響）；**git commit message 一律用英文**（Conventional Commits 格式不變；PR title/body、tag annotation 同理）。既有中文註解不需主動批次改寫，動到該段時順手改成英文即可。

## 通過開發的標準（DoD）

> **單一權威定義**：一個 OpenSpec change 算「完成、可 merge」當且僅當下列成立。這是判斷「做完了沒」的唯一依據——憲法 #7、`goal-dev-cycle.md`、planning §2.5 皆指向此處，勿另立清單。每項都對應一個可機器驗證的指令 / 可觀察狀態（供 `/goal` evaluator 用）。

**核心清單（每個 change 都要）**：

| 判準                  | 驗證方式                                                                   |
| --------------------- | -------------------------------------------------------------------------- |
| typecheck 全綠        | `pnpm -r typecheck` exit 0                                                 |
| lint 全綠             | `pnpm -r lint` exit 0                                                      |
| 格式全綠              | `pnpm exec prettier --check .` exit 0                                      |
| `shared` 覆蓋率達標   | `pnpm --filter @assetanchor/shared test:coverage`（gate ≥ 90%）exit 0      |
| 變動的純函式有測試    | 新增/改的 `shared`/`functions` 純函式走 TDD、有對應測試                    |
| 動到 rules 就測 rules | 改 `firestore.rules` → `pnpm --filter @assetanchor/firebase test:rules` 綠 |
| OpenSpec 收尾         | change 已 `/opsx:archive`、spec 已 sync                                    |

**條件式加項（依 change 觸及面向才觸發）**：

- **帶 UI** → iOS Simulator 逐畫面**視覺對圖**（owner gate，ADR-0008）+ 引用對應 `docs/design/<feature>/*-spec.md`。
- **動 Firestore schema** → **聖牛 gate**（逐欄評估三端 + 找 owner，憲法 #3 / planning §6）。
- **動 Money / 匯率 / 成本精度** → 遵 decimal 精度規則（憲法 #2 / ADR-0005）。

## 架構速覽

> Top-view 元件圖（前後端 / DB / cache / auth / external / dev）與報價流程 sequence 見 **[`docs/architecture.md`](docs/architecture.md)**。此處只列常用速查。

四個 workspace（`pnpm-workspace.yaml`：`apps/*` + `packages/*` + `firebase`），共用 `tsconfig.base.json`（TS strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`）：

| Workspace                                   | 角色                                                                                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared` (`@assetanchor/shared`)   | 跨端共用純函式：`enums/` `types/` `money/` `schemas/`(zod) 等。**以 source 消費**（`main`→`src/index.ts`），ESM，import 帶 `.js` 副檔名。 |
| `apps/mobile` (`@assetanchor/mobile`)       | Expo SDK 54 / RN 0.81 / React 19 app。                                                                                                    |
| `apps/functions` (`@assetanchor/functions`) | Firebase Cloud Functions（quotes / exchangeRates / symbols / history），tsup bundle 到 `lib/`。                                           |
| `firebase` (`@assetanchor/firebase`)        | `firestore.rules` + `firestore.indexes.json` + rules 測試。                                                                               |

**依賴方向（單向）**：`features/* → core/* | services/* | packages/shared`；feature 之間不互 import。**Firestore 集合與寫入權限**（rules 是聖牛安全模型）：`users/{uid}/**` 僅本人讀寫、且寫入逐欄驗證（只可寫 user doc / accounts / transactions）；`symbols/{symbolId}` 登入者可讀、**只後端 Admin SDK 可寫**；`quotes/{symbolId}`、`exchange_rates/{date}`、`price_history/{docId}` 登入者可讀、**只後端 Admin SDK 可寫**。

**Mobile 結構與導航**：Feature-based：`src/features/<feature>/`（screens + `*Service.ts` Firestore CRUD + `*Store.ts` Zustand + 純函式）、`src/core/`（`navigation/` `theme/` `ui/`）、`src/services/`。React Navigation v7：Root Stack 包 4 個 Bottom Tab（**持倉 / 交易 / 分析 / 設定**，權威導航 ADR-0008）+ SplashGate + Modal group；**帳戶管理是「設定」子頁、非 tab**；新增交易入口＝持倉頁 header ＋、交易頁 FAB-only；auth 狀態決定 `RootNavigator` 顯示 AuthStack 或 MainTabs。表單用受控 input + `shared` zod `safeParse`。UI 字串純繁中（MVP 不做 i18n）。

## 本地開發環境（port 速查）

> **換新 Mac / 首次 clone** 先走 **[`docs/runbook/new-machine-setup.md`](docs/runbook/new-machine-setup.md)**（工具鏈、gitignored secrets、帳號登入、Claude Code 本機設定）。
> 完整步驟（種子資料、冒煙測試、疑難排解）見 **[`docs/runbook/local-testing.md`](docs/runbook/local-testing.md)**。**先起 emulator 再起 app**；種子帳號 `test@assetanchor.dev` / `test1234`。最少 **2 個 terminal**（emulator process + app）。

| Service                 | 指令                                                               | Port     | 何時需要                                                          |
| ----------------------- | ------------------------------------------------------------------ | -------- | ----------------------------------------------------------------- |
| Firebase Auth emulator  | `pnpm --filter @assetanchor/firebase emulators`                    | **9099** | 一律                                                              |
| Firestore emulator      | 同上（同一指令一起起）                                             | **8080** | 一律                                                              |
| Emulator UI             | 同上                                                               | **4000** | 看/改資料                                                         |
| **Functions emulator**  | `pnpm --filter @assetanchor/firebase emulators:fn`（**另一模式**） | **5001** | 需本地報價/匯率/history 時（預設 `emulators` **不含** functions） |
| Metro / Expo dev server | `pnpm --filter @assetanchor/mobile ios`                            | **8081** | 一律                                                              |

App 啟動由 `services/firebase` 的 `wireEmulatorsOnce()` 依 `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true` 接本地 emulator；真機 / EAS build 連正式專案 `assetanchor-832df`（不連 emulator）。

## 常用指令

Monorepo 用 **pnpm@9.12.0 + Node 22**（asdf，非 nvm；`.tool-versions` pin 22）。`pnpm -r <script>` 跑遍所有 workspace。

```bash
pnpm install                       # 安裝（CI 用 --frozen-lockfile）
pnpm -r typecheck                  # 全 workspace tsc --noEmit
pnpm -r lint                       # 全 workspace eslint
pnpm -r test                       # 全 workspace 測試
pnpm format        / format:check  # prettier 寫入 / 檢查（CI 跑 --check .）

# shared（純函式，唯一進 CI test job，coverage gate 90%）
pnpm --filter @assetanchor/shared test:coverage
pnpm --filter @assetanchor/shared test -- money.test.ts          # 單檔
pnpm --filter @assetanchor/shared test -- -t "CurrencyMismatch"  # 單一 test name
# mobile（Expo）
pnpm --filter @assetanchor/mobile test
pnpm --filter @assetanchor/mobile ios      # expo run:ios（需 prebuild 後的 ios/）
# firestore rules（需 Firebase CLI，自動起 emulator 再跑 jest）
pnpm --filter @assetanchor/firebase test:rules
```

CI（`.github/workflows/ci.yml`）三個 job：`lint`（prettier --check + `pnpm -r lint`）、`typecheck`、`test`（**只跑 shared 的 `test:coverage`**——mobile/firebase 測試不在 CI，須本機手動跑）。commit 走 **Conventional Commits**（commitlint 強制、**message 一律英文**，見憲法 #10），scope 限 `mobile / functions / shared / infra / docs / firebase`；husky pre-commit 跑 lint-staged。

## 設計驅動工作流（UI 最高權威，ADR-0008）

憲法 #1 的操作面。設計包（`docs/design/`，整合原型 `docs/design/app-prototype/`）是 UI 一切面向（導航/畫面/視覺/互動）的最高權威，衝突時設計贏、以原型為準。

- **權威導航＝持倉 / 交易 / 分析 / 設定**（底部恰好 4 tab）；帳戶管理為「設定」子頁；新增入口＝持倉頁 header ＋、交易/帳戶用 FAB；含 SplashGate。
- **每個帶 UI 的 change**：design 階段**必須引用**對應 `docs/design/<feature>/*-spec.md`（像素級依據）；完成前**必過逐畫面 iOS Simulator 視覺對圖**。缺對應 spec 的畫面先補 spec 再實作。
- **唯一但書**：金額精度仍歸 `Money`/decimal.js（憲法 #2）——設計稿數字僅顯示層示意、不治理精度。

## Sprint × OpenSpec × /goal 工作流

1. **照計劃書 §13.2 vertical slice 走**：一次一個 sprint，前後端一起做（schema/邏輯 → Firestore CRUD → UI），結尾 iOS Simulator 可 demo。
2. **預設 1 sprint = 1 OpenSpec change**（explore→propose→apply→archive）；範圍太大就拆成多個 cohesive change。
3. **Sprint 1 例外**：收尾走舊 runbook（`docs/retros/sprint-1.md`），OpenSpec change 自 Sprint 2（Accounts）起。
4. **自主開發**：用 Claude 原生 `/goal`（條件驅動）跑完整個 sprint/佇列為主驅動——完成條件範本、harness 兩層框架、軟/硬 gate 與 BLOCKED 訊號見 **[`docs/runbook/goal-dev-cycle.md`](docs/runbook/goal-dev-cycle.md)**（繼承取代舊 `autonomous-dev-loop.md`）。

**文件層級**：`docs/architecture.md`（top-view 架構）、`docs/adr/`（跨 change 重大決策，Context→Decision→Consequences→Alternatives）、`docs/tech_note/`（技術教學）、`docs/runbook/`（含 `goal-dev-cycle.md`、`local-testing.md`）、`docs/retros/`、`docs/superpowers/plans/`。

## 協作偏好（owner 習慣，跨 session 適用）

- **討論用選擇題**：需求釐清、設計取捨用 AskUserQuestion（推薦選項放第一），每個選項寫清楚**優點與風險/成本**，不要丟開放式問題清單。一次推進一個議題。
- **owner 背景**：數據工程師、熟 AWS，但 iOS / RN / Expo / Firebase 經驗薄——解釋這些概念時多用後端/數據工程類比；技術選型要列 trade-off。
- **tech note 門檻**：可複習的通用技術教學才寫進 `docs/tech_note/`（自包含、TL;DR、類比、cheat-sheet、標版本）；專案特定一次性的坑留在 commit/runbook。不確定值不值得 → 先問再寫。
- **`/loop`、`/goal` ＝整批自走**：一口氣做完所有可自走的 change（可平行 sub-agent，檔案不重疊者並行），只在人類介入 gate 停；帶 UI 的視覺對圖 owner 可累積數個 change 一次驗收。每個 change 各自分支 + PR。
- **改 CLAUDE.md 本身＝owner-gated**：雖屬 docs，仍開 PR 不自 merge。

## Git 操作安全習慣（踩過坑的規則）

- **commit 身分只用 GitHub noreply 別名**（`45586375+SeanWangYS@users.noreply.github.com`）；絕不出現工作 email，也**不要**把 owner 加成 `Co-authored-by`（只加 Claude 那行）。
- **只 stage 自己改的檔**：commit 前 `git status --short`、`git add <paths>`；**禁 `git add -A` / `git add .`**——工作樹常有 owner 或其他 session 未追蹤的檔案（如 `openspec/changes/*`），不認得的不要動、告知 owner。
- **工作樹可能被其他 Claude session 共用並切分支**：每次 commit 前 `git branch --show-current` 確認；push 用明確 refspec `git push origin HEAD:refs/heads/<branch>`；長時間平行工作優先開獨立 worktree。
- **merge 後保留分支**，不刪、不提議刪、不開 auto-delete。
- **stacked PR 陷阱**：因保留分支，base merge 後 GitHub **不會**自動把子 PR 轉向 `main`——merge 前先把下一個 PR 的 base 改成 `main`，部署前用 `git log origin/main` 確認內容真的進了 main。
- **`firebase deploy` 從工作樹打包**：部署前確認 `git status` 乾淨且在最新 `main`。

## 本機開發陷阱（速查）

- **持倉卡「報價載入中…」**：①預設 `emulators` 不含 functions → 改 `emulators:fn`；②app keychain 快取的是**真實 Google 帳號**，種子資料屬 `test@assetanchor.dev`（不同 uid → 空帳號）→ 設定頁登出改用種子帳號登入（`expo run:ios` 重裝不會清 keychain）；③種子 quotes 15 分鐘 TTL 過期 → 重跑 `seed:emulator` 或 PATCH `fetched_at`。
- **`connectAuthEmulator` 是原生黏性狀態**：切 emulator ↔ production 要殺 app 程序重開，JS reload 不夠；`apps/mobile/.env` 會蓋過命令列 env。
- **emulator 資料重置後** app 舊 session 會 `auth/id-token-revoked` → 重新登入。
- **REST 寫 emulator 後** App `onSnapshot` 不一定即時反映 → `xcrun simctl terminate/launch booted com.seanwangys.assetanchor`。
- **Fabric TextInput**：容器 focus 時切 shadow/border/opacity/transform 必加 `collapsable={false}`（RN #45798，ADR-0009）。
- **E2E / 模擬器操作**：AXe 命令一律帶 `--udid`；`--label` 對畫面外元素座標會錯 → 用 `describe-ui` 取 frame 中心再 tap；中文輸入用 Maestro `inputText` 或 `simctl pbcopy` + Cmd+V；穩定 gate＝`maestro test .e2e/ --exclude-tags=devbuild-flaky`。細節見 `docs/runbook/e2e-maestro.md`。
- **Yahoo 抓取**：維持平實 UA `Mozilla/5.0 (AssetAnchor)`（假冒 Chrome UA 反被 429）、沿用 `yahooHistoryProvider` 的 host 輪替與 range bucket fallback。
- **查 prod**：client 錯誤能見度低，後端以 `firebase functions:log --project assetanchor-832df` 為主；機器未裝 gcloud 時可用 firebase-tools configstore 的 access token 打 GCP REST API。

## 環境關鍵事實

- **Apple Developer Program 卡的只有「真機 build + 上架」**，不擋 MVP 開發：iOS Simulator 本機開發/看 UI 不需付費帳號（T3 已 PASS）。**Google 登入 runtime 驗證 + 真機 dogfood** 延後到 Apple 通過後批量驗收。
- **Node**：machine 用 asdf（非 nvm），repo `.tool-versions` pin nodejs 22。
- **測試紀律**（§13.4，DoD 已涵蓋）：`shared` 純函式與 rules 必測（>90% / 隔離驗證）；UI 走 RNTL 只測關鍵 flow；純函式邏輯（shared/functions）走 TDD 先測再實作；新增 enum（transaction_type / asset_type / broker）必加測試。
