# Proposal: enable-crypto-quotes

## Why

2026-07-11 dogfood 發現：新增 crypto 交易（如 BTC）後，報價鏈原樣送 `BTC` 給 Yahoo，撞上 NYSE Arca 同名 ETF，**HTTP 200 回 $28.27（非 404）**——比「查無代號」更嚴重的**靜默錯價**（真值 `BTC-USD` ≈ $64k，差約 2000 倍）寫進 `quotes/` cache，resilient-quote-display 的 404 降級（`symbol_not_found`）完全接不到。資料模型全鏈（enums / 表單 / `symbolId=CRYPTO_BTC`）本就支援 crypto，唯獨 market→Yahoo ticker 組法漏了 CRYPTO 分支；且 `parseYahooChart` 從不驗證回傳標的身分，任何市場都可能靜默拿到錯的標的價格。owner 已拍板修法（見下），對齊 planning §3（MVP 資產範圍含 crypto）與 §6 schema 紀律。

## What Changes

- **層 1｜crypto ticker 恆 `-USD`**：`toYahooSymbol` / `toYahooHistorySymbol` 補 CRYPTO 分支，組 `${symbol}-USD`（寫死 `-USD`、不可用 symbol.currency——Yahoo 無 `BTC-USDT` 會 404）。使用者只打 `BTC`，系統補後綴（同台股打 `2330` 不打 `.TW`）。覆蓋三條 call path：即時報價（`yahooProvider`）、歷史走勢（`yahooHistoryProvider`）、標的中繼資料（`symbolMetaProvider`，複用 `toYahooSymbol`）。
- **層 2｜標的身分護欄（所有市場受益）**：`parseYahooChart` 驗證 Yahoo 回傳的 `meta.symbol` 與請求的 ySymbol 一致；不一致視同 `symbol_not_found`（永久錯誤，走既有降級 UI），杜絕整類「200 但回錯標的」靜默錯價。
- **層 3｜USDT 進聖牛 schema（BREAKING——聖牛，owner 已拍板）**：
  - `packages/shared` `CURRENCIES` 加 `USDT` + 白名單測試；交易 schema `MVP_CURRENCIES` 擴為 `USD / TWD / USDT`。
  - **兩種幣別不可混**：`symbol.currency`（報價幣別）crypto 一律 USD；`transaction.currency`（交易/記帳幣別）可 USDT / USD / TWD。
  - functions `exchangeRates/fetchAndStore` 以 **1:1 釘 USD** 特判寫入 USDT 匯率鍵（`USDT_TWD=USD_TWD`、`USDT_USD=1` 等），`convertMoney` 純查表邏輯不動。
  - mobile 幣別 picker 開放 USDT；crypto 標的建立時 `symbol.currency` 固定寫 USD。
- **層 4｜市場×幣別一致性納入 CRYPTO**：CRYPTO 交易幣別**預設 USD**（表單自動同步），硬性檢核放寬為「CRYPTO 限 USD / USDT / TWD」；TW↔TWD、US↔USD 硬擋不變。
- **層 5｜混幣別記帳的推導與估值（apply 期 e2e 發現、owner 2026-07-11 拍板「簡單且資料相容」方案）**：
  - 同一標的以不同幣別記帳（如 BTC 先 TWD 後 USD）原會使 `deriveHoldings` 擲 `CurrencyMismatchError` → 全頁持倉降級為空。改為**持倉 lot 分組鍵納入幣別**（`(market, symbol, currency)` 一鍵一 lot）——同標的不同幣別為獨立持倉列，Money 永不混幣別，資料零遷移。
  - SELL 可賣數量改 per-(account, market, symbol, **currency**)——賣出只沖銷同幣別 lot。
  - **全域總覽逐-symbol 容錯**（owner 拍板併入）：HoldingsOverview / Analysis 改用容錯衍生（沿用既有 `safeHoldingsFromTxs`），單一 symbol 爛資料不再清空整個投資組合。
  - **報價幣別與成本幣別分離**：報價幣別由市場決定（`quoteCurrencyForMarket`：TW→TWD、US→USD、**CRYPTO→USD**），`quotes/{symbolId}` 文件與估值計算一律用報價幣別（修正 crypto TWD lot 把 USD 報價當 TWD 計價的靜默錯值），與成本幣別各自換算至顯示幣別（ADR-0005 顯示時換算）。

## Capabilities

### New Capabilities

（無——全為既有 capability 的需求修改。）

### Modified Capabilities

- `live-quotes`：crypto ticker 組法（`-USD`）＋回應標的身分驗證（不一致 → `symbol_not_found`）＋報價幣別由市場決定（quote doc / 估值一律報價幣別，CRYPTO 恆 USD）。
- `holdings-derivation`：持倉 lot 分組鍵納入幣別（混幣別記帳 = 獨立 lots）；可賣數量 per-currency；全域總覽逐-symbol 容錯。
- `price-history`：歷史走勢 ticker 組法補 CRYPTO 分支（`-USD`）。
- `symbol-metadata`：crypto 標的中繼資料查詢沿用 `-USD` ticker（隨層 1 生效）＋身分護欄。
- `transaction-entry`：交易幣別白名單納入 USDT；CRYPTO 市場幣別預設 USD、限 USD/USDT/TWD。
- `exchange-rates`：每日匯率文件補 USDT 釘 USD 的匯率鍵（1:1 peg）。

## Non-goals

- **CoinGecko 備援報價源**：owner 拍板 Yahoo 為主；備援翻案自 add-live-quotes Non-Goal，但**本 change 不實作**，留待後續 change。
- **既有錯價 cache 的主動修復**：部署後下一次報價抓取即以正確 ticker upsert 覆蓋 `quotes/CRYPTO_*`，不另寫遷移。
- **其他 stablecoin（USDC / DAI…）與 JPY/EUR 等 Phase 2 幣別啟用**：只加 USDT。
- **USDT 作為可持有標的**：USDT 是交易幣別，不是持倉資產；不建 `CRYPTO_USDT` symbol。
- **crypto 專屬分析/損益特化**（24/7 行情、資金費率等）：沿用既有持倉/分析管線。
- **production functions 部署本身**：屬花錢/部署 gate，change 完成後由 owner 執行。

## Impact

- **apps/functions**：`quotes/parseYahooChart.ts`（`toYahooSymbol` + 身分驗證）、`history/yahooHistoryProvider.ts`（`toYahooHistorySymbol`）、`quotes/yahooProvider.ts`（傳入預期 ySymbol）、`exchangeRates/fetchAndStore.ts`（USDT peg 鍵）。
- **packages/shared**：`enums/currencies.ts`（+USDT）、`schemas/transaction.ts`（MVP 白名單 + CRYPTO 幣別檢核）、`markets/marketConsistency.ts`（CRYPTO 預設/允許幣別）＋對應測試（enum 新增值必補測試，§13.4）。
- **apps/mobile**：`features/transactions/components/TransactionForm.tsx`（幣別 picker + CRYPTO 自動同步預設 USD）、`services/symbols/symbolsStore.ts`（crypto `symbol.currency` 固定 USD）。
- **聖牛 schema**：`CURRENCIES` / 交易幣別白名單屬 planning §6 治理範圍——三端影響已逐欄評估如上；owner 已於 2026-07-11 拍板授權（人類介入 gate 已過）。
- **風險**：舊 `exchange_rates/{date}` 文件無 USDT 鍵——顯示層用最新文件、部署後首次抓取即補齊；USDT 於補齊前換算 fail-loud（符合 ADR-0005 不臆測匯率）。
- **merge 分級**：報價 scope + 聖牛 schema + 帶 UI（picker）＝**owner 本人 merge**。
