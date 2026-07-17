# Tasks — fix-auth-polish

## 1. 實作

- [x] 1.1 P2-10：SignIn banner 常駐固定 slot（無錯誤透明佔位）；三畫面 email autoCorrect/spellCheck off
- [x] 1.2 P2-12：skip 入口 `__DEV__` gate + 註解更新
- [x] 1.3 P3-18：label 電子郵件 ×3；authErrors spec 文案（含 user-not-found 併帳密錯誤）；ForgotPassword lockup+置中；連結 minHeight 44
- [x] 1.4 P3-19：登出 message「確定要登出嗎？」；ConfirmDialog backdrop 0.6→0.75

## 2. 驗證（DoD）

- [x] 2.1 設計稽核：2 獨立子代理（邏輯 / 簡潔）——必改全採納：already-in-use spec 全文、spec 去 slot 實作字樣、改 base=main 不 stack、blur 事實更正、a11y 佔位不用 opacity:0、測試同步表
- [x] 2.2 typecheck / lint / prettier / shared coverage / mobile test 全綠（authErrors.test.ts 五行斷言同步：invalid-email/user-not-found/wrong-password/invalid-credential/already-in-use）
- [x] 2.3 模擬器對照：登出→SignIn（電子郵件 label、無 Demo?（dev build 會顯示——驗 gate 存在即可）、錯誤密碼登入橫幅不推移、拼字底線消失）、ForgotPassword 版式、登出確認文案+scrim
- [x] 2.4 e2e login flow 斷言檢查（grep Email/密碼字串）

## 3. 收尾

- [ ] 3.1 commit → push → PR（**base=main，不 stack**——與 #61-64 零檔案重疊；owner 拍板：**DEV**/登出文案/scrim 0.75/already-in-use 全文）
- [ ] 3.2 CI 綠（owner-gated 不自 merge）→ `/opsx:archive`
