## MODIFIED Requirements

### Requirement: 以 App 帳號登入並明確同意

授權流程 SHALL 將使用者導向 Firebase Hosting 上的登入頁，使用者以 Firebase Auth（Email／密碼或 Google）登入，登入身分 SHALL 與 App 相同（同 uid）。登入後 SHALL 顯示同意畫面，逐項列出 Claude 將取得的權限（讀取帳戶與交易、查詢代號、新增／修改／刪除交易），使用者按「允許」才完成授權；按「拒絕」SHALL 以 `access_denied` 導回用戶端。授權 SHALL 同時涵蓋 `transactions.read` 與 `transactions.write`。授權伺服器 SHALL 以 Admin SDK 驗證登入頁送回的 Firebase ID token，並以其 uid 作為授權主體；SHALL NOT 信任頁面直接傳來的 uid。登入頁與同意頁的文字 SHALL 為繁體中文，並沿用 App 的配色與字型。

#### Scenario: 使用者同意授權

- **WHEN** 使用者在登入頁以 `test@assetanchor.dev` 登入並按「允許」
- **THEN** 瀏覽器帶授權碼導回 Claude 的 `redirect_uri`，後續發出的權杖對應該使用者的 uid，scope 含 `transactions.read transactions.write`

#### Scenario: 使用者拒絕授權

- **WHEN** 使用者在同意畫面按「拒絕」
- **THEN** 瀏覽器帶 `error=access_denied` 導回 Claude，且不發出任何權杖

#### Scenario: 偽造的身分

- **WHEN** 登入頁送回的 ID token 無效、過期或簽章不符
- **THEN** 授權伺服器拒絕完成登入，不發出授權碼

#### Scenario: 同意畫面列出寫入權限

- **WHEN** 使用者登入後看到同意畫面
- **THEN** 權限清單含「新增、修改、刪除交易」，並說明每次都會先在 Claude 對話中列出讓使用者確認
