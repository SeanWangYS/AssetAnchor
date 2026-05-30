# Expo App 整合進 pnpm Monorepo — 技術筆記

> **建立**：2026-05-30 ｜ **適用版本**：Expo SDK 54、**pnpm 9.12**
> **情境**：AssetAnchor Sprint 1 — 把 `apps/mobile` 從 placeholder 變成真正能跑的 Expo app，同時保持接在 monorepo 上（仍能用 `@assetanchor/shared`）。
> **來源**：Expo 官方 monorepo 指南（`docs/pages/guides/monorepos.mdx`）+ 學習對話整理 + 本機實測。
> ⚠️ **monorepo 行為與 SDK / pnpm 版本強相關**，跨大版本前先重查官方指南再套用。

---

## TL;DR

把官方產生器灌一個標準 Expo app 進 `apps/mobile`（Expo 會自動處理 monorepo）→ 加 `node-linker=hoisted` 讓打包器 Metro 在 pnpm 下不迷路 → 補回「共用 library + base TS」兩條接線。**不需要 temp-dir 搬檔儀式、不需手寫 Metro 設定（SDK 52+）。**

```bash
# 1. 官方產生器直接灌進 monorepo 子資料夾（Expo 自動偵測 monorepo）
pnpm create expo-app --template default@sdk-54 apps/mobile

# 2. 加 node-linker=hoisted（解 pnpm × Metro 的 symlink 痛點）
#    本專案 pnpm 9.12 → 寫在 .npmrc：  node-linker=hoisted
#    （pnpm 10+ 才改放 pnpm-workspace.yaml 的 nodeLinker: hoisted）

# 3. 補回兩條接線：
#    apps/mobile/package.json  → "@assetanchor/shared": "workspace:*"
#    apps/mobile/tsconfig.json → "extends": "../../tsconfig.base.json"（合併，不是覆蓋）

# 收尾：repo 根 pnpm install；用既有 sanityCheck()（import 了 Money）驗證接線成功
```

> ✅ **本機實測（2026-05-30, pnpm 9.12）**：`.npmrc` 寫 `node-linker=hoisted` → `pnpm config get node-linker` 回 `hoisted`、`decimal.js` hoist 到 root（node_modules 頂層 12→318）、`pnpm-lock.yaml` 不變、`pnpm install --frozen-lockfile` + `typecheck/lint/test` 全綠。

---

## 0. 名詞速查

| 名詞                  | 是什麼                                                                      | 熟悉領域類比（資料工程 / 後端）                             |
| --------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **breadcrumb**        | 前人在程式碼裡留的「線索註解」，提醒未來接手者要做/小心什麼                 | Airflow DAG 裡 `# TODO: 之後改 daily`、runbook 的提醒便利貼 |
| **React Native (RN)** | 用一份 JS/TS 程式碼 → 編成 iOS + Android 原生 app                           | 一份程式碼跑多個 target                                     |
| **Expo**              | 蓋在 RN 上的「電池全包」框架 + 工具鏈，自動處理 native 設定苦差事           | Django 之於 raw WSGI；managed 服務 vs 自架 EC2              |
| **`create-expo-app`** | Expo 官方專案產生器（scaffolder）                                           | `cdk init` / `django-admin startproject`                    |
| **monorepo**          | 一個 git repo 裝多個 app/package                                            | 一 repo 多 service + 共用 library                           |
| **pnpm workspace**    | 套件管理器，用 symlink 把共用 package 串給各 app                            | Python `pip install -e`（editable install）                 |
| **Metro**             | React Native 的 bundler（打包器）                                           | webpack / esbuild；解析依賴後打包成 artifact                |
| **node-linker**       | pnpm 安裝策略：`isolated`（預設、symlink）vs `hoisted`（攤平，像 npm/yarn） | 依賴是「editable symlink」還是「攤平 vendored」             |

> breadcrumb 活例：`apps/mobile/src/index.ts` 開頭那段 `// ⚠️ Sprint 1 NOTE: ...` 就是 Sprint 0 留給 Sprint 1 的便利貼。

---

## 1. 為什麼會「複雜」？根因：pnpm × Metro

複雜度**幾乎全來自 `pnpm` × `Metro` 的組合，不是 Expo 本身**：

1. **pnpm** 為了省空間，預設用 isolated（symlink）node_modules —— 一堆軟連結指來指去。
2. **Metro** 對 symlink 的解析歷史上有 bug，會找不到跨 workspace 的套件（→ `@assetanchor/shared` 解不到）。
3. 加上**舊 SDK（< 52）**還要手寫 `metro.config.js`。

三者疊起來才痛。換成 **npm / yarn classic 反而比較不痛** —— 是 pnpm 的「嚴格隔離」最容易踩 Metro 的雷。所以「複雜」是 pnpm 嚴格性的副作用，**不是 iOS 開發的本質難度**。

**現在（SDK 52+）已大幅簡化**：Expo 對 monorepo 是 first-class support，自動偵測並配置；pnpm 的 symlink 痛點用 `node-linker=hoisted` 解掉。

---

## 2. Before / After

**Before（Sprint 0 placeholder）**

```
apps/mobile/
├── package.json      # 有 "@assetanchor/shared: workspace:*" + scripts
├── tsconfig.json     # extends ../../tsconfig.base.json
└── src/index.ts      # sanityCheck() + breadcrumb
```

幾乎是空的，**真正有價值的只有兩條「接線」**：① 連共用 library 的依賴、② 繼承 repo base TS 設定。

**After（整合完成）**

```
.npmrc                     # 新增 node-linker=hoisted（pnpm 9.12）
apps/mobile/
├── package.json           # 全新 Expo 依賴 + 補回 @assetanchor/shared
├── tsconfig.json          # Expo RN 設定 + 接回 base config
├── app.json / app.config  # Expo app 設定
├── (App.tsx 或 app/)      # 真的能跑的 RN 範例畫面
└── ...                    # babel.config 等（SDK 54 通常不需手寫 metro.config.js）
```

---

## 3. 簡化版官方流程（3 步逐解）

### 步驟 1：跑官方產生器

```bash
pnpm create expo-app --template default@sdk-54 apps/mobile
```

- **白話**：用標準 TypeScript 範本（SDK 54），在 `apps/mobile` 生一個全新、跑得起來的 Expo app。
- **關鍵**：指向 monorepo 裡的 `apps/mobile` → Expo 偵測到「我在 pnpm workspace 裡」→ **自動配置成 monorepo 模式**（SDK 52+ 的魔法，免手寫 Metro 設定）。
- **代價**：產生器吐的 `package.json` / `tsconfig` 是「獨立版」，**不知道 monorepo**，那兩條接線會不見（步驟 3 補回）。
- **小 wrinkle**：資料夾現有 3 個 placeholder 檔，產生器要乾淨資料夾 → 先清掉 placeholder（不可惜，接線步驟 3 重加）。

### 步驟 2：加 `node-linker=hoisted`

- **解的問題**：pnpm 預設 symlink 迷宮 → Metro 迷路、找不到 `@assetanchor/shared`。
- **這設定做什麼**：叫 pnpm「改用扁平、老派裝法（像 npm/yarn 攤平）」→ Metro 找得到。
- **位置（依 pnpm 版本）**：**本專案 pnpm 9.12 → 寫在 `.npmrc`：`node-linker=hoisted`**（pnpm 10+ 才改放 `pnpm-workspace.yaml` 的 `nodeLinker: hoisted`）。已實測：pnpm 9.12 用 `.npmrc` 生效、`pnpm-lock.yaml` 不變、CI 仍綠。
- **代價**：依賴隔離性變鬆、多一點硬碟 → solo side project 無感，**且可逆**（拔掉就還原）。
- **注意**：**repo 範圍**設定（shared / functions / mobile 都受影響），風險低，既有套件照常運作（已實測 76 tests 全綠）。

### 步驟 3：補回兩條接線

產生器給的是「獨立版」package.json + tsconfig，所以我們手動加回：

- **(a)** `apps/mobile/package.json` 加回 `"@assetanchor/shared": "workspace:*"` —— `workspace:*` = 從 monorepo 內部拿，不去 npm 下載。
- **(b)** `apps/mobile/tsconfig.json` 接回 `"extends": "../../tsconfig.base.json"` —— **合併**（保留 Expo 的 RN 專屬設定，再疊上 base 的 strict 規則），不是覆蓋。

**收尾**：repo 根 `pnpm install` 把線接好 → 既有 `sanityCheck()`（import 了 `Money`）成為「接線成功」的活證明。

---

## 4. 三種整合方案比較（為何選簡化版）

| 方案                      | 做法                                                                          | 取捨                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **✅ 官方簡化版（採用）** | `create-expo-app` 直接灌進 `apps/mobile` + `node-linker=hoisted` + 補兩條接線 | 主流、最少手工、SDK 52+ 免手寫 Metro。**首選**                                            |
| temp-dir + 手動 merge     | 暫存夾生成 → 一件件搬進來                                                     | SDK 52 以前的保守做法；現在**降為 fallback**（萬一 in-place 生成跟 placeholder 衝突才用） |
| 完全手刻                  | 不用產生器，自己手寫 Expo 設定                                                | ≈ 不用 `cdk init` 從零手寫 → 易漏檔、跟不上 Expo 版本演進                                 |
| 現場覆蓋再還原            | 讓產生器覆蓋再 git checkout 還原                                              | 還原易漏，breadcrumb 明確警告別這樣                                                       |

---

## 5. 延伸：iOS build 與簽章（EAS / dev build / Expo Go）

> 這是「怎麼把 app 編出來、裝到裝置上」的相鄰主題，與 monorepo 整合分開但同屬 Sprint 1 scaffolding 知識。

**EAS = Expo Application Services**：Expo 官方的雲端 build / 簽章 / 發佈服務。`eas build` ≈ AWS CodeBuild（雲端把 RN 專案編成原生安裝檔）、`eas submit` ≈ 上架、`eas update` ≈ OTA 推 JS 更新（≈ 更新 Lambda 程式碼不動 infra）。

**dev build vs Expo Go**（關鍵區別）：

- **Expo Go**：Expo 提供的通用沙盒 app，只能跑純 JS、**不含自訂 native module**。≈ 大家共用的 generic runtime image。
- **dev build**：把 Expo dev client + 你的 native 套件（如 `@react-native-firebase`）**bake 進去**的自家執行檔。≈ 自建 AMI / container image。
- 用了 native module（RN-Firebase）→ Expo Go 裝不下 → **必須 dev build**。

**三條實機/模擬器路徑**：

| 路徑                                                | 需要                  | 跑在哪      | caveat                                          |
| --------------------------------------------------- | --------------------- | ----------- | ----------------------------------------------- |
| Simulator（`expo run:ios`）                         | 只要 Xcode            | 模擬器      | **不需任何 Apple 帳號**（最快驗 native 整合）   |
| 免費 Apple ID + 本地實機（`expo run:ios --device`） | Xcode + 免費 Apple ID | 實機 iPhone | 簽章 **7 天到期**、需重簽；無 push 等進階能力   |
| 付費會員 + EAS dev build                            | $99/年 + EAS          | 實機 iPhone | 簽章一年、可註冊多裝置、能 TestFlight；體驗最順 |

> Sprint 1 策略：**Simulator 先（go/no-go，免帳號）→ 實機後（demo）**。把「native 整合」與「實機簽章」兩種雷拆開 debug。

---

## 6. 複習要點（Cheat Sheet）

- 「複雜」的根因是 **pnpm symlink × Metro**，不是 Expo 或 iOS 本質難。
- **SDK 52+**：Expo 自動處理 monorepo，**免手寫 `metro.config.js`**。
- **pnpm 必加** `node-linker=hoisted`（本專案 pnpm 9.12 → `.npmrc`；pnpm 10+ → `pnpm-workspace.yaml` 的 `nodeLinker: hoisted`；repo 範圍、可逆）。
- 產生器吐獨立版設定 → **永遠記得補回**：`@assetanchor/shared: workspace:*` + tsconfig `extends` base。
- `workspace:*` = 從 monorepo 內部解析依賴。
- native module（RN-Firebase）→ 不能用 Expo Go → **必須 dev build**。
- 驗收下一步前，用既有 `sanityCheck()`（import Money）證明 shared library 接線成功。

---

## 參考

- Expo 官方 monorepo 指南：<https://docs.expo.dev/guides/monorepo/>（原始碼 `expo/expo` → `docs/pages/guides/monorepos.mdx`）
- 專案 breadcrumb：`apps/mobile/src/index.ts`
- 共用型別/Money：`packages/shared/src/`
- 本專案 node-linker 設定：`.npmrc`
