## Why

使用者要把過去在券商的交易一筆一筆手動輸入 App，是目前最大的上手痛點；逐家串接券商 API 維護成本過高（台灣券商 API 綁本人憑證）、CSV 匯入設計也已於 2026-10-20 放棄。新方向是讓 Claude 使用者上傳任意券商截圖，由 AI 解析成交易，經對話確認後透過 MCP 寫入 AssetAnchor（2026-10-21～22 owner 定案，共 4 個 change）。

本 change 是第 1 步：先打通「Claude 透過 OAuth 以 App 帳號登入 → 呼叫只讀工具查自己的資料」整條路。OAuth 是整個構想中最不確定、風險最高的部分，以只讀工具先驗證可避免寫壞資料；寫入（change 2）、修改與刪除（change 3）、App 說明頁（change 4）都建立在這條路上。

依據：planning §3（MVP 已涵蓋「編輯／刪除交易」；第二階段的「CSV 匯入」由本系列取代）、§6（新增後端專用集合）、§7（Security Rules）、§12.1（monorepo 結構）、§13.5（ADR 寫入時機）。

## What Changes

- **新增遠端 MCP server**：在 `apps/functions/src/mcp/` 新增一個 Cloud Function（Functions v2、asia-east1、`maxInstances: 3`），以 MCP TypeScript SDK v2 的 Streamable HTTP（無狀態）提供 MCP 端點。此端點**不掛 App Check**（呼叫者是 Claude 的伺服器，無法取得 App 裝置證明），改以 OAuth bearer token 保護；現有函式的 App Check 不受影響。
- **新增 OAuth 授權伺服器**：以開源套件 `oidc-provider`（panva/node-oidc-provider）自架，支援 Claude connector 需要的流程（授權碼 + PKCE、動態用戶端註冊、refresh token、授權伺服器與受保護資源 metadata）。使用者身分由 Firebase Auth 確認（Email／Google，與 App 同帳號、同 uid）。存取權杖 1 小時、refresh 最長 30 天，權杖為隨機不透明字串，存放於 Firestore **後端專用**集合，可由管理者手動作廢。
  - 註：原計畫使用 MCP SDK 內建的授權伺服器模組，但該模組在 SDK v2 已移至凍結的 `server-legacy`，官方不再更新；2026-10-22 owner 改選 `oidc-provider`。
- **新增 workspace `apps/web`**（Vite + TypeScript）：登入／授權同意頁，部署到 Firebase Hosting；沿用 App 配色與字型，不另補設計 spec，由 owner 以瀏覽器目視驗收。
- **新增三個只讀 MCP 工具**：`list_accounts`（列出帳戶）、`list_transactions`（依帳戶／代號／日期查詢交易，回傳交易 ID）、`search_symbol`（把名稱或代號對應到 App 的 symbol 與市場）。所有查詢一律綁定權杖對應的 uid，不接受工具參數指定使用者。
- **Firebase 設定**：`firebase.json` 新增 `hosting`；`firestore.rules` 新增 OAuth 集合規則（用戶端一律拒絕讀寫）；OAuth 簽章金鑰與 cookie 金鑰改用 Firebase secrets。
- **新增 ADR-0011**：記錄 MCP 整體架構（OAuth 而非 App Check、`oidc-provider` 選型、權杖存放、安全護欄、4 個 change 的分期）。

## Capabilities

### New Capabilities

- `mcp-authorization`: Claude connector 以 OAuth 取得存取權的完整流程——授權伺服器 metadata、動態用戶端註冊、Firebase Auth 登入與同意頁、權杖發放／續期／過期、後端專用權杖儲存與管理者作廢。
- `mcp-server`: 遠端 MCP 端點與只讀工具——bearer token 驗證、uid 綁定、`list_accounts`／`list_transactions`／`search_symbol` 的輸入輸出契約與錯誤行為。

### Modified Capabilities

- `functions-runtime-limits`: 匯出函式清單新增 MCP 函式並歸類（使用者端 HTTP、`maxInstances: 3`）；明訂 MCP 函式是唯一不經 App Check gate 的使用者端 HTTP 函式，並由測試強制。

## Non-goals

- 任何寫入工具：匯入、修改、刪除交易，建立 symbol（change 2、3）。
- 交易的 `source`、`import_batch_id` 欄位（change 2）。
- App 內「用 Claude 匯入交易」說明頁（change 4）。
- App 內中斷連線按鈕；使用者自行作廢權杖（決策 A4：只在 Claude 端移除 connector）。
- ChatGPT 相容性驗收（依開放標準實作，但只在 Claude 驗收）。
- 股利等第二／三階段交易類型。
- 白名單或分批開放（決策 C4：上線即開放給所有使用者）。

## Impact

- **程式碼**：`apps/functions/src/mcp/`（新）、`apps/functions/src/index.ts`、`apps/functions/src/runtimeOptions.ts`（新增 MCP 選項）、`apps/functions/src/runtimeOptions.test.ts`；`apps/web/`（新 workspace）；`firebase.json`；`firebase/firestore.rules` 與 rules 測試；`packages/shared` 僅在需要共用的純函式（例如查詢結果整形）時新增。
- **相依套件**：functions 新增 `@modelcontextprotocol/server`、`@modelcontextprotocol/express`、`@modelcontextprotocol/node`、`oidc-provider`、`express`；`apps/web` 新增 `vite`、`firebase`（Web SDK）。
- **Firestore schema（聖牛 gate）**：新增後端專用的 OAuth 儲存集合（權杖、授權碼、註冊用戶端、互動階段），含到期欄位與 TTL 自動清除。不改動任何既有集合。
- **部署與費用（gate）**：新增 Hosting、一個對外 HTTP 函式、Firebase secrets（Secret Manager）、Firestore TTL policy；預期都在免費額度或極低費用內，但屬 owner 操作。
- **安全模型（gate）**：新增一個不經 App Check 的對外入口，存取範圍限於權杖對應使用者的 `users/{uid}/**`（只讀）與 `symbols`。
- **CI**：`apps/web` 自動納入 `pnpm -r typecheck/lint`；shared coverage gate 不受影響。
