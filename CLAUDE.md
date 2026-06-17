# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 主計劃書（ADR-000）：`docs/portfolio_tracker_planning.md`。第 2–8 章決策已拍板，修改前須評估影響。完整 tech stack / 開發慣例 / 測試紀律見 `openspec/config.yaml` 的 `context`。

## 核心開發紀律（不可違反的不變量）

> 這是專案「憲法」——每次開發都必須遵守，違反任一條前停下來找 owner。權威細節見各自 ADR。

1. **設計包＝產品最高權威**（ADR-0008）：`docs/design/`（以 `app-prototype/` 為準）是**功能、UI、與資料需求**的最終對齊依據；planning / ADR / code / **Firestore schema** 一律對齊設計，**後端為滿足設計畫面所需而調整**（衝突時設計贏）。兩護欄：(A) 金額/數量/匯率/成本**精度**仍歸 `Money`/decimal.js（ADR-0005，設計數字僅顯示示意）；(B) schema 變更走「聖牛」紀律（第 3 條）。
2. **Money/decimal 紀律**（ADR-0005）：金錢/數量/匯率/成本一律用 `packages/shared` 的 `Money`，**禁用 native number**；Firestore 存 10 位小數 string。
3. **Schema 變更紀律（聖牛）**：schema 可為設計而改，但**改前逐欄評估三端（mobile/functions/shared）影響**，且**屬人類介入 gate——先找 owner**（見 planning §2.5）。設計決定「要什麼資料」、schema 改動「怎麼改」仍受紀律與 gate 約束。
4. **依賴方向**：`features/* → core | services | packages/shared`；feature 之間不互 import。
5. **Firebase**：一律 `@react-native-firebase` v24 modular API（禁 namespaced）。
6. **OpenSpec 工作流**：每個 change 走 explore→propose→apply→archive；**帶 UI 的 change 必引對應 `docs/design/<feature>/*-spec.md` + 通過 iOS Simulator 視覺對圖**。
7. **測試紀律**（ADR-0007）：測試金字塔寫進每個 change 的 Definition-of-Done（shared 純函式 coverage gate、rules 必測、UI 關鍵 flow RNTL）。
8. **Git 安全 + 分級 merge + 延後 merge**：只 push 當次開發分支；**絕不直接 push main**。**merge 不阻擋自走 loop**（owner 規則 2026-06-17）：PR + （帶 UI 則）視覺對圖通過後就 `archive`、續做下一個 change，**不停下等 merge**；merge 到 main **延後由 owner 在里程碑批次執行**。誰 merge 仍照分級：
   - 🛑 **owner 本人 merge（但 loop 不為它停）**：帶 UI（ADR-0008 視覺保真）、聖牛 schema、Money/decimal 精度、跨 change ADR、部署/花錢/真機。→ AI 開 PR + archive 後**繼續做**，PR 累積留給 owner 批次 merge。
   - ✅ **低風險可自 merge**（`gh pr merge`）：純 docs / 測試 / `shared` 純函式 / 低風險重構等「自動 gate 完全涵蓋、無設計/schema/Money/UX 判斷」者，憲法仍允許；惟依延後 merge 規則，亦可同樣「開 PR + 續做、留 owner 批次」。
   - 不確定屬哪層 → 當高風險：開 PR + archive + 續做，**不**自 merge。**前提**：須與 user global CLAUDE.md 的 merge 規則一致（global「絕對禁止 merge main」＋本專案分級授權但書；AI 永不自動 merge main，延後規則只改「何時」不改「誰」）。
9. **人類介入 gate**（planning §2.5）：聖牛 schema 變更、設計衝突/缺 spec、花錢·部署·真機、Money 精度規則、跨 change 重大決策——**必停找 owner**；其餘可自走。

## 常用指令

Monorepo 用 **pnpm@9.12.0 + Node 22**（asdf，非 nvm；`.tool-versions` pin 22）。`pnpm -r <script>` 會跑遍所有 workspace。

```bash
pnpm install                       # 安裝（CI 用 --frozen-lockfile）
pnpm -r typecheck                  # 全 workspace tsc --noEmit
pnpm -r lint                       # 全 workspace eslint
pnpm -r test                       # 全 workspace 測試
pnpm format        / format:check  # prettier 寫入 / 檢查（CI 跑 --check .）
```

針對單一 workspace（`@assetanchor/{shared,mobile,functions,firebase}`）：

```bash
# shared（純函式，唯一進 CI test job 的套件，coverage gate 90%）
pnpm --filter @assetanchor/shared test            # 全部
pnpm --filter @assetanchor/shared test:coverage   # 含覆蓋率門檻
pnpm --filter @assetanchor/shared test -- money.test.ts          # 單檔
pnpm --filter @assetanchor/shared test -- -t "CurrencyMismatch"  # 單一 test name

# mobile（Expo）—— jest 需 TS_NODE_SKIP_PROJECT=true（package.json 的 test script 已帶）
pnpm --filter @assetanchor/mobile test
pnpm --filter @assetanchor/mobile start    # Metro / Expo dev server
pnpm --filter @assetanchor/mobile ios      # expo run:ios（需 prebuild 後的 ios/）

# firestore rules —— 必須有 Firebase CLI，會自動起 emulator 再跑 jest
pnpm --filter @assetanchor/firebase test:rules
```

CI（`.github/workflows/ci.yml`）三個 job：`lint`（prettier --check + `pnpm -r lint`）、`typecheck`、`test`（**只跑 shared 的 `test:coverage`**——mobile/firebase 測試不在 CI，須本機手動跑）。

commit 走 **Conventional Commits**（commitlint 強制），scope 限 `mobile / functions / shared / infra / docs / firebase`；husky pre-commit 跑 lint-staged（prettier + eslint --fix）。

## 架構大圖

四個 workspace（`pnpm-workspace.yaml`：`apps/*` + `packages/*` + `firebase`），共用 `tsconfig.base.json`（TS strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`）：

| Workspace                                   | 角色                                                                                                                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared` (`@assetanchor/shared`)   | 跨端共用：`enums/`、`types/`、`money/`（Money class）、`schemas/`（zod）。**以 source 形式被消費**（`main` 指向 `src/index.ts`，非 build artifact），ESM (`type: module`)，import 路徑帶 `.js` 副檔名。 |
| `apps/mobile` (`@assetanchor/mobile`)       | Expo SDK 54 / RN 0.81 / React 19 app。                                                                                                                                                                  |
| `apps/functions` (`@assetanchor/functions`) | Firebase Cloud Functions，`tsc` build 到 `lib/`（Sprint 0 尚無實作）。                                                                                                                                  |
| `firebase` (`@assetanchor/firebase`)        | `firestore.rules` + `firestore.indexes.json` + rules 測試。                                                                                                                                             |

**依賴方向（單向，勿違反）**：`features/* → core/* | services/* | packages/shared`；feature 之間**不互相 import**。

### Money / decimal 紀律（最重要的不變量）

金額、數量、匯率、成本一律用 `packages/shared` 的 **`Money`**（包 `decimal.js`），**禁止用 native `number` 做金錢運算**。Firestore 儲存格式是 `Money.toDecimalString()` —— 固定 **10 位小數的 string**（canonical），讀回用 `Money.fromDecimalString(s, currency)`。顯示才用 `toDisplayString(n)`。不同幣別運算丟 `CurrencyMismatchError`；NaN/Infinity 丟 `InvalidMoneyValueError`。`toNumber()` 是會丟失精度的逃生門，只給 UI / charting 用。

### Firestore schema 是聖牛

Schema 定義在 planning doc **§6**，是 mobile / functions / shared types 的單一事實來源；**改 schema 前必須逐欄評估三端影響**（OpenSpec design 階段強制對照）。安全模型（`firebase/firestore.rules`）：

- `users/{uid}/**` —— 使用者只能讀寫自己 uid 下全部資料（per-user 隔離，rules 測試必驗）。
- `exchange_rates/{date}`、`quotes/{symbolId}` —— 登入者可讀，**只有後端 Admin SDK / Cloud Function 可寫**。
- `symbols/{symbolId}` —— 登入者可讀、可 create（MVP 動態新增），不可 update/delete。

### Firebase 接法 + Emulator

一律用 **@react-native-firebase v24 modular API**（`getAuth` / `getFirestore` / `connectXxxEmulator`，禁 namespaced API）。dev 時 Simulator 連本地 Emulator Suite（auth `9099`、firestore `8080`、UI `4000`），由 `apps/mobile/src/services/firebase` 的 `wireEmulatorsOnce()` 在 App 啟動時依 `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true` 接線；真機 / EAS build 連正式專案 `assetanchor-832df`。

### Mobile 結構與導航

Feature-based：`src/features/<feature>/`（screens + `*Service.ts` Firestore CRUD + `*Store.ts` Zustand store + 純函式）、`src/core/`（`navigation/` `theme/` `ui/`）、`src/services/firebase/`。導航是 React Navigation v7：Root Stack 包 4 個 Bottom Tab（**持倉 / 交易 / 分析 / 設定**，權威導航見 ADR-0008）+ SplashGate + Modal group；**帳戶管理是「設定」子頁、不是 tab**；新增交易入口＝持倉頁 header ＋、交易頁 FAB-only；auth 狀態決定 `RootNavigator` 顯示 AuthStack 還是 MainTabs。表單目前用受控 input + `packages/shared` 的 zod schema 做 `safeParse` 驗證（RHF 待 Sprint 3 交易表單再導入）。UI 字串純繁體中文（MVP 不做 i18n）。

## 設計驅動工作流（UI 最高權威，ADR-0008）

**設計包（`docs/design/`，整合原型 `docs/design/app-prototype/`）是產品在 UI 一切面向（導航 / 畫面 / 視覺 / 互動）的最高權威**，凌駕 planning doc 與既有 code；衝突時設計贏，其餘對齊（細節見 ADR-0008）。

- **權威導航＝持倉 / 交易 / 分析 / 設定**（底部恰好 4 tab）；帳戶管理為「設定」子頁；新增入口＝持倉頁 header ＋、交易/帳戶用 FAB；含 SplashGate。
- **每個帶 UI 的 OpenSpec change**：design 階段**必須引用**對應的 `docs/design/<feature>/*-spec.md`（像素級依據）＋ `docs/design/app-prototype/`（衝突時以原型為準）；完成前**必須通過逐畫面 iOS Simulator 視覺對圖（visual conformance）**。缺對應 spec 的畫面，先補 spec 再實作。
- **唯一但書**：金額/數量/匯率/成本的**儲存與運算精度仍歸 `Money`/decimal.js（ADR-0005）**——設計稿數字僅顯示層示意，不治理精度。

## Sprint × OpenSpec 工作流規則

1. **照原計劃書 §13.2 的 vertical slice 走**：一次只做一個 sprint，每個 sprint 前後端一起做（schema/邏輯 → Firestore CRUD → UI 畫面），結尾在 iOS Simulator 上可 demo。
2. **預設 1 個 sprint = 1 個 OpenSpec change**：走完整 explore →（propose → apply → archive）一輪工作流。
3. **若某個 sprint 規劃範圍太大，就拆成多個 OpenSpec change 執行**：拆分原則是各 change 要 cohesive、tasks 跑得完；當一個 sprint 明顯包含兩組以上獨立的 capability 時才拆。
4. **Sprint 1 是例外**：收尾走舊 runbook（`docs/retros/sprint-1.md`），OpenSpec change 自 **Sprint 2（Accounts）** 起。

文件層級：`docs/adr/`（跨 change 重大決策，Context→Decision→Consequences→Alternatives）、`docs/tech_note/`（值得回顧的技術教學）、`docs/runbook/`、`docs/retros/`、`docs/superpowers/plans/`。

## 環境關鍵事實

- **Apple Developer Program 卡的只有「真機 build + 上架」**，不擋 MVP 開發：iOS Simulator 本機開發/看 UI 不需付費帳號（T3 go/no-go 已 PASS）。僅 **Google 登入 runtime 驗證 + 真機 dogfood** 延後到 Apple 通過後一次批量驗收。
- **Node**：machine 用 asdf（非 nvm），repo `.tool-versions` pin nodejs 22。
- **測試紀律（§13.4）**：`packages/shared` 純函式與 Firestore rules 必測（>90% / 隔離驗證）；UI 走 RNTL 只測關鍵 flow。新增 enum（transaction_type / asset_type / broker）必加對應測試。純函式邏輯（shared/functions）走 TDD，先測再實作。
