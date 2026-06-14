# Sprint 4（多幣別 + 匯率）— 進度 Runbook

**狀態：✅ 完成（2026-06-14）** — 工程 + CI + 雲端部署全數完成並驗證；PR #6 已 merge 進 main。9.4 iOS Simulator 視覺驗收經 owner 決定延後（核心邏輯已 100% 單元測試 + 正式環境驗證覆蓋）。change 已 archive。

- **OpenSpec change**：`openspec/changes/add-multi-currency-fx/`（proposal / design / specs / tasks）
- **關鍵 ADR**：`docs/adr/0005-single-currency-events-display-fx.md`（取代 ADR-0004 §3）
- **分支 / PR**：`feature/multi-currency-fx` → **PR #6（開著、待 owner review + merge）**
- **Firebase 專案**：`assetanchor-832df`

## TL;DR

- **核心翻案（model A → B）**：交易改為**單幣別事件**（只記市場原幣別、不存對稱 amounts map）；匯率抽離為每日 `exchange_rates` 表；**只在顯示時用最新匯率即時換算**；不追蹤匯率損益。決策見 ADR-0005。
- **🚦 里程碑「第一個 Cloud Function」**：✅ 已部署上線（scheduledUsdRate + seedUsdRate @ asia-east1）；正式 `exchange_rates/2026-06-12` 寫入驗證通過（spot_sell 31.68、雙向、is_estimated=false）。排程每日 16:30 自動維護。
- 測試全綠：shared 139 tests / 100%、functions parse 6、rules 16/16、mobile typecheck+lint+tests、全 monorepo typecheck。
- PR #6 已 merge 進 main；CI 4/4 全綠（含 Node24 actions 升級）。change 已 archive（`archive/2026-06-14-add-multi-currency-fx`）。

## 任務狀態（10 組，對照 tasks.md）

| 組  | 內容                                                | 狀態                        |
| --- | --------------------------------------------------- | --------------------------- |
| 1   | shared 交易 schema 攤平（TDD）                      | ✅ DONE                     |
| 2   | mobile 跟隨攤平                                     | ✅ DONE                     |
| 3   | FX `convertMoney` + `exchange_rates` 型別           | ✅ DONE                     |
| 4   | functions runtime 打包（tsup bundle shared）        | ✅ DONE + emulator 驗       |
| 5   | 台銀 BOT 抓取（parse TDD + 排程/seed 函式）         | ✅ DONE + emulator live 驗  |
| 6   | functions emulator 接線 + exchange_rates rules 測試 | ✅ DONE（rules 16/16）      |
| 7   | mobile 顯示層 FX（總覽合計 + AssetDetail 切換）     | ✅ DONE（7.6 RNTL 見下）    |
| 8   | 文件（planning §5/§6 + ADR-0005 + 設計包合併）      | ✅ DONE                     |
| 9   | 部署（9.1–9.3 ✅）+ Simulator 驗收（9.4 延後）      | ✅ 部署完成；9.4 owner 延後 |
| 10  | CI actions 升 Node24 相容版本                       | ✅ DONE                     |

## 本次做了什麼（重點）

1. **schema 攤平（聖牛首次變更）**：`TransactionDocument` 移除 `amounts` map / `amounts_status` / `is_original` / `rate*`，改 flat `currency` + `price`/`total`/`fee`/`tax`。既有單幣別行為不變、§4 fixture 守門。
2. **顯示時 FX**：`convertMoney`、`totalCostIn` 純函式（shared，100% gate）；mobile `services/exchange-rates` store 讀最新一筆、無匯率優雅降級；**mobile 零新 Firebase 依賴**。
3. **第一個 Cloud Function**：`onSchedule`（Asia/Taipei 16:30）+ `seedUsdRate`（手動觸發）抓 `/L6M/USD` 即期賣出 → Admin SDK upsert `exchange_rates/{牌告日}`；**tsup 打包**把 shared bundle 進 `lib/index.js`（解 monorepo runtime require `.ts`）。
4. **BOT endpoint 實測修正**：planning 原寫 `/L6M` 無效（回「找不到資料」）、`/day` 無日期欄；正解 `/L6M/{幣別}` 取頂行（含牌告日）。
5. **設計包合併**：canonical 收斂至 `docs/design/`（刪重複舊版、`design-by-claude-web`→`design`）並對齊 model-B；`*.standalone.html`（~51MB）gitignore、`docs/design/**` 進 .prettierignore。
6. **CI Node24**：actions 升 checkout@v6 / setup-node@v6 / pnpm-action@v6（改讀 packageManager）/ setup-java@v5 / upload-artifact@v7。

## 部署紀錄（已完成）

- 升 Blaze + budget alert（~25 TWD）；`firebase deploy --only functions` 上線 scheduledUsdRate + seedUsdRate（asia-east1, nodejs22）。
- 部署踩雷修正（已 commit）：① `firebase.json`/`​.firebaserc` 移到 repo 根目錄（functions.source 須在專案目錄內）；② functions package.json 移除 `@assetanchor/shared`（workspace:\* 雲端 npm install 不支援），改 tsconfig paths + tsup esbuild alias 解析。
- 重新部署 + force-run 排程 job → 正式 `exchange_rates/2026-06-12` 寫入驗證通過。
- 排程 `scheduledUsdRate` 每日 16:30（Asia/Taipei）自動跑，匯率表自動維護。

## 後續（非阻擋，日後隨手）

- **9.4 iOS Simulator 視覺驗收**：owner 決定延後；核心顯示邏輯已 100% 單元測試 + 正式環境驗證覆蓋。日後跑 app 隨手確認「總成本（TWD）」合計、AssetDetail TWD/USD 切換、無匯率降級即可。
- **RNTL 螢幕測試 infra**：可日後獨立補（見下 Notes）。
- **`seedUsdRate` 公開性**：目前需驗證才可呼叫（403）；如需公開手動刷新端點再於 Cloud Run 開 allUsers invoker。

## Notes / 待辦

- **7.6 RNTL**：專案無既有 RNTL setup，本 sprint 未建螢幕測試 infra；關鍵 FX 邏輯已由 shared 100% gate 覆蓋，螢幕 wiring 由 typecheck + Simulator 9.4 驗收守。RNTL infra 可日後獨立補。
- **排程驗證**：`scheduledUsdRate` 在 emulator 因無 pubsub emulator 未自動觸發；邏輯與已驗證的 `seedUsdRate` 共用 `fetchAndStoreUsdRate`。部署後可等隔日自動跑或手動觸發確認。
- **`seedUsdRate`（HTTP）**：MVP 保留作 seed / 手動刷新；只寫公開 `exchange_rates`、idempotent。若不想公開可於部署後評估移除或加保護。
