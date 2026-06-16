## Context

ProfileScreen 與 DisplayPrefsScreen 已在 align-to-design 完成視覺定稿，但寫回是 Non-goal：兩頁皆 local state，按鈕只彈 demo 字。`users/{uid}` 文件在註冊時由 `createUserDocIfMissing()`（`apps/mobile/src/features/auth/userDoc.ts`）以 `setDoc` 建立，已含 `display_name`、`preferred_display_currency`、`updated_at` 等欄位（planning §6）。本 change 把編輯結果接回該文件。

約束：

- `users/{userId}/**` rules 已是 owner read/write，無需動 rules。
- 僅寫既有欄位，無 schema 變更（不觸發聖牛 gate）。
- Firestore 一律 `@react-native-firebase` v24 modular API。
- 顯示幣別為 enum 字串，與 Money/decimal 精度無關。

## Goals / Non-Goals

**Goals:**

- `display_name` 編輯 → 寫回 `users/{uid}.display_name` + Auth profile，並更新 `updated_at`。
- `preferred_display_currency` 切換 → 寫回 `users/{uid}`，跨重啟保存。
- 寫回前的欄位驗證以 `packages/shared` 純函式實作（TDD + coverage gate）。
- 真實 loading / 成功 / 失敗回饋取代示意字樣。

**Non-Goals:**

- holdings / analysis / asset-detail 以 `preferred_display_currency` 為預設切換值（Sprint 6）。
- `settings.theme` 持久化（無 light 主題可切）。
- 變更 email / 密碼、`preferred_locale`、`default_account_id`。

## Decisions

### D1：驗證邏輯放 `packages/shared` 純函式

新增 `validateDisplayName(raw): { ok: true; value: string } | { ok: false; reason: 'empty' | 'too_long' }`（trim、1–50 字元）與 `isDisplayCurrency(x): x is DisplayCurrency`（成員檢查 `['TWD','USD']`）。

- **為何**：可測、跨端可重用、符合 §13.4「純函式先測後做、≥90% coverage」。mobile 端只負責呼叫 + 接寫入回饋，邏輯不散落在 component。
- **替代**：在 component 內 inline 驗證 → 不可測、違反測試紀律，否決。
- `DisplayCurrency` 型別與 `DISPLAY_CURRENCY_OPTIONS` 常數放 shared，DisplayPrefsScreen 改 import（取代目前畫面內自定的 local type）。

### D2：service 層擴充 `userDoc.ts`，用 `updateDoc` 做部分欄位更新

新增 `updateUserProfile({ display_name })` 與 `updateDisplayCurrency(currency)`，內部 `updateDoc(doc(db,'users',uid), { ...欄位, updated_at: serverTimestamp() })`。

- **為何 `updateDoc` 而非 `setDoc(merge)`**：文件在註冊時已建立，部分更新語意正確；`updateDoc` 在文件不存在時會 reject（fail loud），符合「不該發生卻發生時要看見」。
- **邊界保險**：若日後出現「已登入但缺 user doc」，由既有 `createUserDocIfMissing()` 負責；本 change 不重複建立。

### D3：`display_name` 雙寫（Firestore + Auth）順序與失敗處理

`updateUserProfile` 先 `updateDoc`（app 的 source of truth）再 `updateProfile(currentUser,{ displayName })`。任一步驟拋錯即整體視為失敗、回傳錯誤給畫面顯示。

- **為何同時寫 Auth**：部分既有畫面（如註冊預填）讀 Auth `displayName`；保持兩者一致避免顯示分歧。
- **權衡**：Auth 與 Firestore 無跨服務交易，理論上可能 Firestore 成功、Auth 失敗造成短暫不一致。MVP 接受：Firestore 為準，使用者重存即收斂；以錯誤回饋讓使用者知道未成功。

### D4：載入與回饋模型

- ProfileScreen：mount 時 `getUserDoc()` 取 `display_name`（缺值 fallback Auth `displayName` → `''`）；維持受控 input；「儲存」依驗證結果 enable/disable；寫入期間 disable + loading，成功 / 失敗以既有 UI 元件呈現（沿用畫面現有 `saved` 提示樣式，加錯誤態）。
- DisplayPrefsScreen：mount 時載入現值；切換採「先樂觀更新 UI → 寫入 → 失敗則還原為前一個已持久化值 + 顯示錯誤」。

## Risks / Trade-offs

- **Auth/Firestore 部分失敗的短暫不一致**（D3）→ 以錯誤回饋 + 重試收斂；Firestore 為準。
- **離線寫入**：RNFirebase 預設離線佇列可能讓寫入「看似成功」後才在連線時 reject → 以 await + catch 呈現錯誤；MVP 不做樂觀離線 UX 強化。
- **持久化但無消費**：`preferred_display_currency` 落地後 holdings/analysis 暫不讀（Sprint 6）→ 已於 proposal Non-goals 與程式註解標明，避免被誤解為「設定壞掉」。
- **顯示名稱上限 50**：屬產品決定的保守值，非 schema 約束 → 純函式集中管理，日後調整單點修改。

## Migration Plan

無資料遷移（僅寫既有欄位）。回滾＝revert PR；已寫入的 `display_name` / `preferred_display_currency` 為合法 schema 欄位，回滾後不影響讀取。

## Open Questions

無阻塞項。（跨畫面消費顯示幣別、theme 持久化已明確歸 Sprint 6 / 待 light 主題，不在本 change。）
