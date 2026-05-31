# Sprint 1（Auth + Hello Firebase Rail）— 進度 Runbook

**狀態：暫停中（2026-05-31）** — 卡在 Apple Developer Program 審核，使用者預計約 2 天後續作。

- **Plan**：`docs/superpowers/plans/2026-05-30-sprint-1-auth.md`
- **Spec**：`docs/superpowers/specs/2026-05-30-sprint-1-auth-design.md`
- **分支**：`chore/align-simplified-expo-setup`（PR #2 開著、**未 merge**，使用者自行按 merge）
- **Firebase 專案**：`assetanchor-832df`

## TL;DR

- **T3 go/no-go = PASS**：RNFB native rail 在 iOS Simulator（iPhone 16）跑通。
- **T5–T7 已驗證**（畫面 + 後端 emulator API 雙重）。
- **T8 Google / T9 真機 = BLOCKED**：卡 Apple Developer Program 審核（已付 $99、enroll 審核中）。
- 收尾未做：**T10 rules 測試修復**、**TDD/測試策略討論**、**Sprint 1 retro**。

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
| T10  | firestore rules 測試（code）                   | ❌ code DONE 但實跑 7/7 fail（待修，見下）             |

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

- **T10 rules 測試**：實跑 7/7 fail，根因 = `firebase@12` 與 `@firebase/rules-unit-testing@5.0.1` 的 `@firebase/firestore` 實例 brand 不符（規則本身正確、已部署）。修法：查相容版本搭配（多半 pin firebase 版本）或改 test 取得 firestore handle 的方式，再跑 `pnpm --filter @assetanchor/firebase test:rules` 拿 7/7（Java + firebase CLI 已備）。
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

## 未 commit 檔案（待處理）

- `docs/tech_note/ios-code-signing-and-eas.md`
- `apps/mobile/eas.json`
- `.easignore`
- `docs/runbook/sprint-1-status.md`（本檔）

建議 commit（不 merge、只 push 分支）：

- `docs(mobile): add iOS code signing & EAS tech note`
- `chore(mobile): add EAS build config (eas.json + .easignore)`
- runbook 可併入上述或單獨 `docs: add sprint 1 status runbook`

（`design_inspiration/` 為使用者既有未追蹤目錄，非本次產出。）

## Dev 環境狀態

本 session 結束時 **Metro / Firebase Emulator / iPhone 16 simulator 皆已關閉**。重啟方式：

- Emulator：`cd firebase && firebase emulators:start --project assetanchor-832df`
- App + Metro：`cd apps/mobile && npx expo run:ios`（會用既有 prebuild）或 `npx expo start`
