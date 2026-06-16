## Why

設定頁的「個人資料」與「顯示偏好」兩個子頁目前是 **UI-only 示意**：ProfileScreen 的「儲存」只彈 demo 字、DisplayPrefsScreen 的幣別切換僅 local state，重進畫面就重置（畫面上還掛著「尚未寫回 / 尚未持久化」的未完成註腳）。`users/{uid}` schema 早已預留 `display_name` 與 `preferred_display_currency` 欄位（planning §6），但 app 從未寫回。本 change 把這兩頁接上後端，讓使用者的身分與顯示幣別偏好真正落地、跨重啟保存——這是 planning §2.5「下一步主路線：profile + display-prefs 寫回後端」的近期小 change。

## What Changes

- **ProfileScreen 寫回**：「儲存」改為實際持久化 `display_name` 到 `users/{uid}.display_name` 與 Firebase Auth profile（`updateProfile({ displayName })`），並更新 `updated_at`；進畫面時由 user doc 載入現值（fallback 到 Auth `displayName`）；以真實 loading / disabled / 成功 / 失敗回饋取代「demo，尚未寫回」字樣。Email 維持唯讀（變更 email 屬 auth 流程，不在此範圍）。
- **DisplayPrefsScreen 寫回**：幣別（TWD/USD）切換改為持久化 `preferred_display_currency` 到 `users/{uid}`；值來自跨切面 `preferencesStore`（樂觀更新 + 失敗還原），畫面新增說明「套用於持倉總覽合計與分析頁預設」。**移除 dark-mode toggle**（owner 決定：app dark-first、無 light 主題，不需此開關）。
- **跨畫面套用 `preferred_display_currency`（本輪由 Sprint 6 提前）**：新增 app-wide `core/preferences` store，登入時由 `users/{uid}` 灌入、登出 reset。**持倉總覽「總成本」合計**改讀偏好（NT$↔US$、label/小數位隨之切；`currency-display` spec 本就要求用偏好，先前 code hardcode TWD）；**分析頁 TWD/USD 切換預設**改讀偏好（使用者仍可於頁內自行切換）。個股詳情頁按 spec 維持「預設原幣別」，不動。
- **服務層**：擴充 `apps/mobile/src/features/auth/userDoc.ts`，新增 `updateUserProfile` / `updateDisplayCurrency`，以 `serverTimestamp()` 寫 `updated_at`，僅以 modular API（v24）`updateDoc`。
- **shared 驗證純函式**：新增「待寫回欄位」的最小驗證純函式（trim 後 `display_name` 長度、currency 為合法顯示幣別），於 shared 以 TDD 撰寫並納 coverage gate。

## Capabilities

### New Capabilities

- `user-preferences`: 使用者個人資料（顯示名稱）與顯示偏好（`preferred_display_currency`）的**編輯與持久化**——從 `users/{uid}` 載入現值、驗證後寫回、回饋成功/失敗。涵蓋寫回的欄位驗證規則與 Firestore/Auth 寫入行為。

### Modified Capabilities

- `analysis`: 「分析頁 TWD/USD 全頁切換」的**預設值**由固定 `TWD` 改為**讀使用者顯示幣別偏好**（`preferred_display_currency`，缺值 fallback TWD）；切換行為本身不變、使用者仍可於頁內覆寫。

<!-- currency-display 不列入：其 requirement 早已規定持倉總覽合計用 preferred_display_currency；本 change 是讓 code 補回 spec（移除 hardcode TWD 常數），spec 文字不變。 -->

## Impact

- **程式碼**：`apps/mobile/src/features/settings/screens/ProfileScreen.tsx`、`DisplayPrefsScreen.tsx`（寫回 + 狀態回饋；DisplayPrefs 改源自 store、移除 dark-mode）；`apps/mobile/src/features/auth/userDoc.ts`（update helper）；`packages/shared/src/preferences/`（驗證純函式 + 型別 + 測試）；**`apps/mobile/src/core/preferences/`（新 app-wide store）**；`App.tsx`（登入 hydrate / 登出 reset）；`features/holdings/screens/HoldingsOverviewScreen.tsx`（總成本合計讀偏好）+ `holdingsDemo.ts`（移除 dead `DISPLAY_CURRENCY`）；`features/analysis/screens/AnalysisOverviewScreen.tsx`（切換預設讀偏好）。
- **Firestore schema**：**無變更**。僅寫入既有欄位 `display_name`、`preferred_display_currency`、`updated_at`（planning §6 已定義）。不觸發聖牛 gate。
- **Firestore rules**：**無變更**。`users/{userId}/**` 已是 owner read/write；既有 rules 測試須續綠。
- **Money/decimal**：無關（currency 為 enum 字串，非金額；ADR-0005 不適用）。
- **依賴**：無新增套件。
- **驗收 gate**：帶 UI 的 change → owner 本人 merge + owner 於 iOS Simulator 逐畫面視覺對圖（ADR-0008 / 憲法 #8）；archive 前需 owner 視覺對圖通過。

## Non-goals

本 change **不**做：

- **持倉總覽 Hero「總資產」與其他 mock 摘要切幣別**：那些是 demo 值（需 Sprint 5 報價才有真值），維持 TWD 示意；本輪只切**真實**的「總成本」合計。
- **個股詳情頁套偏好**：按 `currency-display` spec 預設顯示**原幣別**，不套偏好。
- **主題（`settings.theme`）**：dark-mode toggle 已**移除**（無 light 主題可切）；theme 持久化待 light 主題出現再議。
- **AboutScreen**：純資訊頁，無可持久化內容，不動。
- **變更 email / 密碼**：屬 auth 流程，本 change 不碰。
- **`preferred_locale` / `settings.default_account_id`**：本 change 不提供編輯入口（第二階段）。
- **偏好即時跨裝置同步**：採登入時一次性 hydrate（非 `onSnapshot`），單機 MVP 足夠。
