# Runbook：TestFlight 上線（iOS）

> 首次走完日期：2026-07-07（0.0.1 build #5）。本文件記錄可重複的發版流程與首發踩過的坑。
> 花錢／部署／真機屬人類介入 gate（planning §2.5）——每次執行前仍須 owner 逐字授權。

## 前置條件（一次性，已就緒）

- Apple Developer Program 生效，Team `XBWL62Y664`（Individual）
- EAS 登入 `sean.ys`，projectId 已設於 `app.config.ts`（PR #30）
- EAS production 環境已有 file 機密 `GOOGLE_SERVICES_PLIST`（`eas env:list production` 可驗）
- iOS distribution 憑證＋provisioning profile 由 EAS 代管（2026-06-24 配置）
- ASC app record：`AssetAnchor`，**ascAppId `6783860980`**（已回填 `eas.json` submit profile）
- ASC API key `72WAMTT8XK`（APP_MANAGER 權限，存 EAS 雲端）——EAS Submit 自動使用，本機 `.secrets/AuthKey_KFPGMZGBHC.p8` 未用到

## 發版流程（每次）

```bash
# 0. 確認 main 是要發的版本，且 production functions 與 app 相容
# 1. 🛑 owner 授權後：部署後端（functions + rules + indexes）
firebase deploy --project assetanchor-832df --non-interactive

# 2. 煙霧測試（報價層是上線命脈）
curl "https://asia-east1-assetanchor-832df.cloudfunctions.net/fetchQuote?market=US&symbol=AAPL&currency=USD"
curl "https://asia-east1-assetanchor-832df.cloudfunctions.net/fetchQuote?market=TW&symbol=2330&currency=TWD"
# 期望 {"ok":true,...}；並用 firebase functions:log 掃 scheduledUsdRate 有無連續失敗

# 3. 🛑 owner 授權後：雲端 build（~15-25 分鐘；autoIncrement 自動遞增 build number）
cd apps/mobile && eas build -p ios --profile production --non-interactive --no-wait
#（--no-wait 後用 eas build:view <id> --json 輪詢 status 到 FINISHED）

# 4. Submit（ascAppId 已在 eas.json，全程非互動）
eas submit -p ios --latest --non-interactive

# 5. Apple 處理 5-10 分鐘（會寄 email）→ TestFlight 可裝
# https://appstoreconnect.apple.com/apps/6783860980/testflight/ios
```

## 首發踩過的坑（2026-07-07）

1. **Eventarc 首用需權限傳播**：專案第一次部署事件觸發 function（`onSymbolCreatedFetchQuote`）
   會因「Permission denied while using the Eventarc Service Agent」失敗；等 2–3 分鐘後
   `firebase deploy --only functions:onSymbolCreatedFetchQuote` 重試即成功。
2. **非互動 submit 需 `ascAppId`**：app record 無法用 API 建立，首次必須 owner 在**自己的終端機**
   互動跑 `eas submit`（Apple ID 登入；Claude Code session 內 `!` 指令 stdin 不可互動）。
   建立後回填 `eas.json` 即可全自動。API key 權限選 **APP_MANAGER**（最小權限）。
3. **Yahoo 429 未發生**：production（GCP asia-east1 IP）直打 Yahoo 報價正常——ADR-0010 的
   誠實 UA 策略在雲端有效。持續觀察即可。
4. **台銀匯率源已死（待修）**：`rate.bot.com.tw` 全站（含 CSV 端點）自 ~2026-06-30 起對
   非瀏覽器 client 回 anti-bot JS challenge，`scheduledUsdRate` 每日 08:30 UTC 必失敗，
   production `exchange_rates` 停在 2026-06-29。app 以最近一日匯率 fallback 不會壞，
   但需換資料源（候選：Yahoo `TWD=X`，provider 已於 production 驗證可用）。

## TestFlight 內部測試：加測試員

內部測試（≤100 人、免 Beta App Review、build 處理完即可測）；EAS 已自動建立群組 **Team (Expo)**。

1. [App Store Connect](https://appstoreconnect.apple.com) → 使用者與存取 → 邀請朋友
   （email 需是其 Apple ID；角色給最低的即可，如 Customer Support）
2. 朋友接受邀請後：App → TestFlight → 內部測試群組 → 加入該成員
3. 朋友手機裝 [TestFlight app](https://apps.apple.com/app/testflight/id899247664) → 收到邀請即可安裝

> 若之後想用「公開連結」廣發（不用逐一邀進團隊），改開**外部測試**群組——首個 build 需過
> Beta App Review（約 1–2 天）。

## 發版後驗收（owner 真機）

- [ ] 安裝 TestFlight build，登入（email/密碼）
- [ ] **Google 登入 runtime 驗證**（延宕項：Simulator 時代無法驗，首次真機必補）
- [ ] 持倉頁報價即時載入（驗 production functions 接線）
- [ ] 走勢圖各 range 有資料（`ensureHistory`/`fetchIntraday`）
- [ ] 新增交易 → 持倉重算正確
- [ ] 多幣別總值換算（注意：匯率暫為 06-29 舊值，修復前屬已知現象）
