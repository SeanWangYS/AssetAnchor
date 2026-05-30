# Sprint 1 設計 — Auth + Hello Firebase Rail（iOS-first）

- **Status**: Approved（brainstorming 收斂 2026-05-30）
- **Date**: 2026-05-30
- **Sprint**: 1（見 planning doc §13.2）
- **Deciders**: Sean Wang
- **下一步**: 交棒 `superpowers:writing-plans` 產出逐 task 實作計畫

---

## Context

Sprint 1 是整個 MVP 的**最大技術風險點** —— 第一次把 `apps/mobile` 從 placeholder 變成真正能在裝置上跑的 Expo app，並打通 `@react-native-firebase` native module + Firebase Auth + Firestore 這條「rail」。開發者為 solo 業餘、熟後端/資料工程但**無 iOS / RN / Expo 經驗**，故本 sprint 刻意把風險前置、分段驗證，並保留 Plan B。

整合做法已在前置工作（PR #2）對齊「**官方 Expo monorepo 簡化流程**」：`.npmrc` 的 `node-linker=hoisted` 已就緒、文件已更新（見 `docs/tech_note/expo-pnpm-monorepo-integration.md`）。

## Goals（demoable 驗收）

1. **實機 dev build**：在實體 iPhone 上完成 註冊 / 登入 / 登出 → 切到 MainTabs。
2. **Email/密碼 + Google Sign-In** 兩種登入都可用。
3. **Hello Firestore rail**：註冊時以 shared `UserDocument` 型別寫 `users/{uid}`，登入後讀回 → 證明 auth → firestore → shared 型別 → security rules 端到端通。
4. **Firestore rules emulator 測試**綠燈（§13.4 強制）。
5. 4 個 MainTabs 空殼 + conditional auth navigator 正常切換。

## Non-goals（本 sprint 不做，避免範圍蔓延）

- 真正的 UI 元件 / theme tokens（Sprint 2）
- 帳戶 / 交易 / 持倉計算（Sprint 2–3）
- Android（後續 sprint，需補 `google-services.json` + Android 工具鏈）
- 報價 / 匯率（Sprint 4–5）
- Mobile 元件測試（§13.4 → Sprint 2 起）

## Locked decisions（背景，不重啟）

planning doc §2：Expo Dev Build + EAS Build、`@react-native-firebase`（native module，**非** JS SDK）、React Navigation v7、Zustand、TypeScript strict。

本 sprint brainstorming 收斂的執行層決策：
- **平台**：先集中 **iOS**。
- **go/no-go 路徑**：**Simulator 先、實機後**（local `expo run:ios` Simulator 驗 native 整合 → EAS / 本地實機 build 上 iPhone）。
- **Auth 範圍**：**Email/密碼先**做通 rail，**Google Sign-In 同 sprint 後段補**（必做，不可漏）。
- **整合**：官方 `create-expo-app` 直灌 monorepo + `node-linker=hoisted`（已預先做）+ 補兩條接線；SDK 52+ 免手寫 metro config。

## Architecture

- `apps/mobile`：Expo SDK 54 + TypeScript，整進 pnpm monorepo，消費 `@assetanchor/shared`。
- **Native 層**：Expo prebuild（Continuous Native Generation）+ config plugin（`@react-native-firebase/app`）。不手改 Xcode 專案；`ios/`、`android/` 為生成物、不進版控（已於 `.gitignore` 處理）。
- **Auth**：`@react-native-firebase/auth`（Email/密碼）+ `@react-native-google-signin/google-signin`（Google）→ 串 Firebase credential。
- **狀態**：Zustand `authStore`（`user | null | 'loading'`），由根層 `onAuthStateChanged` listener 餵。
- **導航**：React Navigation v7 — `RootNavigator`（native-stack）依 auth 狀態 **conditional render** `AuthStack` ↔ `MainTabs`；`MainTabs` = Bottom Tabs ×4（持倉/交易/帳戶/設定）空殼；型別走 declaration merging（§11.5）。
- **Firestore**：最小 `users/{uid}` create-on-signup + read-back，用 shared `UserDocument` 型別。

## 模組責任（feature-based，§12.2；建立骨架）

| 單元 | 責任 | 依賴 |
|---|---|---|
| `services/firebase` | Firebase app init、`auth` / `firestore` instance 匯出 | `@react-native-firebase/*` |
| `features/auth/screens` | SignIn / SignUp / ForgotPassword 畫面 | auth service、authStore |
| `features/auth/authStore` | Zustand store：auth 狀態單一真相 | `onAuthStateChanged` |
| `core/navigation` | RootNavigator / AuthStack / MainTabs + ParamList 型別 | authStore |
| `features/{holdings,transactions,accounts,settings}` | 空殼畫面（Sprint 2+ 填內容） | — |
| `features/auth/userDoc` | 註冊後寫/讀 `users/{uid}`（用 shared `UserDocument`） | `services/firebase`、`@assetanchor/shared` |
| `(test) firestore.rules.test` | rules emulator 測試 | `@firebase/rules-unit-testing` |

## Build & run 策略（go/no-go 分段）

1. **內圈快迭代**：本地 `expo run:ios` → iOS **Simulator**（不需 Apple 帳號、最快）。
2. **🆕 Expo Go first-light checkpoint**：scaffold 完、**尚未加** `@react-native-firebase` 前，用 **Expo Go** 在實體 iPhone 跑一眼（純 JS 還能用 Expo Go）→ 第一個成就感 + 提前驗證 iPhone/Expo Go 環境，在進入較硬的 native dev build 前先排除一類問題。
3. **🚦 go/no-go gate**：`@react-native-firebase` 在 Simulator dev build 初始化成功。**卡 >1 週 → Plan B：暫退 Firebase JS SDK，補一份 ADR**（見 §13.3 里程碑）。
4. **實機 demo**：EAS dev build（`eas build --profile development`）或本地 `expo run:ios --device`（免費 Apple ID，7 天簽章）裝進 iPhone。

> 註：`@react-native-firebase` 是 native module → Expo Go 裝不下 → 加它之後一律 dev build。Expo Go 只用於 step 2 的 first-light。

## Dev loop & DX（開發迴圈）

> 釐清常見疑慮：用 `@react-native-firebase`（需 dev build、不能用 Expo Go）後，**開發體驗仍然流暢**。

- **dev build = 一次性原生編譯，之後改 JS 即時熱更新**：首次 `expo run:ios` 編譯 + 安裝 dev client（幾分鐘）；之後跑 Metro dev server（`expo start --dev-client`），改 JS/TS → **Fast Refresh 立即更新**，跟 Expo Go 體驗相同。**只有新增/改動 native 套件時**才需重編 dev client。
- **本地後端用 Firebase Emulator Suite**（≈ AWS 的 LocalStack）：本地跑 Auth + Firestore 模擬器，app 指向它測「前端觸發資料存取」→ 不碰正式資料、快、可離線、可一鍵 reset。同一套 emulator 也供 Task 8 的 rules 測試。
- **環境切換**：以 env（`EXPO_PUBLIC_*`）切「連 emulator vs 連正式 Firebase」，dev 預設連 emulator。
- **Expo Go 僅用於 Task 2b first-light**（加 RNFB 前的純 JS 階段），之後一律 dev build。
- 細節原理見 `docs/tech_note/expo-pnpm-monorepo-integration.md`。

---

## Task 序列（設計層；bite-sized 步驟由 writing-plans 產出）

| # | Task | 重點 |
|---|---|---|
| 0 | **Pre-flight｜Node 版本統一為 22** | dev=CI=prod 全部 Node 22（Expo 最穩 LTS、Functions 2nd-gen `nodejs22`）：`.nvmrc`=22、`apps/functions` engines 20→22、本機 `nvm use 22`（CI 的 `NODE_VERSION` 與 root `engines` 已是 22）。並裝 Xcode、註冊 Expo 帳號。 |
| 1 | **Expo scaffold（簡化版）** | 清 placeholder → `pnpm create expo-app --template default@sdk-54 apps/mobile` → 補回 `@assetanchor/shared: workspace:*` + tsconfig `extends` base（`node-linker=hoisted` 已就緒） |
| 2 | **Wiring sanity** | 用既有 `sanityCheck()`（import `Money`）渲染到畫面，證明 shared 在 RN bundler 解得到 |
| 2b | **🆕 Expo Go first-light** | Expo Go 在實體 iPhone 跑一眼（加 Firebase 前） |
| 3 | **🚦 GO/NO-GO** | 加 `@react-native-firebase/app` + config plugin → `expo prebuild` → `expo run:ios`（Simulator）→ Firebase 初始化不 crash。卡 >1 週 → Plan B |
| 4 | **Email/密碼 Auth** | SignIn/SignUp/ForgotPassword、`authStore` + `onAuthStateChanged`、conditional navigator、4 個空 MainTabs |
| 5 | **Hello Firestore rail** | 註冊寫 `users/{uid}`（shared 型別）、Holdings tab 讀回 |
| 6 | **Google Sign-In** | `@react-native-google-signin` + 從 `GoogleService-Info.plist` 取 `REVERSED_CLIENT_ID` 設 URL scheme → 串 Firebase credential |
| 7 | **實機 EAS dev build** | 裝進 iPhone → 註冊/登入/登出 → MainTabs（demo 驗收） |
| 8 | **Firestore rules emulator 測試** | `@firebase/rules-unit-testing` 測 §7 四條規則 + user A 讀不到 user B |

## Auth + 導航資料流

根層掛 `onAuthStateChanged` → 更新 `authStore`（`user | null | 'loading'`）→ `RootNavigator` 依狀態 **conditional render**（`{user ? <MainTabs/> : <AuthStack/>}`，**不用** `navigate('MainTabs')`，避免 §11.5 的歷史殘留 / 未授權畫面閃現）。初始 `'loading'` 期間顯示 splash/loading gate，避免 auth 畫面 flash。

## Error handling

- **Auth 錯誤**：把 `@react-native-firebase/auth` 的 error code 對應到友善訊息（可參考舊專案錯誤訊息表，§14.3），於 auth 畫面 inline 顯示。
- **初始 loading**：`authStore` `'loading'` 期間擋住導航，避免閃現。
- **註冊時寫 `users/{uid}` 失敗**：優雅處理（surface 錯誤 / 可重試），不阻斷登入本身。

## Testing

- **Firestore rules unit tests**（`@firebase/rules-unit-testing` + emulator）—— **本 sprint 必過硬 gate**。涵蓋 §7 四條規則 + 跨 user 隔離（user A 不能讀/寫 user B）。
- 本 sprint **不做** mobile 元件測試（§13.4 → Sprint 2 起）。
- 每 sprint 結尾真機 dogfood 一輪（§13.4）。

## Risks & mitigations

| 風險 | 緩解 |
|---|---|
| RN-Firebase native 初始化失敗（go/no-go） | config plugin + prebuild；卡 >1 週 → Plan B（Firebase JS SDK）+ ADR |
| iOS 簽章卡關 | 免費 Apple ID 本地 build（7 天）避開付費依賴；付費會員可晚點再決定 |
| Google Sign-In URL scheme 設錯 | 從 `GoogleService-Info.plist` 的 `REVERSED_CLIENT_ID` 設定 |
| Node 版本不一致（functions 20 / root >=22 / 環境 24） | Task 0 reconcile + `.nvmrc` |
| 版本釘選（Expo SDK / RN-Firebase / RN Navigation / Node） | writing-plans 階段查當前官方文件再釘死 |

## Exit criteria

- [ ] Node 版本對齊、`apps/functions` engines 警告消除
- [ ] Expo Go first-light：實體 iPhone 看到 app（加 Firebase 前）
- [ ] iOS Simulator dev build 起得來、RN-Firebase 初始化成功（go/no-go 過）
- [ ] 實機 build：註冊/登入/登出 work、切到 MainTabs
- [ ] Email/密碼 **與** Google Sign-In 都能登入
- [ ] `users/{uid}` doc 建立並讀回（hello firestore rail）
- [ ] Firestore rules emulator 測試綠燈
- [ ] 4 個 MainTabs 空殼 render、conditional navigator 正常
- [ ] CI 仍綠、PR 合進 main

## Open items / ADR

- **ADR-002（Firebase SDK：@react-native-firebase over JS SDK）已於本 sprint 補寫**（`docs/adr/0002-firebase-sdk-react-native-firebase.md`）。導航 ADR-003 排在 Sprint 2。若 go/no-go 觸發 Plan B（退 JS SDK），再以新 ADR 記錄該逆轉。
- 確切版本（Expo SDK、`@react-native-firebase`、React Navigation、Node）於 writing-plans 階段以當前官方文件釘死。

## References

- planning doc §2 / §7（security rules）/ §11（導航）/ §13.2 / §13.4（測試）/ §14（舊資產複用）
- tech note：`docs/tech_note/expo-pnpm-monorepo-integration.md`
- breadcrumbs：`apps/mobile/src/index.ts`、`apps/functions/src/index.ts`
- shared 型別：`packages/shared/src/`
