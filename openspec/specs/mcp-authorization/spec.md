# mcp-authorization Specification

## Purpose

The OAuth authorization server that lets a Claude connector act for an AssetAnchor user: discovery metadata, dynamic client registration, PKCE, Firebase Auth login and consent, token lifetimes, and backend-only token storage with admin revocation (ADR-0011).

## Requirements

### Requirement: 公開授權伺服器與受保護資源 metadata

系統 SHALL 公開 OAuth 2.0 授權伺服器 metadata（RFC 8414）與 MCP 端點的受保護資源 metadata（RFC 9728），讓 Claude connector 只憑 connector 網址即可自動發現授權伺服器、授權端點、權杖端點與註冊端點。metadata SHALL 宣告支援 `authorization_code` 與 `refresh_token` grant、`S256` PKCE、`none` 用戶端驗證（公開用戶端），以及 scope `transactions.read` 與 `transactions.write`。

#### Scenario: Claude 首次連線取得 metadata

- **WHEN** 未帶權杖的請求打到 MCP 端點
- **THEN** 回 HTTP 401，`WWW-Authenticate` header 帶 `resource_metadata` 指向受保護資源 metadata 網址

#### Scenario: 讀取授權伺服器 metadata

- **WHEN** 用戶端讀取授權伺服器 metadata
- **THEN** 回應包含 `authorization_endpoint`、`token_endpoint`、`registration_endpoint`，且 `code_challenge_methods_supported` 含 `S256`

#### Scenario: 受保護資源 metadata 列出寫入 scope

- **WHEN** 讀取受保護資源 metadata
- **THEN** `scopes_supported` 含 `transactions.read` 與 `transactions.write`

### Requirement: 動態用戶端註冊

授權伺服器 SHALL 支援動態用戶端註冊（RFC 7591），不需 initial access token。註冊 SHALL 只接受 `https` 的 `redirect_uris`（本機開發環境另允許 `http://localhost` 與 `http://127.0.0.1`），並 SHALL 拒絕其他 scheme。

#### Scenario: Claude 註冊用戶端

- **WHEN** Claude 以合法的 https `redirect_uris` 呼叫註冊端點
- **THEN** 回傳 `client_id`，該用戶端可發起授權流程

#### Scenario: 拒絕不合法的 redirect URI

- **WHEN** 註冊請求的 `redirect_uris` 含 `http://evil.example` 或自訂 scheme
- **THEN** 註冊失敗並回 `invalid_redirect_uri`

### Requirement: 授權碼流程強制 PKCE

授權端點 SHALL 只接受帶 `code_challenge`（`S256`）的授權碼請求；權杖端點 SHALL 驗證 `code_verifier`。授權碼 SHALL 單次使用，且 SHALL 於 10 分鐘內過期。

#### Scenario: 缺少 PKCE

- **WHEN** 授權請求未帶 `code_challenge`
- **THEN** 授權伺服器拒絕並回 `invalid_request`

#### Scenario: 授權碼重複使用

- **WHEN** 同一個授權碼第二次換權杖
- **THEN** 權杖端點回 `invalid_grant`

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

### Requirement: 權杖期限與續期

存取權杖 SHALL 為隨機不透明字串，有效期 1 小時。refresh token SHALL 每次使用即輪替（舊的立即失效），且自首次授權起 SHALL 最長 30 天；超過後用戶端 SHALL 需要使用者重新登入。權杖 SHALL 綁定 MCP 端點作為 resource，對其他 resource SHALL 無效。

#### Scenario: 存取權杖過期

- **WHEN** 用戶端以發出超過 1 小時的存取權杖呼叫 MCP 端點
- **THEN** 回 HTTP 401 `invalid_token`

#### Scenario: 以 refresh token 續期

- **WHEN** 用戶端在 30 天內以有效 refresh token 換新權杖
- **THEN** 取得新的存取權杖與新的 refresh token，舊 refresh token 失效

#### Scenario: 超過 30 天

- **WHEN** 用戶端在首次授權 30 天後嘗試續期
- **THEN** 權杖端點回 `invalid_grant`

### Requirement: 權杖儲存為後端專用並可由管理者作廢

授權伺服器的所有狀態（註冊用戶端、授權碼、存取權杖、refresh token、互動階段、授權紀錄）SHALL 存放在 Firestore 後端專用集合，每筆 SHALL 帶到期時間並由 Firestore TTL 自動清除。`firestore.rules` SHALL 拒絕任何用戶端讀寫該集合。管理者 SHALL 能以文件化的操作作廢指定使用者的所有權杖，作廢後該使用者的權杖 SHALL 立即無法通過 MCP 端點驗證。

#### Scenario: 用戶端無法讀取權杖

- **WHEN** 已登入的 App 使用者嘗試讀取 OAuth 儲存集合中的任何文件
- **THEN** rules 拒絕讀取

#### Scenario: 管理者作廢

- **WHEN** 管理者依 runbook 作廢 uid 為 `U1` 的所有權杖
- **THEN** 該使用者既有的存取權杖與 refresh token 之後一律回 `invalid_token` 或 `invalid_grant`

### Requirement: 簽章與 cookie 金鑰不進版控

授權伺服器使用的簽章金鑰與 cookie 金鑰 SHALL 以 Firebase secrets 提供，SHALL NOT 出現在 repo 或建置輸出中。本機 emulator 環境 SHALL 使用僅供開發的金鑰。

#### Scenario: 正式環境缺金鑰

- **WHEN** 正式環境的 `mcp` function 啟動時讀不到必要的 secret
- **THEN** 授權相關請求回 HTTP 500 並寫入錯誤 log，不以預設金鑰運作
