# 本地測試指南（Local Testing）

在 **iOS Simulator + Firebase 本地 Emulator** 上手動驗證（dogfood），以及跑自動化測試的指令。

## 前置需求

- Node 22（asdf，repo `.tool-versions` 已 pin）、`pnpm install` 已跑過
- Xcode + iOS Simulator
- Firebase CLI：`npm i -g firebase-tools`
- Java（Firestore emulator 依賴 JVM）
- `@react-native-firebase` 是 native module → 必須用 **`expo run:ios`** 原生 build，**不能用 Expo Go**。本 repo `apps/mobile/ios/` 已 prebuild。

---

## A. 手動驗證（Simulator + Emulator）

> 順序很重要：**先起 Emulator，再起 App**。App 啟動時才會連上本地 Emulator（`wireEmulatorsOnce`）。

### 1. 起 Firebase Emulator Suite（帶種子資料）（terminal 1）

```bash
pnpm --filter @assetanchor/firebase emulators
```

- Auth → `localhost:9099`、Firestore → `localhost:8080`、**Emulator UI → http://localhost:4000**（port 速查表見 `CLAUDE.md`「本地開發環境」）。
- ⚠️ 預設 `emulators` **不含 Cloud Functions**。需本地跑報價 / 匯率 / history（functions `localhost:5001`）時改用 `pnpm --filter @assetanchor/firebase emulators:fn`（起 auth + firestore + functions）。
- 用 `.firebaserc` 預設 project `assetanchor-832df`。
- 這個指令會做 **import/export**（從 `.emulator-data` 快照載入：1 測試帳號 + 4 帳戶 + 12 筆交易 + 匯率），關掉時把當前狀態存回，**資料會留存**。
- ⚠️ **別用裸的 `firebase emulators:start`**——那個是純 in-memory，關掉就清空，看不到種子資料。要持久化 + 載種子請務必用上面這個 `emulators` 指令。
- **重置 / 補種子**：資料若空掉或想回到乾淨狀態，**另開** terminal 跑 `pnpm --filter @assetanchor/firebase seed:emulator`（種子腳本：`firebase/scripts/seed-emulator.mjs`）。

**測試帳號**（種子資料附帶）：

| 項目        | 值                                  |
| ----------- | ----------------------------------- |
| 測試帳號    | `test@assetanchor.dev` / `test1234` |
| Emulator UI | http://localhost:4000               |

> ⚠️ 登入時**用這個測試帳號**，**不要用「略過登入」** —— 略過登入是另一個空 uid，看不到種子資料（它只適合純看 Auth 畫面）。

### 2. 起 mobile app 到 iOS Simulator（terminal 2）

```bash
pnpm --filter @assetanchor/mobile ios
```

- `apps/mobile/.env` 已設 `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true`，App 啟動會**自動連本地 Emulator**，無需額外設定。
- 第一次會編譯 native build（較久）；之後重跑很快。

### 3. 冒煙測試（sprint-agnostic：建帳戶 → 加一筆 BUY → 清單看到它）

> 這是不綁定特定 sprint 的基本 happy-path 冒煙測試，確認「登入 → 寫資料 → 讀回顯示」整條 rail 通。

1. 在 App 用測試帳號 **`test@assetanchor.dev` / `test1234`** 登入（或 Email / Password 自行註冊；Google 登入 runtime 驗證暫緩到 Apple Developer 通過後）。
2. 先到「**設定 → 帳戶管理**」建立一個啟用帳戶——交易必須掛在帳戶下，沒有帳戶時 AddTransaction 會提示先建帳戶。（用種子資料時已有 4 個帳戶，可直接用。）
3. 「**交易**」分頁右下 **FAB** → 填一筆 BUY（帳戶 / 代號 / 市場 / 資產類型 / 幣別 / 股數 / 單價 / 手續費 / 交易日）→ 送出。
4. 開 **Emulator UI（http://localhost:4000）** → Firestore → `users/{uid}/transactions/{id}`，確認欄位（單幣別 Model B / ADR-0005：只記市場原幣別，不存對稱 amounts map / 匯率）：
   - `currency` = 市場原幣別（台股 `"TWD"`、美股 `"USD"`）
   - `price` / `fee` / `tax` 為 10 位小數 string（canonical）
   - `total = price × quantity`（10 位小數 string，例：500 × 1000 → `"500000.0000000000"`）
   - `transaction_type = "BUY"`、`transaction_id` = doc id
5. 回 App「交易」分頁，清單即時顯示該筆（依交易日由新到舊）。
   🚦 看到這筆 = happy-path rail（登入 → 寫入 → 讀回）通。

---

## B. 自動化測試（不需 Simulator）

```bash
# shared 純函式 + coverage gate（≥90%）
pnpm --filter @assetanchor/shared test:coverage

# mobile 純邏輯 + path-glob coverage gate（只 gate 純邏輯檔）
pnpm --filter @assetanchor/mobile test:coverage

# Firestore rules：自動起 emulator 再跑 jest（需 Firebase CLI + Java）
pnpm --filter @assetanchor/firebase test:rules

# 全工作區檢查（= CI 內容）
pnpm -r typecheck && pnpm -r lint && pnpm exec prettier --check .
```

---

## 疑難排解

| 症狀                                   | 處理                                                                                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| App 連不上 Emulator                    | 確認 Emulator **先**啟動；`apps/mobile/.env` 的 `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true`；Simulator 用 `localhost`（不是真機 IP）。 |
| `firebase emulators:start` 失敗        | 確認已裝 Java（Firestore emulator 需要 JVM）、`firebase-tools` 已全域安裝。                                                         |
| 交易分頁 FAB 點了寫不進去 / 沒帳戶可選 | 先到「設定 → 帳戶管理」建立一個啟用帳戶（交易必須掛在帳戶下）。                                                                     |
| 改了 native 相關設定後行為怪異         | 重跑 `pnpm --filter @assetanchor/mobile ios` 重新 build。                                                                           |
| 真機測試連到哪？                       | emulator flag 僅 dev；真機 / EAS build 連**正式** Firebase（`assetanchor-832df`），不連 emulator。                                  |
