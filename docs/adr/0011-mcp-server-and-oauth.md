# ADR-0011：MCP server 與 OAuth 授權伺服器（Claude 截圖匯入交易）

- 日期：2026-10-23
- 狀態：Accepted（owner 2026-10-21～22 拍板需求與架構；2026-10-22 改選 `oidc-provider`）
- 關聯：ADR-0005（Money/decimal）、ADR-0008（設計包權威）、`app-check` spec、change `add-mcp-auth-readonly`（及後續 change 2～4）

## Context

使用者要把過去在券商的交易逐筆手動輸入 App，是最大的上手痛點。逐家串接券商 API 維護成本過高，CSV 匯入設計已於 2026-10-20 放棄。新方向：使用者把任意券商的交易截圖丟給 Claude，Claude 解析成交易清單、在對話中逐筆確認後，透過 MCP 寫入 AssetAnchor。

Claude 是第二個用戶端，與 iOS App 有兩個根本差異：

1. 呼叫者是 Claude 的伺服器，**無法通過 App Check**（App Attest 只能證明我們自己的 App）。
2. Claude 的遠端 connector 只走 **OAuth 2.1**（授權碼 + PKCE、動態用戶端註冊、受保護資源 metadata）；Firebase Auth 本身不是 OAuth 授權伺服器，無法直接發權杖給第三方。

MCP TypeScript SDK v2 已把授權伺服器 helper（`mcpAuthRouter` 等）移到凍結的 `@modelcontextprotocol/server-legacy`，官方建議新專案另用專門的授權伺服器；SDK 只保留 resource server 端（`requireBearerAuth`、metadata router）。

## Decision

1. **一個 Cloud Function `mcp`** 承載兩個角色：OAuth 授權伺服器與 MCP server（Express app，Functions v2，asia-east1，`maxInstances: 3`）。不另架伺服器。
2. **MCP 端點不掛 App Check，改以 OAuth bearer token 保護**。App Check 仍保護其餘使用者端函式與 Firestore；`mcp` 是唯一例外，由 `runtimeOptions.test.ts` 強制。
3. **授權伺服器採 `oidc-provider`**（panva，OpenID 認證實作）：DCR、強制 S256 PKCE、`resourceIndicators`（權杖綁定 MCP 端點、opaque）、refresh 輪替。身分由 Firebase Auth 確認（與 App 同 uid），授權伺服器以 Admin SDK `verifyIdToken` 驗證登入頁送回的 ID token，不信任頁面傳入的 uid。
4. **網域配置**：使用者看得到的都在 Firebase Hosting（connector `https://assetanchor-832df.web.app/mcp`、登入頁 `/connect`）；授權伺服器掛在函式的 Cloud Run 網址根路徑（issuer）。原因：Hosting rewrite 只轉送 `__session` cookie，而 OAuth 互動需要多個 cookie；`cloudfunctions.net/mcp` 帶路徑前綴，RFC 8414 metadata 會落在我們控制不到的網域根目錄。
5. **權杖存放**：隨機不透明權杖，存在後端專用集合 `oauth_store`（rules 全拒、Firestore TTL 清除）。存取權杖 1 小時，refresh 最長 30 天。使用者以「在 Claude 移除 connector」收回授權，管理者可依 runbook 作廢某使用者的所有權杖。
6. **安全護欄**：所有工具只存取權杖 uid 的資料；金額以 decimal string 原樣進出（ADR-0005）；破壞性工具（change 3）一律兩段式確認、只接受 ID、單次上限 20 筆；任何造成超賣的寫入整批拒絕。
7. **分期**：change 1 登入與只讀工具 → change 2 匯入交易（`source`、`import_batch_id`）→ change 3 修改與刪除 → change 4 App 說明頁。上線即開放所有使用者。

## Consequences

- 正面：不需新伺服器或付費身分服務；身分與 App 一致；架構可直接承接寫入工具（新增 scope 即可）；依開放標準實作，日後接 ChatGPT 不需重寫。
- 負面：新增一個不經 App Check 的對外入口，安全完全依賴 OAuth 實作正確（以整合測試覆蓋各攻擊情境）；`oidc-provider` 設定面大、需熟悉；首次部署後要回填 Cloud Run 網址作為 issuer。
- 營運：多了 secrets（cookie 金鑰、JWKS）、Hosting、TTL policy 三項 owner 操作，見 `docs/runbook/mcp-operations.md`。

## Alternatives

- **凍結的 `server-legacy/auth`**：程式最少，但官方不再更新，跟不上 Claude 的新授權機制（例如 Client ID Metadata Document），等於一開始就背技術債。
- **Auth0／WorkOS 等第三方身分服務**：官方建議路線、維護最省心；但多一套帳號體系要對應回 Firebase uid，超過免費額度要付費。
- **完全自寫 OAuth 端點**：最小、可完全掌控，但 PKCE、redirect 驗證、權杖輪替等安全細節全部自負，風險最高。
- **App 內上傳截圖、後端呼叫 Claude API 解析**：使用者體驗最順，但 AI 費用由我們負擔；可作為日後補充，不取代 MCP。
