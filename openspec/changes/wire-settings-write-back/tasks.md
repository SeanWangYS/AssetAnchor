## 1. shared 驗證純函式（TDD：先測後做）

- [x] 1.1 在 `packages/shared` 新增 `DisplayCurrency` 型別與 `DISPLAY_CURRENCIES` 常數（`['TWD','USD']`），由 index 匯出
- [x] 1.2 先寫測試：`validateDisplayName`（trim/空白拒絕 empty/超過 50 拒絕 too_long/合法回傳 trim 值）與 `isDisplayCurrency`（TWD/USD 通過、其他含合法 Currency 拒絕）
- [x] 1.3 實作 `validateDisplayName` 與 `isDisplayCurrency` 至綠燈，由 index 匯出
- [x] 1.4 跑 `pnpm --filter @assetanchor/shared test:coverage`，確認新檔涵蓋且 gate（≥90%）通過（preferences 100%）

## 2. mobile service 層（userDoc.ts）

- [x] 2.1 在 `apps/mobile/src/features/auth/userDoc.ts` 新增 `updateDisplayCurrency(currency: DisplayCurrency)`：`updateDoc(users/{uid}, { preferred_display_currency, updated_at: serverTimestamp() })`（modular v24）
- [x] 2.2 在同檔新增 `updateUserProfile({ display_name })`：先 `updateDoc(users/{uid}, { display_name, updated_at })`，再 `updateProfile(currentUser, { displayName })`；任一拋錯即整體拋錯
- [x] 2.3 未登入（`auth.currentUser` 為 null）時兩 helper 皆 no-op 防呆（對齊既有 getUserDoc 風格）

## 3. ProfileScreen 寫回

- [x] 3.1 mount 時 `getUserDoc()` 載入 `display_name`（fallback Auth displayName → ''）填入受控 input
- [x] 3.2 「儲存」改呼叫 `updateUserProfile`：依 `validateDisplayName` enable/disable + 顯示驗證提示；寫入期間 disable + loading；成功 Toast、失敗 inline 錯誤（移除「demo，尚未寫回」字樣）

## 4. DisplayPrefsScreen 寫回

- [x] 4.1 改用 shared 的 `DisplayCurrency` / `DISPLAY_CURRENCIES`（移除畫面內自定 type/常數）
- [x] 4.2 mount 時載入 `preferred_display_currency`（缺值預設 TWD）；切換採樂觀更新 → `updateDisplayCurrency` → 失敗還原前值 + 錯誤回饋；調整「尚未持久化」註腳（僅標 dark-mode 示意）

> **測試策略（ADR-0007 獎盃模型）**：本 change 的「安靜且嚴重」邏輯＝欄位驗證，屬 `packages/shared` 純函式（§1，已 TDD + 100% coverage）。Screen 寫回屬「UI plumbing / 按鈕接線」、service helper 屬「資料層 I/O」——ADR-0007 §3/§4/§6 明列 screens/I/O **排除於 jest gate、不走 TDD、不寫 RNTL**（RNTL 僅留給 1–2 條 silent-severe 資料流如「交易→持倉數字」；plumbing 走手動 dogfood）。故本 change **不引入 RNTL 基建**，screen flow 由 emulator + iOS Simulator 手動對圖（owner 視覺對圖 gate）驗收。詳見 5.3。

## 5. Definition-of-Done 驗證 + 收尾

- [x] 5.1 `pnpm -r typecheck`、`pnpm -r lint`、`pnpm format:check` 全綠
- [x] 5.2 `firebase/` 零 diff（git 確認），rules 邏輯不受影響；rules 測試未能隔離跑（port 8080 已被 owner 在跑的 emulator 佔用——不 kill、不對其跑 clearFirestore 以免清掉 dev 資料）
- [x] 5.3 非侵入式 smoke 截圖確認 bundle 健康（pure-JS 已 Fast Refresh、無 redbox）；逐畫面視覺對圖為 **owner gate**（ADR-0008），PR 附驗收 checklist；不驅動 owner 進行中的 simulator session
- [ ] 5.4 feature 分支 commit（Conventional Commits, scope: mobile/shared）+ 開 PR；UI-bearing → **停下等 owner 視覺對圖 + merge**（憲法 #8 / ADR-0008），不自 merge、不 archive
