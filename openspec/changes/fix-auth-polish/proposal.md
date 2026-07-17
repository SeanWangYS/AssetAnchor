## Why

視覺稽核四項 auth 缺陷：**P2-10**（SignIn 錯誤插入造成 layout 大跳動——banner 與 inline 錯誤未預留空間；email 欄未關 iOS 拼字檢查，紅點底線壓字）；**P2-12**（「略過登入，直接看 Demo →」spec 明定正式版移除，程式僅註解提醒、無任何 build flag 把關——TestFlight 0.0.2 已發，正式 build 可繞過 auth）；**P3-18**（「Email」vs「密碼」中英混用；錯誤橫幅文案偏離 spec「電子郵件或密碼錯誤，請再試一次」；ForgotPassword 無 logo、標題靠左與 SignUp 版式不一致；純文字連結觸控高度 <44pt）；**P3-19**（登出確認「下次需重新輸入帳號密碼」對 Google 使用者不精確；ConfirmDialog scrim 偏淡背景可讀）。

## What Changes

- **P2-10**：SignIn 錯誤橫幅改**常駐固定高度 slot**（無錯誤時透明佔位——表單不再因橫幅插入下推 ~140px；inline 欄位錯誤維持就地展開，位移小且緊鄰欄位）；email 欄補 `autoCorrect={false} spellCheck={false}`（SignIn/SignUp/ForgotPassword 三處）。
- **P2-12**（owner 拍板）：Demo 略過入口包 `__DEV__`——dev build 保留（本地驗證仍需）、release/TestFlight 自動排除（spec「正式版移除」；repo 無 flag 基建，`__DEV__` 是最小正解）。（EXPO_PUBLIC flag 非 fallback——demo 不依賴 emulator、env flag 有誤設進 release 風險；`__DEV__` 編譯期死碼移除為最強保證。）
- **P3-18**：①三畫面 label「Email」→「電子郵件」②`authErrors` 對齊 spec 文案（帳密錯誤→「電子郵件或密碼錯誤，請再試一次」；invalid-email→「電子郵件格式不正確」；already-in-use→「此電子郵件已被註冊，請改用其他信箱或直接登入」（spec 全文））③ForgotPassword 補 `AABrandLockup` + 置中版式（對齊 SignUp；subtitle 補 textAlign center）④文字連結（忘記密碼/建立帳號/返回登入/skip）觸控高度 ≥44pt。
- **P3-19**：登出確認 message →「確定要登出嗎？」（刪對 Google 使用者不精確的第二句）；ConfirmDialog backdrop 0.6 → 0.75（scrim 加深，背景數字不可讀）。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `auth`：錯誤呈現 SHALL NOT 造成表單大幅位移；auth 錯誤文案 SHALL 對齊設計 spec 繁中措辭；Demo 入口 SHALL 僅存在於開發 build；三畫面版式與用語 SHALL 一致；文字連結觸控目標 ≥44pt。

## Impact

- **apps/mobile**：SignInScreen、SignUpScreen、ForgotPasswordScreen、authErrors.ts、SettingsScreen（登出文案）、core/ui/ConfirmDialog.tsx（scrim）。
- **不影響**：packages/shared、schema、functions、rules、docs/design。
- **owner gate**：帶 UI → 視覺對圖 + owner merge。**從最新 main 拉、不 stack**（稽核查證：與 #61–64 檔案零重疊、無依賴——憲法 #8 預設不 stacked）。owner 拍板：①`__DEV__` gate ②登出文案 ③scrim 0.75。

## Non-goals

- 不做正式的 feature flag 基建（單一入口 `__DEV__` 足矣）。
- 不改 Google 登入流程本體（runtime 驗證延後至 Apple 帳號通過，既有安排）。
- 不動 Input 元件全域錯誤佈局（影響全 app 表單——inline 錯誤就地展開為可接受行為）。
- 不引入 blur 依賴（原型 ConfirmDialog 為 0.6 + blur(3px)；RN 無 backdropFilter，以 0.75 加深補償感知遮蔽——與原型偏離已列 owner 拍板）。
