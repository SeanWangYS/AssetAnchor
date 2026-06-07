# Sprint 1（Auth + Hello Firebase Rail）— 進度 Runbook

**狀態：續作中（2026-06-03）** — T10 已修復；T8/T9 仍卡 Apple Developer Program 審核（尚未確認通過）。

- **Plan**：`docs/superpowers/plans/2026-05-30-sprint-1-auth.md`
- **Spec**：`docs/superpowers/specs/2026-05-30-sprint-1-auth-design.md`
- **分支**：`chore/align-simplified-expo-setup`（PR #2 開著、**未 merge**，使用者自行按 merge）
- **Firebase 專案**：`assetanchor-832df`

## TL;DR

- **T3 go/no-go = PASS**：RNFB native rail 在 iOS Simulator（iPhone 16）跑通。
- **T5–T7 已驗證**（畫面 + 後端 emulator API 雙重）。
- **T8 Google / T9 真機 = BLOCKED**：卡 Apple Developer Program 審核（已付 $99、enroll 審核中）。
- **T10 = FIXED（2026-06-03）**：7/7 pass，根因見下。
- 收尾未做：**TDD/測試策略討論**、**Sprint 1 retro**。

## 任務狀態（T0–T10）

| Task | 內容                                           | 狀態                                                   |
| ---- | ---------------------------------------------- | ------------------------------------------------------ |
| T0   | Node 統一 22                                   | ✅ DONE                                                |
| T1   | Expo SDK54 scaffold                            | ✅ DONE                                                |
| T2   | Expo Go first-light                            | ✅ DONE                                                |
| T3   | go/no-go（RNFB native 初始化）                 | ✅ **PASS（本 session）**                              |
| T4   | firebase service + auth 邏輯（authErrors TDD） | ✅ DONE                                                |
| T5   | 導航 + conditional auth + MainTabs             | ✅ DONE + 驗證                                         |
| T6   | Email/密碼畫面                                 | ✅ DONE + 驗證                                         |
| T7   | firestore rail `users/{uid}`                   | ✅ DONE + 驗證                                         |
| T8   | Google Sign-In（code）                         | ⏳ code DONE；runtime 驗證待 T9 真機（Simulator 受限） |
| T9   | 真機 EAS demo                                  | ⏳ **BLOCKED — Apple Developer Program 審核中**        |
| T10  | firestore rules 測試（code）                   | ✅ **DONE（2026-06-03 修復，7/7 pass）**               |

## 本 session 做了什麼

1. **修好 iOS build fail**（go/no-go 的關鍵障礙）
   - Root cause：RNFB + Expo SDK54 / RN0.81 + `useFrameworks: static` 下，`app.config.ts` 缺 `forceStaticLinking` → RNFB Firestore ObjC header 撞 Clang modules ownership 錯誤。
   - 修法（對齊 mikehardy/rnfbdemo demonstrator）：`expo-build-properties` 移到第一個 plugin + `forceStaticLinking: ['RNFBApp','RNFBAuth','RNFBFirestore']`。
   - commit `d4de568`（fix）+ `77a34dd`（tsconfig 同步），已 push。
2. **go/no-go PASS**：`expo prebuild --clean -p ios` + `expo run:ios` → Build Succeeded（0 errors）→ app 在 iPhone 16 顯示 SignIn。
3. **解紅屏**：`Unable to resolve module react-native-safe-area-context` = stale Metro cache（套件其實在 root node_modules、resolver 設定正確）→ `expo start -c` 清 cache 解掉。
4. **T5–T7 驗證**：用 `sprint1@test.dev` 註冊 → 進 MainTabs、Holdings 顯示 `OK → sprint1@test.dev`；登出/登入正常。後端對證：Auth emulator uid `oSLSz2xCWKPBrreVq0ATm4hszvEQ` == Firestore `users/{uid}` doc id == uid 欄位（三方一致、rules 放行）。
5. **T9 準備（Phase 1）**：建 `apps/mobile/eas.json`（profiles development/preview/production；env `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=false`）+ root `.easignore`（放行 gitignored 的 `GoogleService-Info.plist` 進雲端 build）。
6. **新增 tech note**：`docs/tech_note/ios-code-signing-and-eas.md`（+ 已發佈到 Notion Tech Notes）。

## 目前 Blocker

**Apple Developer Program**：已送出申請、**已付 $99**、enroll **審核中**（Individual 類型）。等收到開通 email / Apple Developer app 顯示 active 才能繼續 T9。

## 續作步驟（Apple 開通後）

**Phase 2 — EAS build（使用者互動）**

1. 開免費 **Expo 帳號**（expo.dev）— 跟 Apple 帳號無關。
2. `npm i -g eas-cli`
3. `eas login`（Expo 帳號）
4. `cd apps/mobile && eas init`（建立/連結 Expo 專案、寫入 projectId）
5. `eas device:create`（註冊 iPhone）
6. `eas build --profile preview --platform ios`（首次會要 Apple 授權一次，EAS 自動建/託管 cert + profile）
7. EAS 給 QR/URL → 手機掃碼安裝

**Phase 3 — 真機驗收**：開 app 驗 **T8 Google 登入**（真機才驗得到）+ email 註冊/登入/rail。此時連**正式 Firebase**（`assetanchor-832df`），資料寫真的 → Firebase Console 看 `users/{uid}`。

> 註：`eas.json` 的 `development` profile 需要 `expo-dev-client`（目前未裝）；第一次 demo 用 `preview` 即可，要 dev build（連 Metro）再加。

**Sprint 1 收尾（與 T9 平行可做）**

- ~~**T10 rules 測試**~~ ✅ **已修（2026-06-03）**：真根因**不是**版本不相容，是 `@react-native-firebase@24` 內建精確 pin `firebase@12.10.0`、與 firebase ws 的 `^12.14.0` 形成雙版本 → hoisted 模式實體複製出多份 `@firebase/firestore` → brand check 炸。修法 = firebase ws pin `"firebase": "12.10.0"` 對齊 RNFB + 重裝。⚠️ 地雷：未來 RNFB 升級若 bump 內建 firebase pin，firebase ws 的 pin 要跟著對齊，否則同樣錯誤復發。
- **TDD/測試策略討論**：使用者要比現行 §13.4 更積極的 unit test；討論後改 planning doc §13.4 或補 testing ADR。
- **Sprint 1 retro**：寫 `docs/retros/sprint-1.md`（記錄 modular API、deferred 排序、metro.config、metro cache 清除、forceStaticLinking、rules-test workspace 等偏差）。

## 環境關鍵事實

- **Node**：asdf（非 nvm），repo `.tool-versions` = nodejs 22.22.3。Bash shell 狀態不跨呼叫保留。
- **dev（Simulator）**：app 連本地 Firebase Emulator（`EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true`，在 `apps/mobile/.env`，gitignored）。Simulator 的 `localhost` = Mac loopback，可直連 emulator。
- **真機 / EAS build**：走正式 Firebase（`eas.json` env 設 `emulator=false`）。真機的 localhost 連不到 Mac emulator。
- **RNFB v24**：一律 modular API（getAuth/getFirestore/connect\*Emulator/...）。
- **`ios/` `android/`**：gitignored 生成物（CNG）。EAS 雲端會從 `app.config.ts` 重跑 prebuild → 吃到 `forceStaticLinking`。
- **Metro 雷**：若對「明明已安裝」的套件報 `Unable to resolve module` → 多半 stale cache，`expo start -c`。
- **GoogleService-Info.plist**：`apps/mobile/.secrets/`（gitignored、已備好）；EAS 靠 `.easignore` 放行上傳。

## Commit / Push 狀態（2026-06-07 更新）

上一輪列為「待 commit」的檔案（tech note、eas.json、.easignore、本 runbook）**皆已 commit**。本日另把本地領先的 3 個 commit push 到 origin：

- `c27cd2f` chore(docs): migrate planning workflow to OpenSpec
- `ab6ac2e` fix(firebase): pin firebase JS SDK to 12.10.0
- `6277e2b` docs(mobile): mark T10 rules tests fixed

分支 `chore/align-simplified-expo-setup` 已與 origin **完全同步**（0/0）。**PR #2**（base `main`）= OPEN / MERGEABLE，已反映最新 commit，**仍未 merge**（待使用者自行按 merge）。

工作區僅剩 untracked 的 `design_inspiration/`（使用者既有目錄，非本次產出，不動它）。

## Dev 環境狀態

本 session 結束時 **Metro / Firebase Emulator / iPhone 16 simulator 皆已關閉**。重啟方式：

- Emulator：`cd firebase && firebase emulators:start --project assetanchor-832df`
- App + Metro：`cd apps/mobile && npx expo run:ios`（會用既有 prebuild）或 `npx expo start`
