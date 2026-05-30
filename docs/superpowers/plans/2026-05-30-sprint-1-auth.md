# Sprint 1 — Auth + Hello Firebase Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `apps/mobile` 從 placeholder 變成可在實機 iPhone 跑的 Expo app，打通 `@react-native-firebase` + Firebase Auth（Email/密碼 + Google）+ Firestore（`users/{uid}` hello rail），完成 conditional auth navigator + 4 個空 MainTabs，並通過 Firestore rules emulator 測試。

**Architecture:** Expo SDK 54（TypeScript）整進現有 pnpm monorepo，消費 `@assetanchor/shared`；native 層走 Expo prebuild（CNG）+ config plugins（不手改 Xcode）。Auth 狀態由根層 `onAuthStateChanged` → Zustand `authStore` → React Navigation v7 conditional render（AuthStack ↔ MainTabs）。go/no-go 先在 iOS Simulator 驗 RNFB 初始化，再上實機。

**Tech Stack:** Expo SDK 54、`@react-native-firebase/{app,auth,firestore}`、`@react-native-google-signin/google-signin`、`@react-navigation/{native,native-stack,bottom-tabs}`、Zustand、`expo-build-properties`、EAS CLI、`@firebase/rules-unit-testing` + Firebase Emulator Suite。

> **設計來源**：`docs/superpowers/specs/2026-05-30-sprint-1-auth-design.md`（spec）、`docs/tech_note/expo-pnpm-monorepo-integration.md`（整合原理）、planning doc §2/§7/§11/§13/§14、ADR-002（Firebase SDK 選型）。
>
> **版本策略**：所有 Expo 生態套件一律用 `npx expo install <pkg>`（會自動挑 SDK 54 相容版本），**不要**手寫版本號。非 Expo 套件（zustand）同樣用 `npx expo install` 讓 Expo 解析相容版本。
>
> **TDD 範圍**：本 sprint 純函式可測者＝`authErrors`（error code → 訊息對應）與 Firestore rules（emulator）→ 走 TDD（先寫失敗測試）。UI/native/導航無法有意義單元測試（§13.4 → Sprint 2 才做元件測試）→ 採「實作後在裝置/模擬器手動驗證」並明列預期。

---

## File Structure

完成 Sprint 1 後 `apps/mobile`（重點檔；native `ios/`、`android/` 為 prebuild 生成物、不進版控）：

```
apps/mobile/
├── app.config.ts              # Task 1/3/6：Expo 設定（plugins、ios.googleServicesFile、bundleId、scheme）
├── package.json               # Task 1：Expo deps + @assetanchor/shared + RNFB + nav + zustand
├── tsconfig.json              # Task 1：extends ../../tsconfig.base.json + expo/tsconfig.base
├── babel.config.js            # Task 1：babel-preset-expo
├── index.ts                   # Task 1：registerRootComponent(App)
├── App.tsx                    # Task 4：root providers + onAuthStateChanged + RootNavigator
├── eas.json                   # Task 7：EAS build profiles
├── .env.example               # Task 3：EXPO_PUBLIC_USE_FIREBASE_EMULATOR 等
├── .secrets/                  # （已 gitignore）pre-staged GoogleService-Info.plist
└── src/
    ├── services/firebase/
    │   └── index.ts           # Task 3：auth / firestore instance + emulator 連線
    ├── features/auth/
    │   ├── authErrors.ts      # Task 4：error code → 友善訊息（TDD）
    │   ├── authErrors.test.ts # Task 4
    │   ├── authService.ts     # Task 4/6：signUp/signIn/signOut/reset/signInWithGoogle
    │   ├── authStore.ts       # Task 4：Zustand（user | null | 'loading'）
    │   ├── userDoc.ts         # Task 5：createUserDoc / getUserDoc（UserDocument）
    │   └── screens/
    │       ├── SignInScreen.tsx       # Task 4
    │       ├── SignUpScreen.tsx       # Task 4
    │       └── ForgotPasswordScreen.tsx # Task 4
    ├── core/navigation/
    │   ├── types.ts           # Task 4：RootParamList / AuthStackParamList / MainTabsParamList
    │   ├── RootNavigator.tsx  # Task 4：conditional auth
    │   ├── AuthStack.tsx      # Task 4
    │   └── MainTabs.tsx       # Task 4：Bottom Tabs ×4
    └── features/
        ├── holdings/HoldingsScreen.tsx       # Task 4（殼）+ Task 5（讀 userDoc）
        ├── transactions/TransactionsScreen.tsx # Task 4（殼）
        ├── accounts/AccountsScreen.tsx         # Task 4（殼）
        └── settings/SettingsScreen.tsx         # Task 4（殼，含登出鈕）

firebase/
├── firebase.json              # Task 8：新增 emulators 設定（firestore/auth）
└── tests/
    ├── package.json           # Task 8：rules 測試 mini-workspace
    ├── jest.config.ts         # Task 8
    └── firestore.rules.test.ts # Task 8（TDD：user 隔離 + §7 四規則）
```

**檔案職責**：`services/firebase` 是唯一初始化 Firebase 的地方（auth/firestore singleton + emulator 切換）；`features/auth` 自成一個 feature（service/store/screens/errors/userDoc）；`core/navigation` 只管導航結構與型別；其餘 feature 目錄本 sprint 只放空殼畫面。

---

## Pre-flight：執行前置條件

開始前在 repo 根確認：

```bash
node --version          # 預期 v22+（Task 0 會把版本對齊講清楚）
pnpm --version          # 預期 9.12.x
xcodebuild -version      # 需已裝 Xcode（Simulator 必備）；沒裝 → App Store 安裝後再跑 `xcode-select --install`
cat .npmrc               # 應有 node-linker=hoisted（已於前置 PR 設好）
ls apps/mobile/.secrets/GoogleService-Info.plist   # 舊專案複用的 plist 應在此（gitignored）
```

- **Expo 帳號**：到 https://expo.dev 註冊（免費）。Task 7 跑 `eas` 前 `npx eas-cli login`。
- **實體 iPhone**：Task 7 需要；用免費 Apple ID 即可（7 天簽章）。
- 若 `apps/mobile/.secrets/GoogleService-Info.plist` 不存在：從舊專案 `AssetAnchor_old` 根目錄複製過來（planning doc §14.2）。

---

## Task 0：Node 版本統一為 22（dev = CI = prod，消除 engines 不一致）

**Files:**
- Create: `.nvmrc`
- Modify: `apps/functions/package.json`（`engines.node` 20 → 22）

> **決策（使用者拍板）**：dev、CI、prod functions **全部統一 Node 22 LTS**（Expo SDK 54 最穩 LTS、Firebase Functions 預設 runtime）。消除「環境 24 / functions 20」不一致。dev/prod 同版本＝best practice，避免「在我機器上 OK」類 bug。
> **已查證**：CI（`.github/workflows/ci.yml`）的 `NODE_VERSION` **已是 22**、root `package.json` engines **已是 `>=22.0.0`** → 兩者不需改。Firebase Functions 用 `nodejs22` runtime **需 2nd-gen**（1st-gen 不支援）；本專案 Functions（Sprint 4）以 2nd-gen 宣告即可。

- [ ] **Step 1：切換本機到 Node 22（nvm）**

```bash
nvm install 22
nvm use 22
node --version   # 預期 v22.x（目前環境是 24，需切下來與 prod 對齊）
```
> nvm = Node Version Manager（≈ Python 的 pyenv），在一台機器管理/切換多版本 Node。沒裝 nvm：`brew install nvm` 後依提示設定 shell（或用 nvm GitHub 的安裝腳本）。

- [ ] **Step 2：建立 `.nvmrc` 釘專案 Node 版本**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/.nvmrc`：
```
22
```

> 之後在 repo 根 `nvm use`（不帶版號）會自動讀此檔切到 22，讓你/CI/協作者一致。

- [ ] **Step 3：把 `apps/functions` engines 對齊到 22**

編輯 `apps/functions/package.json` 的 `engines`（原為 `"node": "20"`）：
```json
"engines": {
  "node": "22"
}
```
> 這同時是 Firebase 部署的 runtime 宣告（2nd-gen → `nodejs22`）。dev=CI=prod 三方一致後，pnpm 不再有 engine mismatch warning。

- [ ] **Step 4：驗證 install 無 engine 警告 + CI 仍綠**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
pnpm install --frozen-lockfile
pnpm -r typecheck && pnpm -r lint && pnpm -r test
```
Expected: 無 engine mismatch warning（環境與 functions 都 22）；typecheck/lint/test 全綠（packages/shared 76 tests pass）。

- [ ] **Step 5：Commit**

```bash
git add .nvmrc apps/functions/package.json
git commit -m "chore(infra): unify Node 22 across dev/CI/functions (.nvmrc + functions engines)"
```

---

## Task 1：Expo scaffold + monorepo 接線（簡化版官方流程）

**Files:**
- Delete: `apps/mobile/src/index.ts`（placeholder，內容會重建）
- Create（由 create-expo-app 生成後保留）：`apps/mobile/{package.json,app.json→app.config.ts,babel.config.js,index.ts,tsconfig.json,App.tsx}`
- Modify: `apps/mobile/package.json`（補回 `@assetanchor/shared`）、`apps/mobile/tsconfig.json`（extends base）

> 原理見 tech note。`node-linker=hoisted` 已就緒，SDK 52+ 免手寫 metro。

- [ ] **Step 1：備份 placeholder 內容（sanityCheck 等下要保留邏輯）**

placeholder 的 `sanityCheck()` 會在 Task 2 重用來驗證 shared 接線。先記住它的內容（`Money.zero('TWD').toDisplayString()`）。

- [ ] **Step 2：清空 apps/mobile（create-expo-app 要乾淨目錄）**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
rm -rf apps/mobile
```
Expected: `apps/mobile` 不存在（pnpm-workspace.yaml 的 `apps/*` glob 仍在，等下重建）。

- [ ] **Step 3：用官方產生器灌入 apps/mobile**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
pnpm create expo-app --template default@sdk-54 apps/mobile
```
Expected: 生成完整 Expo app（SDK 54、TypeScript、預設 `expo-router` 或 blank —— 若預設模板含 expo-router 而你想要單純結構，改用 `--template blank-typescript`；本 plan 後續採 **非 expo-router** 的 React Navigation 結構，故用 blank-typescript）：

```bash
# 採用 blank-typescript（與本 plan 的 React Navigation 結構一致）
pnpm create expo-app --template blank-typescript apps/mobile
```
Expected: `apps/mobile` 內有 `App.tsx`、`app.json`、`package.json`、`tsconfig.json`、`babel.config.js`、`index.ts`（或由 expo 提供 entry）。

- [ ] **Step 4：補回 monorepo 接線（一）— shared 依賴**

編輯 `apps/mobile/package.json`，在 `dependencies` 加入：
```json
"@assetanchor/shared": "workspace:*"
```
並把 `name` 設為 `@assetanchor/mobile`（若產生器設成別的），保留 Expo 給的 `scripts`（`start`/`android`/`ios`/`web`），另補 monorepo 慣例 script：
```json
"scripts": {
  "start": "expo start",
  "android": "expo run:android",
  "ios": "expo run:ios",
  "typecheck": "tsc --noEmit",
  "lint": "eslint 'src/**/*.{ts,tsx}' App.tsx",
  "test": "echo 'no mobile unit tests in Sprint 1 (see §13.4)' && exit 0"
}
```

- [ ] **Step 5：補回 monorepo 接線（二）— tsconfig extends base**

編輯 `apps/mobile/tsconfig.json` 為（合併 Expo base 與 repo base）：
```json
{
  "extends": ["../../tsconfig.base.json", "expo/tsconfig.base"],
  "compilerOptions": {
    "jsx": "react-native",
    "moduleResolution": "Bundler"
  },
  "include": ["App.tsx", "src/**/*", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

> 若 `extends` 陣列順序造成衝突（兩者都設某選項），以後者 `expo/tsconfig.base` 的 RN 專屬設定為準，本 repo 的 strict 仍由 `tsconfig.base.json` 提供。

- [ ] **Step 6：安裝 + 連通 workspace**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
pnpm install
```
Expected: `apps/mobile` 連上 workspace、`@assetanchor/shared` 以 workspace 連結；無 metro 設定需求（SDK 54 自動）。

- [ ] **Step 7：把 app.json 轉成 app.config.ts（之後 Task 3/6 要動態加 plugin/env）**

刪除 `apps/mobile/app.json`，建立 `apps/mobile/app.config.ts`：
```typescript
import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'AssetAnchor',
  slug: 'assetanchor',
  scheme: 'assetanchor',
  version: '0.0.1',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.seanwangys.assetanchor',
  },
  android: {
    package: 'com.seanwangys.assetanchor',
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 8：啟動 Metro 確認 app 起得來（Web 或 Simulator 皆可，此步先不碰 native）**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile
pnpm start
```
Expected: Metro dev server 啟動、無 module resolution 錯誤。按 `Ctrl+C` 結束。

- [ ] **Step 9：Commit**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
git add apps/mobile pnpm-lock.yaml
git commit -m "feat(mobile): scaffold Expo SDK 54 app + wire into pnpm monorepo"
```

---

## Task 2：Wiring sanity + 🆕 Expo Go first-light（實機看第一眼）

**Files:**
- Modify: `apps/mobile/App.tsx`

> 目標：證明 `@assetanchor/shared` 在 RN bundler 解得到，並讓你**第一次在自己 iPhone 上看到 app**（用 Expo Go，加 Firebase 前的純 JS 階段）。

- [ ] **Step 1：在 App.tsx 顯示 sanityCheck（驗證 shared 接線）**

`apps/mobile/App.tsx`：
```tsx
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { Money } from '@assetanchor/shared';

export default function App() {
  const sanity = Money.zero('TWD').toDisplayString();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AssetAnchor</Text>
      <Text>shared wiring OK → Money.zero('TWD') = {sanity}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '600' },
});
```

- [ ] **Step 2：在 iOS Simulator 驗證（不需帳號）**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile
pnpm start
# 按 i 開 iOS Simulator（或先 `open -a Simulator`）
```
Expected: Simulator 顯示 "AssetAnchor" + "Money.zero('TWD') = 0.00"。改一下文字存檔 → Fast Refresh 立即更新。

- [ ] **Step 3：🆕 Expo Go first-light — 在你實體 iPhone 看第一眼**

1. iPhone App Store 安裝 **Expo Go**。
2. iPhone 與 Mac 連同一個 Wi-Fi。
3. `pnpm start` 後，用 iPhone 相機掃描終端機 QR code（或 Expo Go 內掃描）。

Expected: 你的 iPhone（透過 Expo Go）顯示同樣畫面。**這是你第一次在實機看到 app**。
> ⚠️ 這是本 sprint **最後一次能用 Expo Go** —— Task 3 加 `@react-native-firebase` 後就必須改用 dev build。

- [ ] **Step 4：Commit**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
git add apps/mobile/App.tsx
git commit -m "feat(mobile): render shared-package sanity check (Expo Go first-light)"
```

---

## Task 3：🚦 GO/NO-GO — `@react-native-firebase` 在 iOS Simulator 初始化

**Files:**
- Modify: `apps/mobile/package.json`（透過 `expo install`）
- Modify: `apps/mobile/app.config.ts`（plugins + `ios.googleServicesFile`）
- Modify: `apps/mobile/App.tsx`（Firebase init check）

> **整個 MVP 的生死點。** 加 native module 後 **不能再用 Expo Go**，改用本地 dev build。若此 Task 卡關 >1 週 → **Plan B**：退回 Firebase JS SDK（純 JS、可跑 Expo Go），並補一份 ADR 記錄逆轉（見 spec「Open items / ADR」、planning doc §13.3）。

- [ ] **Step 1：安裝 RNFB + expo-build-properties（版本由 expo install 自動鎖 SDK 54）**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile
npx expo install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore expo-build-properties
```
Expected: 安裝成功；`@react-native-firebase/app` 帶 config plugin。

- [ ] **Step 2：確認 plist 在位**

```bash
ls /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile/.secrets/GoogleService-Info.plist
```
Expected: 檔案存在（gitignored）。不存在 → 從 `AssetAnchor_old` 複製（§14.2）。

- [ ] **Step 3：在 app.config.ts 加 plugins + 指向 plist**

編輯 `apps/mobile/app.config.ts`，把 `ios` 與 `plugins` 改為：
```typescript
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.seanwangys.assetanchor',
    googleServicesFile: './.secrets/GoogleService-Info.plist',
  },
  plugins: [
    '@react-native-firebase/app',
    [
      'expo-build-properties',
      {
        // RNFB iOS 需要 static frameworks
        ios: { useFrameworks: 'static' },
      },
    ],
  ],
```

- [ ] **Step 4：prebuild 生成 native 專案（CNG）**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile
npx expo prebuild --platform ios --clean
```
Expected: 生成 `apps/mobile/ios/`（gitignored）、CocoaPods 安裝、`useFrameworks: static` 套用。若 Pod install 失敗，多半是 CocoaPods 版本問題 → `sudo gem install cocoapods` 後重跑。

- [ ] **Step 5：在 App.tsx 加 Firebase init check**

`apps/mobile/App.tsx`（在 sanity 畫面加一行讀 Firebase app name）：
```tsx
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { Money } from '@assetanchor/shared';
import { getApp } from '@react-native-firebase/app';

export default function App() {
  const sanity = Money.zero('TWD').toDisplayString();
  const firebaseApp = getApp().name; // '[DEFAULT]' 代表 native 初始化成功
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AssetAnchor</Text>
      <Text>shared OK → {sanity}</Text>
      <Text>firebase OK → {firebaseApp}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '600' },
});
```
> 若安裝到 RNFB v22+ 對 `getApp` 以外的 namespaced API 出現 deprecation warning，後續 Task 改用 modular API（`getAuth`/`getFirestore`，見 RNFB 官方 docs）。本 plan 預設用 namespaced（`auth()`/`firestore()`），warning 不影響功能。

- [ ] **Step 6：build + 跑 iOS Simulator（dev build）**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile
npx expo run:ios
```
Expected: 首次編譯數分鐘 → Simulator 啟動 dev build → 畫面顯示 `firebase OK → [DEFAULT]`，**無 crash**。

- [ ] **Step 7：🚦 GO / NO-GO 判定**

- **GO**（看到 `firebase OK → [DEFAULT]`、無 crash）→ RNFB native 整合成功，繼續 Task 4。
- **NO-GO**（build 失敗或 native crash，且卡 >1 週無解）→ 啟動 **Plan B**：
  1. 補一份 `docs/adr/0007-firebase-js-sdk-fallback.md`（記錄逆轉、原因、影響）。
  2. 改裝 `firebase`（JS SDK），auth/firestore API 改用 JS SDK 寫法（可跑 Expo Go，省 native build）。
  3. 通知使用者技術選型重訪。

- [ ] **Step 8：Commit**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
git add apps/mobile/package.json apps/mobile/app.config.ts apps/mobile/App.tsx pnpm-lock.yaml
git commit -m "feat(mobile): integrate @react-native-firebase (go/no-go: native init on iOS Simulator)"
```

---

## Task 4：Firebase service + Auth 邏輯層（authErrors TDD / authService / authStore）

**Files:**
- Create: `apps/mobile/src/services/firebase/index.ts`
- Create: `apps/mobile/src/features/auth/authErrors.ts`
- Create: `apps/mobile/src/features/auth/authErrors.test.ts`
- Create: `apps/mobile/src/features/auth/authService.ts`
- Create: `apps/mobile/src/features/auth/authStore.ts`
- Modify: `apps/mobile/package.json`（jest-expo + zustand）
- Create: `apps/mobile/jest.config.ts`

> 本 sprint 唯一能做有意義單元測試的純函式是 `authErrors`（無外部依賴）→ 走 TDD。authService 包 RNFB native 呼叫、不做單元測試。

- [ ] **Step 1：安裝 zustand + jest-expo**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile
npx expo install zustand
npx expo install -- --save-dev jest-expo jest @types/jest
```
Expected: 安裝成功。

- [ ] **Step 2：設定 mobile 的 jest（只跑純邏輯，不跑元件）**

`apps/mobile/jest.config.ts`：
```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
};

export default config;
```
把 `apps/mobile/package.json` 的 `test` script 改為：
```json
"test": "jest"
```

- [ ] **Step 3：寫 authErrors 失敗測試（TDD）**

`apps/mobile/src/features/auth/authErrors.test.ts`：
```typescript
import { authErrorMessage } from './authErrors';

describe('authErrorMessage', () => {
  it('maps known auth codes to zh-TW messages', () => {
    expect(authErrorMessage('auth/wrong-password')).toBe('Email 或密碼錯誤。');
    expect(authErrorMessage('auth/email-already-in-use')).toBe('此 Email 已被註冊。');
    expect(authErrorMessage('auth/weak-password')).toBe('密碼強度不足（至少 6 碼）。');
  });

  it('falls back with the raw code for unknown errors', () => {
    expect(authErrorMessage('auth/brand-new-code')).toContain('auth/brand-new-code');
  });
});
```

- [ ] **Step 4：跑測試確認失敗**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile
pnpm test
```
Expected: FAIL — `Cannot find module './authErrors'`。

- [ ] **Step 5：實作 authErrors 讓測試綠**

`apps/mobile/src/features/auth/authErrors.ts`：
```typescript
/** Firebase Auth error code → 友善繁中訊息（zh-TW hard-code，§2 i18n 決策）。 */
export function authErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Email 格式不正確。';
    case 'auth/user-disabled':
      return '此帳號已被停用。';
    case 'auth/user-not-found':
      return '查無此帳號。';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email 或密碼錯誤。';
    case 'auth/email-already-in-use':
      return '此 Email 已被註冊。';
    case 'auth/weak-password':
      return '密碼強度不足（至少 6 碼）。';
    case 'auth/network-request-failed':
      return '網路連線失敗，請稍後再試。';
    case 'auth/too-many-requests':
      return '嘗試次數過多，請稍後再試。';
    default:
      return `登入發生問題（${code}）。`;
  }
}
```

- [ ] **Step 6：跑測試確認綠**

```bash
pnpm test
```
Expected: PASS（4 個 assertion）。

- [ ] **Step 7：寫 firebase service（auth/firestore singleton + emulator 切換）**

`apps/mobile/src/services/firebase/index.ts`：
```typescript
import authModule from '@react-native-firebase/auth';
import firestoreModule from '@react-native-firebase/firestore';

export const auth = authModule;
export const firestore = firestoreModule;

const USE_EMULATOR = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
let wired = false;

/** dev 時把 app 指向本地 Firebase Emulator Suite（≈ LocalStack）。在 App 啟動時呼叫一次。 */
export function wireEmulatorsOnce(): void {
  if (!USE_EMULATOR || wired) return;
  auth().useEmulator('http://localhost:9099');
  firestore().useEmulator('localhost', 8080);
  wired = true;
}
```

- [ ] **Step 8：寫 `.env.example`（emulator 切換）**

`apps/mobile/.env.example`：
```
# 設 true → app 連本地 Firebase Emulator Suite；正式裝置/demo 設 false 或不設
EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true
```
> `.env*` 已被 root `.gitignore` 排除；只有 `.env.example` 進版控。

- [ ] **Step 9：寫 authService（包 RNFB 呼叫，回傳已 normalize 的結果）**

`apps/mobile/src/features/auth/authService.ts`：
```typescript
import { auth } from '../../services/firebase';
import { authErrorMessage } from './authErrors';

export interface AuthResult {
  ok: boolean;
  errorMessage?: string;
}

function toResult(e: unknown): AuthResult {
  const code = (e as { code?: string }).code ?? 'auth/unknown';
  return { ok: false, errorMessage: authErrorMessage(code) };
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    await auth().createUserWithEmailAndPassword(email, password);
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    await auth().signInWithEmailAndPassword(email, password);
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  try {
    await auth().sendPasswordResetEmail(email);
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function signOut(): Promise<void> {
  await auth().signOut();
}
```

- [ ] **Step 10：寫 authStore（Zustand，狀態三態）**

`apps/mobile/src/features/auth/authStore.ts`：
```typescript
import { create } from 'zustand';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

type AuthUser = FirebaseAuthTypes.User | null;

interface AuthState {
  user: AuthUser;
  status: 'loading' | 'ready';
  setUser: (user: AuthUser) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',
  setUser: (user) => set({ user, status: 'ready' }),
}));
```

- [ ] **Step 11：typecheck + 測試**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile
pnpm typecheck && pnpm test
```
Expected: typecheck 0 errors；authErrors 測試綠。

- [ ] **Step 12：Commit**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
git add apps/mobile/src apps/mobile/jest.config.ts apps/mobile/package.json apps/mobile/.env.example pnpm-lock.yaml
git commit -m "feat(mobile): firebase service + auth logic layer (authErrors TDD, authService, authStore)"
```

---

## Task 5：導航骨架 + conditional auth + MainTabs 空殼 + App 接線

**Files:**
- Modify: `apps/mobile/package.json`（nav deps）
- Create: `apps/mobile/src/core/navigation/{types.ts,RootNavigator.tsx,AuthStack.tsx,MainTabs.tsx}`
- Create: `apps/mobile/src/features/{holdings/HoldingsScreen,transactions/TransactionsScreen,accounts/AccountsScreen,settings/SettingsScreen}.tsx`
- Create（stub，Task 6 填內容）：`apps/mobile/src/features/auth/screens/{SignInScreen,SignUpScreen,ForgotPasswordScreen}.tsx`
- Modify: `apps/mobile/App.tsx`（onAuthStateChanged → authStore → RootNavigator）

- [ ] **Step 1：安裝 React Navigation v7 + 依賴**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
```

- [ ] **Step 2：導航型別**

`apps/mobile/src/core/navigation/types.ts`：
```typescript
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export type MainTabsParamList = {
  Holdings: undefined;
  Transactions: undefined;
  Accounts: undefined;
  Settings: undefined;
};

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;
export type MainTabsScreenProps<T extends keyof MainTabsParamList> = BottomTabScreenProps<
  MainTabsParamList,
  T
>;
```

- [ ] **Step 3：4 個 feature 空殼（持倉/交易/帳戶；設定含登出）**

`apps/mobile/src/features/holdings/HoldingsScreen.tsx`：
```tsx
import { StyleSheet, Text, View } from 'react-native';

export default function HoldingsScreen() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>持倉</Text>
      <Text>Sprint 3 填入</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  t: { fontSize: 20, fontWeight: '600' },
});
```

`apps/mobile/src/features/transactions/TransactionsScreen.tsx`（同結構，標題「交易」、副標「Sprint 3 填入」）、
`apps/mobile/src/features/accounts/AccountsScreen.tsx`（標題「帳戶」、副標「Sprint 2 填入」）。

`apps/mobile/src/features/settings/SettingsScreen.tsx`（含登出鈕）：
```tsx
import { Button, StyleSheet, Text, View } from 'react-native';
import { signOut } from '../auth/authService';

export default function SettingsScreen() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>設定</Text>
      <Button
        title="登出"
        onPress={() => {
          void signOut();
        }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  t: { fontSize: 20, fontWeight: '600' },
});
```

- [ ] **Step 4：auth 畫面 stub（Task 6 換成真表單，先讓導航編得過）**

三個檔同結構，以 SignIn 為例 `apps/mobile/src/features/auth/screens/SignInScreen.tsx`：
```tsx
import { StyleSheet, Text, View } from 'react-native';

export default function SignInScreen() {
  return (
    <View style={styles.c}>
      <Text>登入畫面（Task 6 填入）</Text>
    </View>
  );
}
const styles = StyleSheet.create({ c: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
```
`SignUpScreen.tsx`、`ForgotPasswordScreen.tsx` 同樣 stub（文字分別為「註冊畫面」「忘記密碼畫面」）。

- [ ] **Step 5：MainTabs（Bottom Tabs ×4）**

`apps/mobile/src/core/navigation/MainTabs.tsx`：
```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabsParamList } from './types';
import HoldingsScreen from '../../features/holdings/HoldingsScreen';
import TransactionsScreen from '../../features/transactions/TransactionsScreen';
import AccountsScreen from '../../features/accounts/AccountsScreen';
import SettingsScreen from '../../features/settings/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Holdings" component={HoldingsScreen} options={{ title: '持倉' }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ title: '交易' }} />
      <Tab.Screen name="Accounts" component={AccountsScreen} options={{ title: '帳戶' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '設定' }} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 6：AuthStack**

`apps/mobile/src/core/navigation/AuthStack.tsx`：
```tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import SignInScreen from '../../features/auth/screens/SignInScreen';
import SignUpScreen from '../../features/auth/screens/SignUpScreen';
import ForgotPasswordScreen from '../../features/auth/screens/ForgotPasswordScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: '登入' }} />
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: '註冊' }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: '忘記密碼' }} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 7：RootNavigator（conditional render + loading gate，§11.5）**

`apps/mobile/src/core/navigation/RootNavigator.tsx`：
```tsx
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../../features/auth/authStore';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';

export default function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <NavigationContainer>{user ? <MainTabs /> : <AuthStack />}</NavigationContainer>;
}
```

- [ ] **Step 8：App.tsx 接 onAuthStateChanged（取代 Task 3 的 sanity 版）**

`apps/mobile/App.tsx`（整檔替換）：
```tsx
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { auth, wireEmulatorsOnce } from './src/services/firebase';
import { useAuthStore } from './src/features/auth/authStore';
import RootNavigator from './src/core/navigation/RootNavigator';

export default function App() {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    wireEmulatorsOnce();
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, [setUser]);

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 9：typecheck + 重建 dev client（加了 native deps）並在 Simulator 驗證**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile
pnpm typecheck
npx expo run:ios
```
Expected: 短暫 loading spinner → 因未登入，顯示 **AuthStack 的「登入畫面（Task 6 填入）」stub**。證明 conditional render + loading gate 正常（onAuthStateChanged 回 null）。

- [ ] **Step 10：Commit**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
git add apps/mobile/src apps/mobile/App.tsx apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat(mobile): navigation skeleton + conditional auth navigator + empty MainTabs"
```

---

## Task 6：Email/密碼 Auth 畫面（接 authService）

**Files:**
- Modify: `apps/mobile/src/features/auth/screens/{SignInScreen,SignUpScreen,ForgotPasswordScreen}.tsx`

> 成功登入/註冊**不需手動 navigate** —— `onAuthStateChanged`（Task 5 App.tsx）會自動把 RootNavigator 切到 MainTabs。

- [ ] **Step 1：SignInScreen（真表單）**

`apps/mobile/src/features/auth/screens/SignInScreen.tsx`（整檔替換 stub）：
```tsx
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AuthStackScreenProps } from '../../../core/navigation/types';
import { signInWithEmail } from '../authService';

export default function SignInScreen({ navigation }: AuthStackScreenProps<'SignIn'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSignIn() {
    setBusy(true);
    setError(null);
    const res = await signInWithEmail(email.trim(), password);
    setBusy(false);
    if (!res.ok) setError(res.errorMessage ?? '登入失敗');
  }

  return (
    <View style={styles.c}>
      <Text style={styles.h}>登入</Text>
      <TextInput
        style={styles.in}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.in}
        placeholder="密碼"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.err}>{error}</Text>}
      <Button title={busy ? '登入中…' : '登入'} onPress={onSignIn} disabled={busy} />
      <Button title="還沒有帳號？註冊" onPress={() => navigation.navigate('SignUp')} />
      <Button title="忘記密碼" onPress={() => navigation.navigate('ForgotPassword')} />
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  h: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  in: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  err: { color: 'red' },
});
```

- [ ] **Step 2：SignUpScreen（真表單）**

`apps/mobile/src/features/auth/screens/SignUpScreen.tsx`（整檔替換 stub）：
```tsx
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AuthStackScreenProps } from '../../../core/navigation/types';
import { signUpWithEmail } from '../authService';

export default function SignUpScreen({ navigation }: AuthStackScreenProps<'SignUp'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSignUp() {
    setBusy(true);
    setError(null);
    const res = await signUpWithEmail(email.trim(), password);
    setBusy(false);
    if (!res.ok) setError(res.errorMessage ?? '註冊失敗');
    // 成功 → onAuthStateChanged 自動切 MainTabs；users/{uid} 由 Task 7 寫入
  }

  return (
    <View style={styles.c}>
      <Text style={styles.h}>註冊</Text>
      <TextInput
        style={styles.in}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.in}
        placeholder="密碼（至少 6 碼）"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.err}>{error}</Text>}
      <Button title={busy ? '註冊中…' : '註冊'} onPress={onSignUp} disabled={busy} />
      <Button title="已有帳號？回登入" onPress={() => navigation.goBack()} />
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  h: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  in: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  err: { color: 'red' },
});
```

- [ ] **Step 3：ForgotPasswordScreen（真表單）**

`apps/mobile/src/features/auth/screens/ForgotPasswordScreen.tsx`（整檔替換 stub）：
```tsx
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AuthStackScreenProps } from '../../../core/navigation/types';
import { sendPasswordReset } from '../authService';

export default function ForgotPasswordScreen({ navigation }: AuthStackScreenProps<'ForgotPassword'>) {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onReset() {
    setBusy(true);
    setMsg(null);
    const res = await sendPasswordReset(email.trim());
    setBusy(false);
    setMsg(res.ok ? '重設密碼信已寄出，請查收。' : (res.errorMessage ?? '寄送失敗'));
  }

  return (
    <View style={styles.c}>
      <Text style={styles.h}>忘記密碼</Text>
      <TextInput
        style={styles.in}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      {msg && <Text>{msg}</Text>}
      <Button title={busy ? '寄送中…' : '寄送重設信'} onPress={onReset} disabled={busy} />
      <Button title="回登入" onPress={() => navigation.goBack()} />
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  h: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  in: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
});
```

- [ ] **Step 4：在 Simulator + Emulator 驗證 Email/密碼流程**

開兩個終端：
```bash
# 終端 A：啟動 Firebase Emulator（見 Task 10 會設好 firebase.json emulators；此步可先用 auth+firestore）
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/firebase
firebase emulators:start --only auth,firestore

# 終端 B：app 指向 emulator 跑起來（.env 設 EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true）
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile
pnpm typecheck && pnpm start   # dev client 已建，按 i 開 Simulator
```
Expected：註冊一個 Email/密碼帳號 → 自動切到 MainTabs（持倉 tab）；到設定 tab 按登出 → 切回登入畫面；用同帳號登入 → 回 MainTabs；錯誤密碼 → 顯示「Email 或密碼錯誤。」。Emulator UI（http://localhost:4000）看得到該 user。

- [ ] **Step 5：Commit**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
git add apps/mobile/src/features/auth/screens
git commit -m "feat(mobile): email/password auth screens (sign in / sign up / forgot password)"
```

---

## Task 7：Hello Firestore rail（`users/{uid}` 寫入 + 讀回）

**Files:**
- Create: `apps/mobile/src/features/auth/userDoc.ts`
- Modify: `apps/mobile/src/features/auth/authService.ts`（註冊後建 userDoc）
- Modify: `apps/mobile/src/features/holdings/HoldingsScreen.tsx`（讀回 userDoc 證明 rail）

> 目標：證明 auth → firestore → shared 型別 → security rules 端到端通。用 shared 的 `UserDocument` 型別。

- [ ] **Step 1：userDoc service（建立 / 讀取）**

`apps/mobile/src/features/auth/userDoc.ts`：
```typescript
import { auth, firestore } from '../../services/firebase';
import type { UserDocument } from '@assetanchor/shared';

/** 註冊後建立 users/{uid}（已存在則略過）。created_at/updated_at 用 serverTimestamp。 */
export async function createUserDocIfMissing(): Promise<void> {
  const current = auth().currentUser;
  if (!current) return;
  const ref = firestore().collection('users').doc(current.uid);
  const snap = await ref.get();
  if (snap.exists) return;
  await ref.set({
    uid: current.uid,
    email: current.email ?? '',
    display_name: current.displayName ?? '',
    preferred_display_currency: 'TWD',
    preferred_locale: 'zh-TW',
    settings: { theme: 'auto', default_account_id: null },
    created_at: firestore.FieldValue.serverTimestamp(),
    updated_at: firestore.FieldValue.serverTimestamp(),
  });
}

/** 讀回目前使用者的 users/{uid}（boundary 處 narrow 成 shared 型別）。 */
export async function getUserDoc(): Promise<UserDocument | null> {
  const current = auth().currentUser;
  if (!current) return null;
  const snap = await firestore().collection('users').doc(current.uid).get();
  return snap.exists ? (snap.data() as UserDocument) : null;
}
```
> 型別 boundary：寫入用 `serverTimestamp()` sentinel，讀回時 Firestore 回 Timestamp（結構符合 shared `FirestoreTimestamp`）。`as UserDocument` 是 §6 註明的 boundary narrow。

- [ ] **Step 2：註冊成功後建立 userDoc（非致命）**

修改 `apps/mobile/src/features/auth/authService.ts` —— 頂部加 import，`signUpWithEmail` 內建 doc：
```typescript
import { createUserDocIfMissing } from './userDoc';
```
把 `signUpWithEmail` 改為：
```typescript
export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    await auth().createUserWithEmailAndPassword(email, password);
    try {
      await createUserDocIfMissing();
    } catch {
      // 非致命：rail doc 失敗不阻斷註冊，可日後補建
    }
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}
```

- [ ] **Step 3：HoldingsScreen 讀回 userDoc（證明 rail）**

`apps/mobile/src/features/holdings/HoldingsScreen.tsx`（整檔替換）：
```tsx
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getUserDoc } from '../auth/userDoc';

export default function HoldingsScreen() {
  const [railEmail, setRailEmail] = useState<string>('讀取中…');

  useEffect(() => {
    getUserDoc().then((d) => setRailEmail(d ? `rail OK → ${d.email}` : '（查無 user doc）'));
  }, []);

  return (
    <View style={styles.c}>
      <Text style={styles.t}>持倉</Text>
      <Text>{railEmail}</Text>
      <Text>Sprint 3 填入持倉清單</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  t: { fontSize: 20, fontWeight: '600' },
});
```

- [ ] **Step 4：驗證（emulator）**

```bash
# 終端 A：emulator（auth+firestore）
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/firebase && firebase emulators:start --only auth,firestore
# 終端 B：app（EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true）
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile && pnpm typecheck && pnpm start  # i 開 Simulator
```
Expected：用新 Email 註冊 → 切到 MainTabs/持倉 → 顯示 `rail OK → <你的 email>`。Emulator UI（http://localhost:4000）的 Firestore 看得到 `users/{uid}` doc，欄位符合 `UserDocument`。

- [ ] **Step 5：Commit**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
git add apps/mobile/src/features/auth/userDoc.ts apps/mobile/src/features/auth/authService.ts apps/mobile/src/features/holdings/HoldingsScreen.tsx
git commit -m "feat(mobile): hello firestore rail — create + read users/{uid} on signup"
```

---

## Task 8：Google Sign-In（你交代必補）

**Files:**
- Modify: `apps/mobile/package.json`（google-signin）
- Modify: `apps/mobile/app.config.ts`（google-signin config plugin + `iosUrlScheme`）
- Modify: `apps/mobile/App.tsx`（`GoogleSignin.configure`）
- Modify: `apps/mobile/src/features/auth/authService.ts`（`signInWithGoogle`）
- Modify: `apps/mobile/src/features/auth/screens/SignInScreen.tsx`（Google 按鈕）

- [ ] **Step 1：安裝 google-signin**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile
npx expo install @react-native-google-signin/google-signin
```

- [ ] **Step 2：從 plist 取 `REVERSED_CLIENT_ID`**

```bash
grep -A1 REVERSED_CLIENT_ID /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile/.secrets/GoogleService-Info.plist
```
Expected：印出 `com.googleusercontent.apps.XXXXXX----`。複製該值（下一步當 `iosUrlScheme`）。

- [ ] **Step 3：app.config.ts 加 google-signin plugin**

把 `apps/mobile/app.config.ts` 的 `plugins` 改為（用上一步取得的值取代 `<REVERSED_CLIENT_ID>`）：
```typescript
  plugins: [
    '@react-native-firebase/app',
    [
      'expo-build-properties',
      {
        ios: { useFrameworks: 'static' },
      },
    ],
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme: '<REVERSED_CLIENT_ID>',
      },
    ],
  ],
```

- [ ] **Step 4：App.tsx 設定 GoogleSignin（webClientId 自動從 Firebase 設定讀）**

在 `apps/mobile/App.tsx` 的 import 後、`export default` 前加一次性設定，並在 useEffect 之外（模組層）呼叫一次即可。修改 App.tsx：
```tsx
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth, wireEmulatorsOnce } from './src/services/firebase';
import { useAuthStore } from './src/features/auth/authStore';
import RootNavigator from './src/core/navigation/RootNavigator';

GoogleSignin.configure({ webClientId: 'autoDetect' }); // 從 GoogleService-Info.plist 自動偵測

export default function App() {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    wireEmulatorsOnce();
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, [setUser]);

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 5：authService 加 signInWithGoogle**

在 `apps/mobile/src/features/auth/authService.ts` 加 import 與函式：
```typescript
import authMod from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
```
```typescript
export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();
    const idToken = result.data?.idToken;
    if (!idToken) {
      return { ok: false, errorMessage: '未取得 Google idToken。' };
    }
    const credential = authMod.GoogleAuthProvider.credential(idToken);
    await auth().signInWithCredential(credential);
    try {
      await createUserDocIfMissing();
    } catch {
      // 非致命
    }
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}
```

- [ ] **Step 6：SignInScreen 加 Google 按鈕**

在 `apps/mobile/src/features/auth/screens/SignInScreen.tsx`：import 加 `signInWithGoogle`，並在「忘記密碼」按鈕後加：
```tsx
import { signInWithEmail, signInWithGoogle } from '../authService';
```
```tsx
      <Button
        title="用 Google 登入"
        onPress={async () => {
          setBusy(true);
          setError(null);
          const res = await signInWithGoogle();
          setBusy(false);
          if (!res.ok) setError(res.errorMessage ?? 'Google 登入失敗');
        }}
        disabled={busy}
      />
```

- [ ] **Step 7：prebuild + 重建 dev client（native plugin 變更）+ 驗證**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile
npx expo prebuild --platform ios --clean
npx expo run:ios
```
Expected：登入畫面出現「用 Google 登入」→ 點擊跳原生 Google 流程 → 成功後自動切 MainTabs；`users/{uid}` 一樣建立。
> 注意：Google 登入測試建議連**正式 Firebase**（emulator 對 Google credential 支援有限）→ 暫時把 `.env` 的 `EXPO_PUBLIC_USE_FIREBASE_EMULATOR` 設 false 測這段。

- [ ] **Step 8：Commit**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
git add apps/mobile/app.config.ts apps/mobile/App.tsx apps/mobile/src/features/auth/authService.ts apps/mobile/src/features/auth/screens/SignInScreen.tsx apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat(mobile): google sign-in via @react-native-google-signin + firebase credential"
```

---

## Task 9：實機 dev build（demo 驗收）

**Files:**
- Create: `apps/mobile/eas.json`

> 路線決策：**免費 Apple ID 走本地 `expo run:ios --device`（7 天簽章、不需付費會員）**為預設；若你已有/願買付費會員，可改走 EAS 雲端 build。

- [ ] **Step 1：建立 eas.json（dev/preview/production profile）**

`apps/mobile/eas.json`：
```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "preview": { "distribution": "internal" },
    "production": { "autoIncrement": true }
  },
  "submit": { "production": {} }
}
```

- [ ] **Step 2A（預設・免費）：本地實機 build**

把 iPhone 用線接上 Mac、解鎖、信任此電腦。`.env` 設 `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=false`（實機連正式 Firebase `assetanchor-832df`）：
```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile
npx expo run:ios --device
```
選你的 iPhone。首次需在 Xcode 用免費 Apple ID 設 signing team（會跳提示），iPhone「設定 → 一般 → VPN與裝置管理」信任開發者憑證。

- [ ] **Step 2B（替代・付費會員）：EAS 雲端 dev build**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile
npx eas-cli login
npx eas-cli build --profile development --platform ios
# 完成後掃 QR 安裝到已註冊裝置
```

- [ ] **Step 3：實機 demo 驗收**

在 iPhone 上：註冊新帳號 → 自動進 MainTabs/持倉（顯示 rail OK）→ 設定 tab 登出 → 回登入 → Email 登入 → 回 MainTabs → 再試 Google 登入。
Expected：註冊/登入/登出全程 work、切換 MainTabs 正常。**這是 demo 驗收。**

- [ ] **Step 4：Commit**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
git add apps/mobile/eas.json
git commit -m "chore(mobile): add eas.json build profiles for dev/preview/production"
```

---

## Task 10：Firestore rules emulator 測試（§13.4 強制 exit gate）

**Files:**
- Modify: `pnpm-workspace.yaml`（加入 `firebase` workspace）
- Modify: `firebase/firebase.json`（加 emulators 設定）
- Create: `firebase/package.json`
- Create: `firebase/jest.config.ts`
- Create: `firebase/tests/firestore.rules.test.ts`

> 驗證 §7 四條規則 + user 隔離。需 Firebase CLI（Sprint 0 已裝）+ **Java**（emulator 需要；沒裝 → `brew install temurin` 或裝 JDK）。
> 注意：此測試 **不掛進 `pnpm -r test`/CI**（emulator 需 Java，basic CI 沒有）—— firebase workspace 用 `test:rules` script，`pnpm -r test` 因無 `test` script 自動略過。CI 整合留作後續。

- [ ] **Step 1：把 firebase 納入 workspace**

`pnpm-workspace.yaml`（加一行）：
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'firebase'
```

- [ ] **Step 2：firebase/package.json**

`firebase/package.json`：
```json
{
  "name": "@assetanchor/firebase",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "test:rules": "firebase emulators:exec --only firestore \"jest\""
  }
}
```

- [ ] **Step 3：裝 rules 測試依賴**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
pnpm --filter @assetanchor/firebase add -D @firebase/rules-unit-testing firebase jest ts-jest typescript @types/jest @types/node
```
Expected：依賴裝入 `firebase` workspace（版本由 pnpm 解析當前相容版）。

- [ ] **Step 4：firebase/jest.config.ts**

`firebase/jest.config.ts`：
```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
};

export default config;
```

- [ ] **Step 5：firebase.json 加 emulators**

編輯 `firebase/firebase.json`，在最外層物件加入 `emulators`（保留既有 `firestore` rules/indexes 設定）：
```json
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  }
```

- [ ] **Step 6：寫 rules 測試（驗證 §7 四規則 + 隔離）**

`firebase/tests/firestore.rules.test.ts`：
```typescript
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-assetanchor',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('users/{uid} 隔離（§7）', () => {
  it('使用者可讀寫自己的 doc', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), { uid: 'alice' }));
    await assertSucceeds(getDoc(doc(alice, 'users/alice')));
  });

  it('使用者不能讀別人的 doc', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertFails(getDoc(doc(alice, 'users/bob')));
  });

  it('未登入不能讀使用者 doc', async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'users/alice')));
  });

  it('使用者可寫自己的 subcollection', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(alice, 'users/alice/accounts/a1'), { account_id: 'a1' }));
  });
});

describe('全域 collection（§7）', () => {
  it('登入者可讀 exchange_rates、不能寫', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(alice, 'exchange_rates/2026-05-30')));
    await assertFails(setDoc(doc(alice, 'exchange_rates/2026-05-30'), { x: 1 }));
  });

  it('登入者可讀+建立 symbols、不能更新', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(alice, 'symbols/AAPL'), { symbol: 'AAPL' }));
    await assertFails(setDoc(doc(alice, 'symbols/AAPL'), { symbol: 'AAPL2' }));
  });

  it('登入者可讀 quotes、不能寫', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(alice, 'quotes/AAPL')));
    await assertFails(setDoc(doc(alice, 'quotes/AAPL'), { price: '1' }));
  });
});
```

- [ ] **Step 7：跑 rules 測試（emulator）**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
pnpm --filter @assetanchor/firebase test:rules
```
Expected：Firebase 啟 firestore emulator → jest 跑 → 7 個測試全綠 → emulator 收掉。若報 Java 缺失 → 先裝 JDK。

- [ ] **Step 8：確認既有 CI（pnpm -r test）不受影響**

```bash
pnpm install --frozen-lockfile && pnpm -r test
```
Expected：`firebase` workspace 因無 `test` script 被略過；packages/shared 76 tests 仍綠。

- [ ] **Step 9：Commit**

```bash
git add pnpm-workspace.yaml firebase/ pnpm-lock.yaml
git commit -m "test(firebase): firestore rules emulator tests (user isolation + global collections)"
```

---

## Sprint 1 Exit Gate（對齊 spec / §13.2）

- [ ] Task 0：Node 版本對齊、`apps/functions` engines 警告消除
- [ ] Task 2b：Expo Go first-light — 實體 iPhone 看到 app（加 Firebase 前）
- [ ] Task 3：iOS Simulator dev build 起得來、RNFB 初始化成功（go/no-go 過）
- [ ] Task 6：Email/密碼 註冊/登入/登出 work、conditional navigator 正常
- [ ] Task 7：`users/{uid}` doc 建立並讀回（hello firestore rail）
- [ ] Task 8：Google Sign-In 可登入
- [ ] Task 9：實機 build → 註冊/登入/登出 → MainTabs（demo 驗收）
- [ ] Task 10：Firestore rules emulator 測試綠燈（user 隔離 + §7 四規則）
- [ ] 4 個 MainTabs 空殼 render
- [ ] CI（`pnpm -r typecheck/lint/test`）仍綠、PR 合進 main

---

## Self-Review（writing-plans 自檢）

**1. Spec coverage**：spec goals/tasks 0–8 全有對應 plan task — Node reconcile→T0、scaffold→T1、Expo Go first-light→T2、go/no-go→T3、email auth→T4–6、firestore rail→T7、Google→T8、實機 demo→T9、rules 測試→T10。Dev loop & DX（emulator/Fast Refresh）落在 T4 step 7–8（`wireEmulatorsOnce`、`.env`）與 T6/T7 驗證步驟。✅ 無 gap。

**2. Placeholder scan**：版本一律用 `npx expo install`（自動鎖 SDK 相容版）非硬寫版本；唯一需人填的具體值是 `<REVERSED_CLIENT_ID>`（T8 step 2 已給取得指令）。無 TBD/「之後補」。✅

**3. Type consistency**：`AuthResult`（T4 定義）於 authService 全用；`useAuthStore` 的 `setUser`/`status`/`user`（T4）於 App.tsx（T5）、RootNavigator（T5）一致；`AuthStackParamList`/`MainTabsParamList`（T5 types.ts）於 AuthStack/MainTabs/screens props 一致；`createUserDocIfMissing`/`getUserDoc`（T7）於 authService、HoldingsScreen 一致；shared `UserDocument`（packages/shared）用於 userDoc。✅

> 已知風險（spec 已列）：RNFB namespaced vs modular API（v22+）—— 若安裝版本噴 deprecation，改用 modular（`getAuth`/`getFirestore`）。版本敏感點（Expo SDK、RNFB、nav、Node）由 `expo install` 與執行時官方文件校正。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-30-sprint-1-auth.md`. 兩種執行方式：

1. **Subagent-Driven（建議）** — 每個 task 派一個全新 subagent、task 間我做兩階段 review、迭代快。
2. **Inline Execution** — 在本 session 用 executing-plans 分批執行、checkpoint review。

> ⚠️ 注意：Task 3（go/no-go）、Task 9（實機 build）需要**你本機操作 Xcode/Simulator/實機與帳號互動**，subagent 無法代跑這些 GUI/裝置步驟 → 這幾步會停在你手動執行 + 回報結果。

**要用哪種執行方式？**（或你想先 review 整份 plan 再決定）
