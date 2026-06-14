## Why

Sprint 4（planning doc §13.2）要交付「跨幣別檢視」能力。但本 change 同時**翻轉 planning §5 與 ADR-0004 §3 的核心決策**：原設計用「對稱式多幣別 `amounts` map」在交易發生時就把交易日匯率焊進每筆交易（歷史保真）。經 owner 拍板，本 App **不追蹤匯率損益**——交易事件只記市場原幣別（台股 TWD、美股 USD），匯率換算抽離為一張獨立的每日匯率表，僅在「顯示/分析跨幣別合計」時以**最新匯率**即時換算（as-of-today 快照）。

此哲學讓交易寫入路徑、匯率抓取、edge case 全面簡化（不需交易時抓匯率、不需 PENDING/COMPLETE 狀態機、不需歷史 `/L6M` 抓取、不需 16:00 placeholder 精算），且與 Sprint 3 既有的單幣別實作天然相容（既有程式碼本來就只寫單幣別子集）。決策脈絡完整記錄於 ADR-0005。

## What Changes

- **BREAKING（stored schema，聖牛 §6）**：交易文件攤平——移除 `amounts` map、`amounts_status`、`is_original`、`rate`/`rate_source`/`rate_type`/`rate_date`，改為 flat `currency` + `price`/`total`/`fee`/`tax`。逐欄三端影響評估見 design.md。
- 新增 `apps/functions` **第一個 Cloud Function**：每日排程抓台銀 BOT CSV（即期賣出 `spot_sell`）→ 寫 `exchange_rates/{date}`（累積歷史、全使用者共用、Admin SDK 寫、client 唯讀）。🚦 對應 §13.3「第一個 Cloud Function 部署」里程碑。
- 建立 monorepo **functions runtime 打包**（esbuild/tsup，把 `@assetanchor/shared` bundle 進 functions 輸出，解決 `index.ts` 留的 runtime require `.ts` 問題）。
- 新增 **functions emulator** 接線（`firebase.json` + 本地工作流）。
- 新增**顯示時 FX 換算純函式**（`packages/shared`），讀最新 `exchange_rates`。
- **AssetDetail** 新增 TWD/USD 幣別切換（即時換算均價 / 總成本）。
- **持倉總覽** 新增「總成本（TWD）」跨幣別 grand total（`preferred_display_currency` 預設 TWD），與各市場原幣別小計並存。
- 文件：改寫 planning §5/§6 為 model B；新增 **ADR-0005**（記錄 A→B 翻案、alternatives 含 per-transaction FX 與 GitHub Actions 排程）；ADR-0004 §3 標注 superseded；更新 `docs/design/holdings-overview` 設計稿 §3.3（移除 AddTransaction 的 USD 換算預覽）。

## Capabilities

### New Capabilities

- `exchange-rates`: 每日匯率抓取與儲存。Cloud Function 抓 BOT CSV、parse `spot_sell`、以 `Money` 序列化寫 `exchange_rates/{date}`；後端唯寫 / client 唯讀的安全模型；functions runtime 打包與 emulator/部署工作流。
- `currency-display`: 顯示時匯率換算。讀最新 `exchange_rates` 的純函式換算層、AssetDetail TWD/USD 切換、持倉總覽 TWD 跨幣別總成本合計（不落地、即時計算）。

### Modified Capabilities

- `transaction-entry`: 交易文件儲存形狀**攤平**——移除對稱 `amounts` map / `amounts_status` / `rate*` / `is_original`，改為單幣別 flat 欄位（`currency` + `price`/`total`/`fee`/`tax`）。zod 輸入子集與純 builder seam 維持。**BREAKING**。
- `holdings-derivation`: `deriveHoldings` 改讀攤平後的 flat 欄位（聚合行為、加權均價、混幣別防護不變）；移除「不跨幣別加總（Sprint 4）」placeholder（跨幣別合計移交 `currency-display`）。

## Impact

- **packages/shared**：`types/transaction.ts`（攤平）、`schemas/transaction.ts`、`transactions/buildTransactionDoc.ts`、`portfolio/deriveHoldings.ts` 及各自測試；新增 FX 換算純函式 + 測試；新增 `exchange_rates` 文件型別。
- **apps/functions**：第一個函式實作、esbuild/tsup 打包設定、Jest + emulator 測試；新增依賴（`firebase-admin`、`firebase-functions`、`decimal.js`、CSV/fetch parse）。
- **firebase**：`firebase.json` 加 functions emulator；`firestore.rules` 的 `exchange_rates`（read-if-auth / write-false）已存在，補 client-write-denied rules 測試。
- **apps/mobile**：`features/holdings`（Overview grand total、AssetDetail toggle）、`services/exchange-rates` client（讀最新 rate）、`core/firestore` exchange_rates ref helper、`i18n/zh-TW` 字串。
- **docs**：planning §5/§6 改寫、ADR-0005 新增、ADR-0004 §3 註記 superseded、設計稿 §3.3 更新。
- **部署 / 成本**：Firebase 專案需升 **Blaze**（部署 Functions + 對外 HTTP）；用量在免費額度內（每日 1 次排程、Cloud Scheduler 前 3 job 免費），預期帳單 $0；設 budget alert 防呆。

## Non-goals

對齊 MVP 邊界（planning §3 / §13.2），本 change **明確排除**：

- **不追蹤匯率損益、不存每筆交易的歷史台幣值**（owner 拍板放棄；未來若需報稅佐證，可由每日累積的 `exchange_rates` + `transaction_date` 重建）。
- **不做市值 / 未實現損益 / 今日損益 / 總資產 Hero / 總報酬率**（需報價，Sprint 5）。
- **不做走勢圖、時間 tabs**（需歷史淨值，第二階段）。
- **不在持倉總覽加幣別切換鈕**（切換只在 AssetDetail；改 `preferred_display_currency` 的 Settings 為 Sprint 6）。
- **不支援 USD / TWD 以外幣別**（schema 與 enum 已預留，未啟用）。
- **不細分匯率買賣方向**（MVP 單一 `spot_sell` 基準，planning §5；買入/現金匯率為第二階段）。
- **SELL / 已實現損益、bottom-sheet 化 AddTransaction、dark reskin**（Sprint 5 / 後續）。
