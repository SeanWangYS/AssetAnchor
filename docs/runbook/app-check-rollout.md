# Runbook：App Check 分階段啟用（iOS App Attest）

> 對應 OpenSpec change `add-app-check`（design D4）。花錢／部署／真機／console 設定屬人類介入 gate（planning §2.5）——每一步由 owner 執行或逐字授權。
> 機制：iOS App 以 App Attest 向 Apple 證明自己是正版 App → Firebase 發 App Check token（預設 1 小時）→ Firestore 由 SDK 自動附帶、Cloud Functions 由 `functionsFetch` 加 `X-Firebase-AppCheck` header → 後端驗證。

## 現況與開關

| 對象                                                                                                  | 驗證方式                                                                | 開關位置                                                                            |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 使用者端 HTTP functions（fetchQuotes / fetchQuote / fetchIntraday / fetchSymbolMeta / ensureHistory） | `apps/functions/src/appCheck/userHttpFunction.ts` 以 Admin SDK 驗 token | `apps/functions/src/runtimeOptions.ts` 的 `APP_CHECK_MODE`（`monitor` / `enforce`） |
| Cloud Firestore                                                                                       | Firebase 自動驗證                                                       | Firebase console → App Check → APIs → Cloud Firestore → **Enforce**                 |

- **monitor**：只記錄（log `appCheck` 的 `outcome`：`verified` / `missing` / `invalid`），一律照常回應。
- **enforce**：`missing` / `invalid` 回 401 `{ ok: false, error: 'unauthorized' }`，不呼叫 Yahoo、不碰 Firestore。
- **本地 emulator**：App 不初始化 App Check、functions gate 記 `skipped`，開發完全不受影響。

## 階段 0：一次性 console 設定（owner）

1. [Firebase console](https://console.firebase.google.com/project/assetanchor-832df/appcheck) → **App Check** → **Apps** 分頁。
2. 選 iOS App（`com.seanwangys.assetanchor`）→ **App Attest** → 填 Team ID `XBWL62Y664` → Save（token TTL 維持預設 1 小時）。
3. **先不要**按任何 Enforce。

## 階段 1：monitor（PR merge 後）

1. owner：`firebase deploy --only functions --project assetanchor-832df --non-interactive`
2. owner：依 `testflight-release.md` 發新 build（含 App Attest entitlement；EAS build 會自動在 Apple Developer 開 App Attest capability）。
3. owner：手機安裝新 build，開 App 停留在持倉總覽、點一檔個股看走勢、（可選）新增一筆新代號的交易以觸發 `fetchSymbolMeta`。
4. 驗證（Claude 可代做）：
   ```bash
   npx firebase-tools functions:log --project assetanchor-832df -n 300 | grep '"appCheck"'
   ```
   期望新 build 的請求皆為 `"outcome":"verified"`；`missing` 代表 App 沒拿到 token（檢查 entitlement / console 註冊 / Sentry 的 `appcheck:init`、`appcheck:token` 事件）。
5. owner：console → App Check → **APIs** → Cloud Firestore 指標，確認「已驗證的請求」有數字、「未驗證」只剩舊 build 或無。

## 階段 2：enforce（有 verified 證據後）

1. 開小 PR：`APP_CHECK_MODE = 'enforce'`（owner merge）→ owner 部署 functions。
2. owner：console → App Check → APIs → Cloud Firestore → **Enforce** → 確認（最多 15 分鐘生效）。
3. 煙霧測試：
   ```bash
   # 沒帶 token → 401
   curl -s -o /dev/null -w '%{http_code}\n' "https://asia-east1-assetanchor-832df.cloudfunctions.net/fetchQuotes?items=US:AAPL:USD"
   ```
   期望 `401`；手機 App 仍能正常載入報價、走勢、交易清單。

## 回退

- Functions：`APP_CHECK_MODE` 改回 `'monitor'` → 部署。
- Firestore：console → App Check → APIs → Cloud Firestore → **Unenforce**。

## 已知限制

- 舊版 TestFlight build（沒有 App Check）在 enforce 後會被擋——目前只有 owner 一位使用者，於階段 1 已換新 build。
- 模擬器的 dev build 若改連正式環境（非 emulator），enforce 後會被擋；需要時再加 debug provider + console debug token。
- App Check 擋的是「非正版 App 的呼叫」，擋不住用正版 App 的高頻操作（那是 rate limit，見 backlog）。
