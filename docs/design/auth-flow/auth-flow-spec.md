# Auth 流程設計 spec — 登入 / 註冊 / 忘記密碼

- **Status**: ✅ 定稿（2026-06-14）
- **對應**: planning §11 AuthStack · Sprint 1「Auth + Hello Firebase Rail」
- **原型**: 已整合進 `app-prototype/`（非獨立檔）。雙擊 `app-prototype/AssetAnchor-app.standalone.html`，啟動即落在 Auth。
- **原始碼**: `app-prototype/prototype/aa-auth.jsx`（+ `aa-screens-v2.jsx` 的 auth 閘門）。

---

## 1. 視覺方向（已選）

**方向 A「錨定置中」** ＋ **款 2「圓環錨點」標誌**。

- SignIn：品牌區（標誌＋字標＋標語「你的資產，一處錨定」）置中於上，表單沉於下半，註冊入口置底。經典對稱、splash 感最強。
- 三方向比較與 logo 三款提案保存在 `auth-flow/exploration/Auth Direction Comparison.html`。
- 標誌「圓環錨點」＝經典錨形的幾何精煉（環＋桿＋弧爪）；accent 漸層**跟隨 Tweaks 強調色**，全 app 共用（Splash / SignIn / 設定「我的帳號」卡 / 外框 app 標頭）。

## 2. 畫面與導航

```
AuthStack（未登入）
├── SplashGate         啟動 loading gate，擋 auth 閃現（真實版＝onAuthStateChanged 解析前）
├── SignIn             ← base
│    ├─→ SignUp        push（建立帳號）
│    └─→ ForgotPassword push（忘記密碼）→ 寄信成功畫面（同 push 內切換）
登入/註冊成功 → MainTabs（落地「持倉」）
設定頁「登出」→ confirm → 回 SignIn
```

## 3. 欄位與構件

- **欄位**：Email + 密碼（最精簡）。註冊與登入同欄位。
- **密碼框**：右側 eye 顯示/隱藏切換。
- **Google**：SignIn / SignUp 皆有「使用 Google 登入 / 註冊」（次要 ghost 按鈕，含彩色 G）。
- **可跳過登入**：SignIn 底部「略過登入，直接看 Demo →」直接進 MainTabs（demo 用，正式版移除）。

## 4. 狀態（皆已實作）

| 狀態 | 行為 |
|---|---|
| inline 欄位驗證 | email 格式不正確 / 空白；密碼空白 / < 6 碼。錯誤色 `#FF5E62`，欄框轉紅 + alert icon + 文字；輸入即清除該欄錯誤。 |
| auth 錯誤 | 表單頂部紅色橫幅（帳密錯誤 / email 已註冊）。 |
| 按鈕 loading | 主按鈕轉 spinner（~1.1s 模擬網路），期間 disable；Google 顯示「連線中…」。 |
| 忘記密碼寄信成功 | 全畫面成功態：mail icon 徽章 + 「信件已寄出」+ 顯示收件信箱 + 返回登入 / 重新輸入信箱。 |
| Splash gate | 啟動 ~1.3s 顯示標誌 + 字標 + 三點 loading，再進 SignIn（擋未登入畫面閃現）。 |
| 登出 | 設定頁紅色「登出」→ 置中 ConfirmDialog（破壞性紅）→ 確認後清空導覽回 SignIn。 |

## 5. 驗證規則

- Email：`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- 密碼：≥ 6 碼（對齊 Firebase 最小長度）

## 6. Demo 觸發（純前端模擬）

| 操作 | 觸發 | 結果 |
|---|---|---|
| 登入 | email 含 `wrong` | 「電子郵件或密碼錯誤，請再試一次」 |
| 註冊 | email 含 `taken` | 「此電子郵件已被註冊，請改用其他信箱或直接登入」 |
| 其餘有效輸入 | — | loading 後成功進 app |

## 7. 真實實作對照（給 RN + Firebase）

- `signInWithEmailAndPassword` / `createUserWithEmailAndPassword` / `sendPasswordResetEmail`。
- 錯誤碼對照：`auth/invalid-credential`·`auth/wrong-password`·`auth/user-not-found` → 帳密錯誤；`auth/email-already-in-use` → email 已註冊；`auth/invalid-email`·`auth/weak-password` 可前置由 inline 驗證攔下。（planning §14.3：錯誤訊息對照表可沿用。）
- 註冊成功時建立 `users/{uid}` 文件（planning 資料模型）。
- SplashGate 真實版＝等待 `onAuthStateChanged` 首次回呼；已登入直接進 MainTabs。
- Google：`signInWithCredential`（@react-native-google-signin）。正式上架若加第三方登入，Apple Sign-In 視 App Store 要求再補（本次未做）。

## 8. 未納入本次範圍

Apple / Face ID 快速解鎖、Email 驗證信流程、多語系切換 — 皆延後。
