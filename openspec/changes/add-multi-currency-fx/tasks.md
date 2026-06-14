## 1. packages/shared — 交易 schema 攤平（TDD 重構）

- [x] 1.1 改 `buildTransactionDoc.test.ts`：斷言 flat 欄位（`currency`/`price`/`total`/`fee`/`tax`、無 `amounts`/`amounts_status`），先紅燈
- [x] 1.2 攤平 `types/transaction.ts`：移除 `TransactionAmount`/`AmountsMap`/`amounts`/`amounts_status`，新增頂層 `currency`+`price`/`total`/`fee`/`tax`（`original_currency`→`currency`）
- [x] 1.3 `schemas/transaction.ts`：`original_currency`→`currency`（驗證邏輯不變），更新 `schemas/transaction.test.ts`
- [x] 1.4 `buildTransactionDoc.ts` 改組 flat 欄位，test 綠燈
- [x] 1.5 改 `deriveHoldings.test.ts`：讀 flat 欄位、混幣別防護用 `currency`，先紅燈
- [x] 1.6 `deriveHoldings.ts` 改讀 `tx.total`/`tx.fee`/`tx.tax`/`tx.currency`（§4 台積電 avg=550.76 fixture 綠燈）
- [x] 1.7 全 shared `typecheck` / `lint` / `test:coverage`（≥90%）綠

## 2. apps/mobile — 跟隨 schema 攤平

- [x] 2.1 `transactionService.ts` / `TransactionForm.tsx` / 持倉畫面型別引用同步（`currency` 命名、移除 amounts 相關欄位）
- [x] 2.2 mobile `typecheck` + 既有 RNTL flow 綠（交易輸入、持倉推導不退化）

## 3. packages/shared — FX 換算純函式 + exchange_rates 型別（TDD）

- [x] 3.1 換算純函式 test（USD→TWD 用 `USD_TWD`、同幣別回傳自身、deterministic、10 位小數），先紅燈
- [x] 3.2 實作換算純函式（`convertMoney`），綠燈、納入 ≥90% gate
- [x] 3.3 新增 `exchange_rates` 文件型別（`date`/`source`/`rate_type`/`rates{USD_TWD,TWD_USD}`/`fetched_at`/`is_estimated`），自 `packages/shared` 匯出

## 4. apps/functions — runtime 打包地基（🚦 里程碑前置）

- [ ] 4.1 加依賴：`firebase-admin`、`firebase-functions`、`decimal.js`、`tsup`（或 esbuild）
- [ ] 4.2 設定 `tsup`/esbuild build：bundle `@assetanchor/shared` source、`firebase-admin`/`firebase-functions` 設 external、輸出 `lib/index.js`（`main` 指向它）
- [ ] 4.3 sanity function（用 `Money`）在 functions emulator 跑通，驗證打包後 runtime 不再 require `.ts`

## 5. apps/functions — 台銀匯率抓取（TDD）

- [ ] 5.1 BOT CSV parse 純函式 test：`L6M/USD` 頂行 → 牌告日 + `spot_sell`（本行賣出/即期）、UTF-8 BOM/CRLF、parse 失敗 fail loud，先紅燈
- [ ] 5.2 實作 parse 純函式，綠燈
- [ ] 5.3 `onSchedule`（Asia/Taipei）function：fetch `L6M/USD` → parse → Admin SDK 寫 `exchange_rates/{牌告日}`（雙向 rates、idempotent 覆寫）
- [ ] 5.4 functions emulator 整合測試：觸發 → `exchange_rates` doc 出現、形狀與雙向 rates 正確

## 6. firebase — emulator 接線 + rules 測試

- [ ] 6.1 `firebase.json` 加 functions emulator（本地工作流可跑 §4.3 / §5.4）
- [ ] 6.2 `exchange_rates` rules 測試（登入可讀、client 寫被拒、未登入不可讀）納入 CI rules job

## 7. apps/mobile — 顯示層 FX

- [ ] 7.1 `core/firestore` 加 `exchange_rates` ref helper
- [ ] 7.2 `services/exchange-rates` client：讀最新一筆（`orderBy(date desc) limit 1`）、無匯率回「未就緒」降級
- [ ] 7.3 HoldingsOverview：底部「總成本（TWD）」grand total（換算 `preferred_display_currency` 預設 TWD；原幣別小計並存；無匯率降級）
- [ ] 7.4 AssetDetail：TWD/USD segmented 切換（即時換算均價/總成本、預設原幣別、無匯率降級）
- [ ] 7.5 `i18n/zh-TW` 字串（`總成本（TWD）`、`匯率未就緒`、幣別切換 label、as-of-today 換算提示）
- [ ] 7.6 mobile 關鍵 flow RNTL（grand total 換算、AssetDetail 切換、無匯率降級）

## 8. 文件（去除 model A、保留決策軌跡）

- [ ] 8.1 改寫 planning `§5`（多幣別策略）/`§6`（交易 schema 攤平 + `exchange_rates` 用途）為 model B
- [ ] 8.2 新增 `docs/adr/0005-*.md`：A→B 翻案（Context/Decision/Consequences/Alternatives，含 per-transaction FX、GitHub Actions cron、Option A 休眠 三個 alternatives）
- [ ] 8.3 `docs/adr/0004-event-sourcing-schema.md` §3 標注「已被 ADR-0005 取代」
- [ ] 8.4 `docs/design/holdings-overview` 設計稿 §3.3 移除 AddTransaction 的「換算 USD」預覽
- [ ] 8.5 `pnpm format` 過 `design_inspiration/` + `docs/design/`（避免 CI `format:check` 擋）

## 9. 部署 + 驗收（🚦 第一個 Cloud Function 部署）

- [ ] 9.1 Firebase 專案升 Blaze + 設 budget alert（US$1）
- [ ] 9.2 `firebase deploy --only functions`
- [ ] 9.3 手動觸發一次 seed（`functions:shell` 或 dev-only HTTP wrapper）→ 確認正式 `exchange_rates` 出現
- [ ] 9.4 iOS Simulator 驗收：USD 交易 → 持倉總覽 TWD 合計 + AssetDetail 切換正確、無匯率 edge case 乾淨

## 10. 基礎建設（時效，可獨立成 infra PR）

- [ ] 10.1 （時效 2026-06-16 起 Actions 強制 Node 24）視 CI 狀況升 `actions/checkout`、`setup-node`、`pnpm/action-setup` 至相容版本，確保本 change PR 的 CI 不被擋
