## Why

設定頁的「個人資料」與「顯示偏好」兩個子頁目前是 **UI-only 示意**：ProfileScreen 的「儲存」只彈 demo 字、DisplayPrefsScreen 的幣別切換僅 local state，重進畫面就重置（畫面上還掛著「尚未寫回 / 尚未持久化」的未完成註腳）。`users/{uid}` schema 早已預留 `display_name` 與 `preferred_display_currency` 欄位（planning §6），但 app 從未寫回。本 change 把這兩頁接上後端，讓使用者的身分與顯示幣別偏好真正落地、跨重啟保存——這是 planning §2.5「下一步主路線：profile + display-prefs 寫回後端」的近期小 change。

## What Changes

- **ProfileScreen 寫回**：「儲存」改為實際持久化 `display_name` 到 `users/{uid}.display_name` 與 Firebase Auth profile（`updateProfile({ displayName })`），並更新 `updated_at`；進畫面時由 user doc 載入現值（fallback 到 Auth `displayName`）；以真實 loading / disabled / 成功 / 失敗回饋取代「demo，尚未寫回」字樣。Email 維持唯讀（變更 email 屬 auth 流程，不在此範圍）。
- **DisplayPrefsScreen 寫回**：幣別（TWD/USD）切換改為持久化 `preferred_display_currency` 到 `users/{uid}`；進畫面時載入現值，使選擇跨重啟保存；移除 / 調整「尚未持久化」註腳。
- **服務層**：擴充 `apps/mobile/src/features/auth/userDoc.ts`，新增更新 helper（`updateUserProfile` / `updateDisplayPreferences`），以 `serverTimestamp()` 寫 `updated_at`，僅以 modular API（v24）`updateDoc`。
- **shared 驗證純函式**：新增「待寫回欄位」的最小驗證純函式（trim 後 `display_name` 長度、currency 為合法 enum），於 shared 以 TDD 撰寫並納 coverage gate。

## Capabilities

### New Capabilities

- `user-preferences`: 使用者個人資料（顯示名稱）與顯示偏好（`preferred_display_currency`）的**編輯與持久化**——從 `users/{uid}` 載入現值、驗證後寫回、回饋成功/失敗。涵蓋寫回的欄位驗證規則與 Firestore/Auth 寫入行為。

### Modified Capabilities

<!-- 無。currency-display 仍以 preferred_display_currency 之「預設 TWD」常數消費（holdings/analysis 跨畫面消費屬 Sprint 6，本 change 不動其 requirements）。 -->

## Impact

- **程式碼**：`apps/mobile/src/features/settings/screens/ProfileScreen.tsx`、`DisplayPrefsScreen.tsx`（接上寫回 + 載入 + 狀態回饋）；`apps/mobile/src/features/auth/userDoc.ts`（新增 update helper）；`packages/shared/src/`（新增寫回欄位驗證純函式 + 測試）。
- **Firestore schema**：**無變更**。僅寫入既有欄位 `display_name`、`preferred_display_currency`、`updated_at`（planning §6 已定義）。不觸發聖牛 gate。
- **Firestore rules**：**無變更**。`users/{userId}/**` 已是 owner read/write；既有 rules 測試須續綠。
- **Money/decimal**：無關（currency 為 enum 字串，非金額；ADR-0005 不適用）。
- **依賴**：無新增套件。
- **驗收 gate**：帶 UI 的 change → owner 本人 merge + owner 於 iOS Simulator 逐畫面視覺對圖（ADR-0008 / 憲法 #8）；archive 前需 owner 視覺對圖通過。

## Non-goals

對齊 MVP 邊界與 owner「UI 改動小」框定，本 change **不**做：

- **跨畫面消費 `preferred_display_currency`**：holdings / analysis / asset-detail 仍各自以 TWD 為預設切換值；讓它們以使用者偏好為預設屬 **Sprint 6**（`holdingsDemo.ts` 已註明），本 change 不提前拉進。
- **主題（`settings.theme`）持久化**：app 目前 dark-first、無 light 主題可切，dark-mode toggle 維持示意（no-op），待 light 主題出現再做。
- **AboutScreen**：純資訊頁，無可持久化內容，不動。
- **變更 email / 密碼**：屬 auth 流程，本 change 不碰。
- **`preferred_locale` / `settings.default_account_id`**：本 change 不提供編輯入口（第二階段）。
