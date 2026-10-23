# MCP connector 營運手冊（部署、secrets、作廢、回滾）

> 架構與決策：ADR-0011、`docs/architecture.md` 圖三。本手冊列出只有 owner 能做的操作（部署、secrets、console 設定）。所有指令在 repo 根目錄執行。

## 一次性準備

1. **註冊 Web App**（登入頁需要 Firebase Web 設定）：Firebase console → 專案設定 → 一般 → 「新增應用程式」→ Web，名稱 `AssetAnchor Connect`，不需勾選 Hosting 設定。Hosting 會自動由 `/__/firebase/init.json` 提供設定。
2. **Auth 授權網域**：Authentication → Settings → Authorized domains 確認含 `assetanchor-832df.web.app`（預設已含）。Google 登入在此網域即可使用。
3. **建立 secrets**（Secret Manager，免費額度內）：

   ```bash
   node apps/functions/scripts/generate-mcp-secrets.mjs cookie | firebase functions:secrets:set MCP_COOKIE_KEYS --data-file - --project assetanchor-832df
   node apps/functions/scripts/generate-mcp-secrets.mjs jwks   | firebase functions:secrets:set MCP_OIDC_JWKS   --data-file - --project assetanchor-832df
   ```

   產生的值不要存檔、不要貼到任何地方。

## 部署

`mcp` 的 Cloud Run 網址是固定格式 `https://mcp-<專案編號>.asia-east1.run.app`，部署前就能確定，所以 issuer 已寫在 `apps/functions/.env.assetanchor-832df`（只含公開網址，已 commit），一次部署即可。

1. 部署 rules、索引（含 `oauth_store.expires_at` TTL）、函式與 Hosting：

   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,functions:mcp,hosting --project assetanchor-832df
   ```

   之後只改函式時用 `--only functions:mcp`；只改登入頁時用 `--only hosting`。

2. 冒煙測試：

   ```bash
   curl -s https://assetanchor-832df.web.app/.well-known/oauth-protected-resource/mcp
   curl -s https://mcp-269986802776.asia-east1.run.app/.well-known/oauth-authorization-server | head -c 300
   curl -si -X POST https://assetanchor-832df.web.app/mcp | grep -i www-authenticate
   curl -s -X POST https://mcp-269986802776.asia-east1.run.app/reg -H 'Content-Type: application/json' \
     -d '{"redirect_uris":["http://localhost:1/cb"],"token_endpoint_auth_method":"none","scope":"transactions.read transactions.write"}' | head -c 120
   ```

   預期：第一個回 `authorization_servers` = Cloud Run 網址；第二個回含 `authorization_endpoint` 的 JSON；第三個回 401 且帶 `resource_metadata`；第四個回含 `client_id` 的 JSON（Claude 註冊時會帶 scope，不能被拒）。

## Claude 驗收

1. claude.ai → Settings → Connectors → Add custom connector，名稱 `AssetAnchor`，URL `https://assetanchor-832df.web.app/mcp`。
2. 按 Connect → 瀏覽器開登入頁 → 用 App 帳號登入 → 允許。
3. 在對話中請 Claude「列出我的 AssetAnchor 帳戶」「查我 2025 年的台積電交易」「0050 的代號是什麼」，確認三個工具都正確。

## 升級後已連線使用者需重新授權

`add-mcp-transaction-import` 起權杖多了 `transactions.write`。在此之前連線的使用者，呼叫匯入工具會收到「請在 Claude 重新連線 AssetAnchor 以授權寫入」；在 claude.ai 的 connector 設定中中斷後重新連線即可，只讀工具不受影響。

## 匯入驗收

在 claude.ai 上傳一張券商交易截圖，請 Claude「把這些交易匯入 AssetAnchor 的〈帳戶名稱〉」。預期 Claude 先呼叫 `validate_transactions` 並逐列列出讓你確認，確認後才呼叫 `create_transactions`；App 交易列表即時出現新交易。可再請 Claude「列出剛剛那批匯入」驗證 `import_batch_id` 查詢。

## 修改與刪除驗收

在 claude.ai 請 Claude「把剛剛那批匯入的第一筆數量改成 500」與「刪掉剛剛那批匯入」。預期 Claude 先呼叫 `preview_update_transaction`／`preview_delete_transactions` 列出內容讓你確認，claude.ai 也會在執行破壞性工具前跳出確認；完成後 App 即時反映。

## 作廢某使用者的所有權杖（緊急）

使用者回報授權外洩、或需要強制登出 Claude 連線時：

```bash
cd apps/functions
GOOGLE_CLOUD_PROJECT=assetanchor-832df node -e "
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp();
const db = getFirestore();
db.collection('oauth_store').where('account_id', '==', process.argv[1]).get().then(async (s) => {
  for (const d of s.docs) await d.ref.delete();
  console.log('revoked', s.size);
});" <UID>
```

需要本機已 `gcloud auth application-default login` 且有該專案權限。等同程式中的 `revokeAllForAccount`；執行後該使用者的存取權杖與 refresh token 立即失效。

## 輪替 cookie 金鑰

重新產生並設定 `MCP_COOKIE_KEYS` 後重新部署 `functions:mcp`。進行中的授權（10 分鐘內）會失敗，使用者重新連線即可；已發出的存取權杖不受影響。

## 回滾

| 情境                | 做法                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 關閉 MCP 入口       | `firebase functions:delete mcp --region asia-east1 --project assetanchor-832df`（Hosting 的 `/mcp` 會回錯誤，App 不受影響） |
| 登入頁有問題        | Firebase console → Hosting → 版本紀錄 → 回滾到前一版                                                                        |
| 清掉所有 OAuth 狀態 | 刪除 `oauth_store` 集合（所有 Claude 連線需重新授權）                                                                       |

## 監控

- `firebase functions:log --only mcp`：`mcp tool failed`（工具錯誤，附 uid 與工具名）、`mcp app init failed`（設定或 secrets 錯誤）、`mcp interaction confirm failed`。
- Firestore `oauth_store` 文件數異常暴增 → 檢查是否有人灌動態註冊（註冊端點每 IP 每分鐘 10 次、每個 instance 各自計算）。
