## 1. Spike：驗證三個技術風險（失敗即停下找 owner）

- [x] 1.1 在 `apps/functions/src/mcp/` 建最小 Express app，以 `onRequest` 匯出 `mcp`，確認 functions emulator 能以 tsup CJS bundle 載入 `oidc-provider` 與 `@modelcontextprotocol/*`（ESM）；記錄採 bundle 或 external + `require(esm)`
- [x] 1.2 驗證 `oidc-provider` 在 Functions 預先解析 body 的情況下能正確處理 `/oauth/token` 與註冊端點的 POST
- [x] 1.3 驗證 D3 網域配置：Hosting emulator 把 `/mcp` 與 `/.well-known/oauth-protected-resource/**` rewrite 到函式可用；互動 cookie 在函式網址上的 D4 流程（fetch POST → 頂層 GET）能完成
- [x] 1.4 將 spike 結論寫回 design.md（Risks 與 D3／D4 若需調整），清掉 spike 程式碼中的實驗分支

## 2. ADR、schema 與 rules（owner gate）

- [x] 2.1 撰寫 `docs/adr/0011-mcp-server-and-oauth.md`（Context／Decision／Consequences／Alternatives：OAuth 取代 App Check、`oidc-provider` 選型、網域配置、權杖存放、安全護欄、4 個 change 分期）
- [x] 2.2 先寫 rules 測試：已登入使用者讀寫 `oauth_store/*` 皆被拒、未登入亦被拒
- [x] 2.3 在 `firebase/firestore.rules` 新增 `oauth_store` 全拒規則，`pnpm --filter @assetanchor/firebase test:rules` 綠
- [x] 2.4 `firestore.indexes.json` 為 `oauth_store` 的 `account_id`、`grant_id`、`interaction_uid` 查詢加入所需索引設定（單欄位若預設即可則記錄不需新增）——結論：單欄位等值查詢用預設索引；以 `fieldOverrides` 設定 `expires_at` TTL 並讓 `payload` 不建索引

## 3. Runtime limits（TDD）

- [x] 3.1 先改 `runtimeOptions.test.ts`：新增 `MCP_HTTP = ['mcp']` 分類、斷言 `maxInstances: 3`、`asia-east1`；App Check 斷言改為「除 `mcp` 外的使用者端 HTTP 函式皆帶 gate、`mcp` 不帶」
- [x] 3.2 在 `runtimeOptions.ts` 新增 `MCP_HTTP_OPTIONS`（region、`maxInstances: 3`、secrets；不設 CORS 全開）並讓 `mcp` 使用，測試綠

## 4. OAuth 儲存 adapter

- [x] 4.1 先寫純函式測試：文件 ID 組成（`{model}_{id}`）、payload → 文件欄位對映（`account_id`、`grant_id`、`interaction_uid`、`expires_at`）、過期判定
- [x] 4.2 實作純函式使測試通過
- [x] 4.3 實作 Firestore adapter（`upsert`／`find`／`findByUid`／`consume`／`destroy`／`revokeByGrantId`），讀取時過期即回 `undefined`
- [x] 4.4 以 Firestore emulator 寫 adapter 整合測試（含 `consume` 一次性、`revokeByGrantId` 連帶刪除）

## 5. 授權伺服器

- [x] 5.1 建立 `mcp/config.ts`：依環境決定 issuer、Hosting 網域、MCP resource URL、允許的 CORS 來源；emulator 用開發金鑰，正式環境讀 `MCP_OIDC_JWKS`、`MCP_COOKIE_KEYS` secrets（缺少即 500）
- [x] 5.2 設定 `oidc-provider`：DCR（無 initial access token、redirect URI 只收 https 與 localhost）、強制 S256 PKCE、`resourceIndicators`（opaque、綁 MCP resource、scope `transactions.read`）、存取權杖 1h、refresh 輪替且絕對期限 30 天、授權碼 10 分鐘、關閉 `devInteractions`
- [x] 5.3 實作互動路由：`/interaction/:uid`（導向登入頁）、`/interaction/:uid/firebase`（CORS 限 Hosting、`verifyIdToken`、寫 `FirebaseLogin` 一次性紀錄）、`/interaction/:uid/confirm`（建立 Grant、`interactionFinished`）、`/interaction/:uid/abort`（`access_denied`）
- [x] 5.4 註冊端點加上以 IP 計數的簡單頻率限制
- [x] 5.5 以 supertest 對 emulator 寫整合測試，涵蓋 `mcp-authorization` 每個 scenario（metadata、DCR 合法／不合法、缺 PKCE、授權碼重用、偽造 ID token、拒絕、過期、續期輪替、30 天上限、管理者作廢）

## 6. 登入頁 `apps/web`

- [x] 6.1 建立 workspace `@assetanchor/web`（Vite + TypeScript、eslint、prettier、`typecheck`／`lint`／`build` scripts），確認 `pnpm -r typecheck`、`pnpm -r lint` 涵蓋
- [x] 6.2 實作 `connect` 頁：讀 `interaction` 參數、Email／密碼與 Google 登入（Firebase Web SDK modular）、emulator 模式連 Auth emulator、繁中錯誤訊息
- [x] 6.3 實作同意畫面：說明「Claude 將可讀取你的帳戶與交易」、「允許」／「拒絕」，套用 App theme 配色與字型
- [x] 6.4 `firebase.json` 新增 `hosting`（public `apps/web/dist`、predeploy build、`/mcp` 與 `/.well-known/oauth-protected-resource/**` rewrite 到 `mcp`、asia-east1）與 Hosting emulator port

## 7. MCP 端點

- [x] 7.1 掛上 `mcpAuthMetadataRouter` 與 `requireBearerAuth`（verifier 以 `oidc-provider` 查 AccessToken、檢查 resource 與 scope），未帶權杖回 401 + `resource_metadata`
- [x] 7.2 建立無狀態 Streamable HTTP（JSON 回應模式）的 `McpServer`（名稱 `assetanchor`），每個請求以權杖的 uid 建立工具上下文
- [x] 7.3 統一工具錯誤處理：繁中訊息、`isError: true`、log 帶 uid 與工具名稱、不洩漏內部細節

## 8. 只讀工具（純函式先 TDD）

- [x] 8.1 先寫測試：交易篩選（symbol／market／日期含端點）、新到舊排序、cursor 編碼與解碼、每頁上限 100／預設 50、日期驗證錯誤訊息
- [x] 8.2 實作上述純函式使測試通過
- [x] 8.3 先寫測試：symbol 候選排序（代號完全相符 → 前綴 → 名稱包含）、最多 10 筆
- [x] 8.4 實作 symbol 比對純函式使測試通過
- [x] 8.5 實作 `list_accounts`（啟用篩選、`display_order` 排序、無帳戶提示）
- [x] 8.6 實作 `list_transactions`（D6 查詢策略、decimal string 原樣輸出、他人帳戶 ID 回「找不到帳戶」）
- [x] 8.7 實作 `search_symbol`（直接查、前綴查、使用者 symbol 名稱比對，不建立 symbol）
- [x] 8.8 以 emulator 寫工具整合測試，涵蓋 `mcp-server` 每個 scenario（含跨使用者存取、作廢後 401、`tools/list` 只讀標記）

## 9. 本機端到端驗證與文件

- [x] 9.1 更新 `docs/runbook/local-testing.md`：起 emulator（含 functions、hosting）、以 MCP Inspector 與 Claude Code 連 `http://localhost:5000/mcp`、種子帳號授權
- [x] 9.2 以 Claude Code 實際走完 OAuth 授權並呼叫三個工具（種子帳號），記錄結果——改以無頭 Chrome（CDP）在 emulator 上跑真實瀏覽器流程：`/auth` → 登入頁 Email 登入 → 同意 → 帶授權碼導回 `claude.ai/api/mcp/auth_callback`（2026-10-23 通過）；工具呼叫由 `test:integration` 以相同 HTTP 流程覆蓋。Claude Code 實機連線步驟見 local-testing §C
- [x] 9.3 新增 `docs/runbook/mcp-operations.md`：secrets 建立、TTL policy 設定、部署指令、管理者作廢某使用者權杖的步驟、回滾步驟
- [x] 9.4 更新 `docs/architecture.md`：加入 Claude → Hosting → `mcp` 函式 → Firestore 的元件與授權流程

## 10. DoD 與交付

- [ ] 10.1 `pnpm -r typecheck`、`pnpm -r lint`、`pnpm exec prettier --check .`、`pnpm --filter @assetanchor/shared test:coverage`、functions 測試、rules 測試全綠
- [ ] 10.2 開 PR（高風險：schema／安全／部署，owner merge），PR 內列出 owner gate 清單：審 `oauth_store` schema 與 ADR-0011、建立 secrets、設定 TTL policy、確認 Auth 授權網域、部署 hosting／functions／rules
- [ ] 10.3 owner 部署後，在 claude.ai 新增 connector 完成授權與三個工具驗收；Hosting 登入頁瀏覽器目視驗收
- [ ] 10.4 `/opsx:archive`，同步 specs；更新 planning §6 整體結構與 §7 rules 段落
