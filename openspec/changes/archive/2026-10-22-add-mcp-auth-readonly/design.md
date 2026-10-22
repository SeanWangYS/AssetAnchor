## Context

AssetAnchor 目前只有 iOS App 一個用戶端：App 以 Firebase Auth 登入，直接讀寫 `users/{uid}/**`（rules 限本人），並以 HTTP 呼叫 Cloud Functions（報價、匯率、歷史），這些函式正導入 App Check（`add-app-check`，monitor 模式）。

MCP 截圖匯入系列要新增第二個用戶端：Claude 的伺服器。它不是我們的 App，無法通過 App Check，也不能直接用 Firebase Auth 的 ID token（Claude connector 只會走 OAuth 2.1 授權流程）。因此需要：一個 OAuth 授權伺服器（發通行證）、一個受保護的 MCP 端點（驗通行證、查資料），以及使用者登入與同意的網頁。

需求與架構決策已於 2026-10-21～22 與 owner 定案（見 proposal）。本 change 只做登入與只讀工具，寫入在 change 2、3。

限制：

- 憲法 #2：金額與數量一律 decimal string，不轉 number。
- 憲法 #3：新增集合屬聖牛 schema 變更，須逐欄說明。
- `functions-runtime-limits`：每個函式 `maxInstances` ≤ 3、`asia-east1`、由測試強制。
- functions 以 tsup 打包成 **CJS** 單檔（`apps/functions/tsup.config.ts`），shared 以 alias bundle。
- 個人專案規模：每位使用者交易量在數百至數千筆。

## Goals / Non-Goals

**Goals:**

- Claude（claude.ai 與 Claude Code）只憑 connector 網址即可完成 OAuth 登入、同意，並呼叫三個只讀工具。
- 身分與 App 完全一致（同 Firebase uid），資料存取不可能越過該 uid。
- 權杖可過期、可續期、可由管理者作廢；所有 OAuth 狀態只在後端。
- 架構能直接承接 change 2、3 的寫入工具（新增 scope 即可）。
- 本機可以 emulator + Claude Code + MCP Inspector 完整跑通。

**Non-Goals:**

- 寫入、修改、刪除工具，交易來源欄位（change 2、3）。
- App 內說明頁與中斷連線按鈕（change 4／決策 A4）。
- ChatGPT 驗收、白名單分批開放。

## Decisions

### D1. 授權伺服器採 `oidc-provider`，MCP 端點採 SDK v2 的 resource-server 工具

- **選擇**：授權伺服器用 `oidc-provider`（panva，OpenID 認證實作），開啟 `registration`（DCR，無 initial access token）、`resourceIndicators`（權杖綁定 MCP 端點、`accessTokenFormat: 'opaque'`）、`pkce`（強制 S256）、refresh token 輪替；關閉不需要的 OIDC 功能（`devInteractions`、`userinfo` 等）。MCP 端點用 `@modelcontextprotocol/express` 的 `requireBearerAuth` + `mcpAuthMetadataRouter`，verifier 以 `oidc-provider` 的 `AccessToken.find()` 驗證權杖。
- **理由**：SDK v2 已把授權伺服器 helper（`mcpAuthRouter`）移到凍結的 `server-legacy`，官方建議另用專門的授權伺服器；`oidc-provider` 長期維護、PKCE／DCR／輪替等安全細節不必自寫，且免費、身分留在 Firebase。
- **替代方案**：凍結的 `server-legacy/auth`（技術債、跟不上新標準）；Auth0／WorkOS（多一套帳號體系與費用）；完全自寫（安全風險最高）。owner 2026-10-22 選定本方案。

### D2. 一個 `mcp` 函式承載授權伺服器與 MCP 端點

- **選擇**：`apps/functions/src/mcp/` 建一個 Express app，掛上 `oidc-provider` 的 callback（根路徑的 `/auth`、`/token`、`/reg` 等）、互動路由（`/interaction/*`）、metadata（`/.well-known/*`）與 MCP 端點（`/mcp`），以 `onRequest(MCP_HTTP_OPTIONS, app)` 匯出為單一函式 `mcp`。不經 `userHttpFunction`（不掛 App Check）。
- **理由**：兩者共用 `oidc-provider` 實例（verifier 直接查權杖），一個函式即一份冷啟動、一組 `maxInstances: 3`。
- **替代方案**：拆成 `oauth` 與 `mcp` 兩個函式（權杖驗證要跨函式共用 adapter，冷啟動加倍，收益不大）。

### D3. 網域配置：connector 與登入頁走 Hosting，授權伺服器走函式網址

- **選擇**：
  - Firebase Hosting（`assetanchor-832df.web.app`）提供登入頁靜態檔，並把 `/mcp` 與 `/.well-known/oauth-protected-resource/**` rewrite 到 `mcp` 函式。**connector 網址 = `https://assetanchor-832df.web.app/mcp`**。
  - 授權伺服器掛在函式的**根路徑**（`/auth`、`/token`、`/reg`、`/interaction/*`、`/.well-known/*`），issuer 為函式的 **Cloud Run 網址**（`https://mcp-<hash>-de.a.run.app`，首次部署後由 deploy 輸出取得，以 `MCP_ISSUER_URL` 參數設定）。受保護資源 metadata 的 `authorization_servers` 指向它。
  - 不用 `cloudfunctions.net/mcp` 當 issuer：它帶 `/mcp` 路徑前綴，RFC 8414 的 metadata 位置會落在 `cloudfunctions.net` 網域根目錄（我們控制不到）；Cloud Run 網址沒有前綴，`/.well-known/oauth-authorization-server` 與 `/.well-known/openid-configuration` 都在我們的函式內。
  - emulator 的函式網址帶 `/{project}/asia-east1/mcp` 前綴，且 emulator 會先剝掉前綴再交給函式；以一個 middleware 把前綴補回 `req.originalUrl`，讓 `oidc-provider` 算出正確的端點網址（spike 實測可行）。
- **理由**：Firebase Hosting rewrite 到函式時**只轉送名為 `__session` 的 cookie**，而 `oidc-provider` 的互動流程需要多個 cookie。MCP 端點只用 bearer token、不需 cookie，可安全走 Hosting；授權伺服器放在函式網址，cookie 不受影響。RFC 9728 允許授權伺服器與資源在不同網域。
- **與原決策 B1 的差異**：B1 是「登入頁在 Hosting、與 connector 共用網域」，此點仍成立；只有使用者看不到的 OAuth API 網址改在函式網域。
- **替代方案**：全部走 Hosting 並把 cookie 改名塞進 `__session`（`oidc-provider` 多個 cookie 無法共用一個名稱，不可行）；全部走函式網址（connector 網址冗長、與 B1 不符）。
- **驗證（spike 2026-10-23，emulator）**：Hosting rewrite `/mcp` 到函式可用，函式看到完整路徑 `/mcp`；在函式網址上完整跑通 DCR → `/auth` → 互動 cookie → `interactionFinished` → 授權碼 → `/token` → 以權杖經 Hosting 呼叫 MCP 工具；授權碼重用回 `invalid_grant` 並連帶作廢整組授權；refresh 輪替成功、舊 refresh 失效。

### D4. 登入互動：登入頁換 ID token，函式驗證後完成互動

流程：

1. Claude 導向 `/auth` → `oidc-provider` 建立互動、設定互動 cookie（函式網域）→ 重新導向 `/interaction/:uid`。
2. `/interaction/:uid` 重新導向 Hosting 登入頁 `https://assetanchor-832df.web.app/connect?interaction=:uid`。
3. 登入頁以 Firebase Web SDK 登入（Email／密碼、Google popup），取得 ID token，以 `fetch` POST 到 `/interaction/:uid/firebase`（CORS 只允許 Hosting 網域；body 帶 ID token）。函式以 Admin SDK `verifyIdToken` 驗證，把「此互動已由 uid 登入」寫入 OAuth 集合（5 分鐘有效、一次性）。
4. 登入頁顯示同意畫面；使用者按「允許」→ 瀏覽器整頁 GET 到 `/interaction/:uid/confirm`（同站頂層導覽，互動 cookie 會送出）→ 函式讀取第 3 步結果、建立 Grant（scope `transactions.read`、resource = MCP 端點）、`interactionFinished` → 帶授權碼導回 Claude。按「拒絕」→ GET `/interaction/:uid/abort` → `access_denied`。

- **理由**：ID token 只經 POST body 傳遞（不進 URL 與 log）；完成互動的請求是頂層 GET，`SameSite=Lax` cookie 正常送出；函式永遠以自己驗證過的 uid 為準，不信任頁面傳入的 uid。
- **替代方案**：登入頁直接 form POST 到函式（跨站 POST 不帶 `Lax` cookie，互動會遺失）；把 ID token 放在 query string（洩漏到 log 與瀏覽紀錄）。

### D5. OAuth 儲存：單一後端專用集合 `oauth_store` + Firestore adapter

- **選擇**：實作 `oidc-provider` 的 adapter 介面（`upsert`、`find`、`findByUid`、`consume`、`destroy`、`revokeByGrantId`），全部存於頂層集合 `oauth_store`，文件 ID 為 `{model}_{id}`。到期由 Firestore TTL policy 依 `expires_at` 自動清除（TTL 刪除有延遲，adapter 讀取時另行比對 `expires_at`，過期即視為不存在）。
- **理由**：一個集合即可涵蓋所有 model，rules 只需一條全拒；TTL 免排程函式。
- **替代方案**：每個 model 一個集合（rules 與 TTL 設定倍增）；記憶體儲存（多 instance 與冷啟動會遺失）。

### D6. 只讀工具的查詢策略：單一索引篩選 + 記憶體篩選分頁

- **選擇**：`list_transactions` 以現有索引 `account_id ASC, transaction_date DESC` 查（有 `account_id` 時），否則讀取該使用者全部交易；其餘條件（`symbol`、`market`、日期）在記憶體篩選，排序後以 cursor（編碼最後一筆的 `transaction_date` + `transaction_id`）分頁。`search_symbol` 以 `symbols/{market}_{symbol}` 直接查、`symbol` 前綴範圍查詢，以及使用者交易涉及之 symbol 的名稱包含比對。
- **理由**：個人規模下讀取量小，不必為每種篩選組合新增複合索引（`firestore.indexes.json` 不變）；名稱比對只在使用者自己的 symbol 範圍內做，避免全域掃描。
- **替代方案**：為各組合新增複合索引並用 Firestore cursor（索引維護成本高，個人規模不划算）。若日後單一使用者交易量超過數千筆再改。

### D7. 工具輸出：decimal string 原樣回傳，結構化 + 文字雙輸出

- **選擇**：工具同時回傳 `structuredContent`（JSON，欄位如 spec）與一段繁中摘要文字；金額欄位為 Firestore 存的 10 位小數 string，不經 `Money` 轉 number。所有工具標記 `readOnlyHint: true`。輸入以 zod schema 驗證。
- **理由**：遵守憲法 #2；AI 讀 decimal string 不會有浮點誤差；只讀標記讓 Claude 不必為查詢跳權限提示。

### D8. `apps/web`：Vite + TypeScript，無 UI 框架

- **選擇**：新 workspace `@assetanchor/web`，Vite 打包單頁 `connect`，使用 Firebase Web SDK（modular API），樣式取 App 的 theme token 與字型；`firebase.json` 的 `hosting.public` 指向 `apps/web/dist`，predeploy 執行 build。emulator 模式依 `VITE_USE_FIREBASE_EMULATOR` 連 Auth emulator。
- **理由**：頁面只有登入與同意兩個狀態，不需要 React；納入 monorepo 的 typecheck／lint／prettier。
- **替代方案**：純 HTML + CDN SDK（不在型別與 lint 防護內）。

### D9. Secrets 與設定

- 簽章金鑰（JWKS，ID token 用；存取權杖為 opaque 不需簽章）與 cookie 金鑰以 `defineSecret` 提供（`MCP_OIDC_JWKS`、`MCP_COOKIE_KEYS`）；emulator 使用 `apps/functions/.secret.local`（不進版控）或測試用固定值。
- 允許的 CORS 來源、Hosting 網域、issuer 由 `runtimeOptions` 旁的 `mcp/config.ts` 依環境決定。

## Firestore schema 變更（對照 planning §6）

planning §6 的「整體結構」列出 `users/**`、`exchange_rates`、`quotes`、`symbols`、`price_history`。本 change **不修改任何既有集合**，只新增一個後端專用的頂層集合：

### 新增 `oauth_store/{model}_{id}`

| 欄位              | 型別              | 說明                                                                                                                                                       | 理由                                 |
| ----------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `model`           | string            | `oidc-provider` model 名稱：`Client`、`AuthorizationCode`、`AccessToken`、`RefreshToken`、`Grant`、`Interaction`、`Session`、`FirebaseLogin`（D4 第 3 步） | 單一集合承載所有 model，以此區分     |
| `payload`         | map               | `oidc-provider` 交給 adapter 的原始 payload                                                                                                                | adapter 介面要求原樣存回             |
| `account_id`      | string \| null    | 權杖所屬的 Firebase uid（取自 `payload.accountId`）                                                                                                        | 管理者依使用者作廢；建單欄位索引即可 |
| `grant_id`        | string \| null    | `payload.grantId`                                                                                                                                          | `revokeByGrantId` 需以此查詢         |
| `interaction_uid` | string \| null    | `payload.uid`                                                                                                                                              | `findByUid` 需以此查詢               |
| `consumed_at`     | timestamp \| null | 授權碼／refresh token 被使用的時間                                                                                                                         | 一次性使用判定                       |
| `expires_at`      | timestamp         | 到期時間                                                                                                                                                   | Firestore TTL policy 依此自動刪除    |

- **Rules**：`match /oauth_store/{docId} { allow read, write: if false; }`，只有 Admin SDK 可存取。
- **三端影響**：mobile 不讀不寫（無影響）；functions 讀寫（`mcp` 函式）；shared 無影響（型別留在 functions 內）。
- **與 planning §6 的差異**：§6 未涵蓋第三方用戶端授權。此集合不含任何財務資料、不參與持倉計算，archive 時同步更新 §6「整體結構」與 §7 rules 段落。

## Risks / Trade-offs

- [Functions 預先解析 request body] → spike 已驗證：`oidc-provider` 偵測到已解析的 body 會改用 `req.body`（JSON 與 form 皆可），只在 log 印一次提醒。
- [`oidc-provider` 為純 ESM，functions 輸出 CJS] → spike 已驗證：MCP SDK v2 套件同時提供 CJS；`oidc-provider` 維持 external（列在 dependencies），由 Node 22 的 `require(esm)` 載入，本機 Node 22.22 與 emulator 皆可。
- [資源 scope 與 OIDC scope 混淆] → spike 發現：`transactions.read` 若列在 provider 的 `scopes`，會被當成 OIDC scope 而反覆要求同意；只在 `resourceIndicators.getResourceServerInfo` 宣告，`scopes` 只放 `offline_access`。
- [Hosting rewrite 到函式可能緩衝或逾時（60 秒）] → MCP 端點用 JSON 回應模式（不開 SSE），只讀工具都在數秒內完成。
- [`oidc-provider` 設定錯誤造成安全漏洞] → 以整合測試覆蓋 spec 的每個情境（PKCE 缺失、授權碼重用、redirect URI 檢查、過期、作廢、跨使用者存取）；ADR 記錄設定理由。
- [不掛 App Check 的端點可被任意呼叫] → 未帶有效權杖一律 401，不讀 Firestore；`maxInstances: 3` 限制擴展；DCR 註冊會寫 Firestore，以 IP 層級的簡單頻率限制（每 IP 每分鐘數次）防灌。
- [TTL 刪除最長可延遲約 24 小時] → adapter 讀取時自行判斷 `expires_at`，過期資料不會被當成有效。
- [Claude 移除 connector 不一定通知我們，權杖仍有效到過期（決策 A4）] → 存取權杖僅 1 小時；refresh 最長 30 天；管理者可依 runbook 作廢。
- [Claude 改採新的用戶端識別方式（例如 Client ID Metadata Document）] → `oidc-provider` 持續維護，可隨版本升級；目前 Claude 支援 DCR。

## Migration Plan

1. 本機：emulator（Auth、Firestore、Functions、Hosting）完整跑通；Claude Code 與 MCP Inspector 連 `http://localhost:5000/mcp` 驗證三個工具。
2. owner gate：審核 schema（`oauth_store`）、ADR-0011、rules；建立 secrets（`firebase functions:secrets:set`）、部署 `firestore:indexes`（`fieldOverrides` 內含 `oauth_store.expires_at` 的 TTL policy）、在 Firebase Auth 授權網域確認 Hosting 網域。
3. owner 部署：`firebase deploy --only hosting,functions:mcp,firestore:rules`。
4. owner 在 claude.ai 新增 custom connector（`https://assetanchor-832df.web.app/mcp`），以自己的帳號完成授權與三個工具的驗收。
5. **回滾**：刪除 `mcp` 函式（`firebase functions:delete mcp`）即關閉入口；Hosting 回到前一版；`oauth_store` 可保留（無用戶端存取）或整批刪除。既有 App 功能完全不受影響。

## Open Questions

- DCR 頻率限制的實際門檻與實作位置（Express middleware 以記憶體計數即可，或需 Firestore 計數）——apply 時依 spike 結果決定，不影響 spec。
- connector 在 claude.ai 顯示的名稱與圖示（`oidc-provider` 的 client metadata 由 Claude 提供，我們端只有 MCP server 名稱 `assetanchor`）。
