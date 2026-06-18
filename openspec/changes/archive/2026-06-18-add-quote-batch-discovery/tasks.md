## 1. functions：批次端點 fetchQuotes（②）

- [x] 1.1（先測）`parseBatchInput`：7 單元測試——多筆合法、非法項剔除保留合法、去重、全數非法→false、空→false、超上限→false、uppercase/trim（pure 檔，不依賴 firebase）
- [x] 1.2 實作 `parseBatchInput.ts`（pure）+ `fetchQuotes.ts`（onRequest handler，`Promise.all` 重用 `getOrFetchQuote`、逐筆 try/catch 錯誤隔離、回結果陣列）
- [x] 1.3 `index.ts` 匯出 `fetchQuotes`

## 2. functions：事件驅動發現 onSymbolCreated（③）

- [x] 2.1（先測）`symbolDocToQuoteTarget`：單元測試——合法 doc→target、缺欄位→null、非法 enum→null、uppercase/trim
- [x] 2.2 實作 `symbolDocToQuoteTarget.ts`（pure）+ `onSymbolCreated.ts`（`onDocumentCreated('symbols/{symbolId}')` handler，合法則 `getOrFetchQuote` 抓首筆、fail-soft log 不擲）
- [x] 2.3 `index.ts` 匯出觸發器
- [x] 2.4 functions jest 加 moduleNameMapper（`.js`→無副檔名）讓測試可引用 shared value；functions test 5 suites / 29 tests 綠、typecheck 綠

## 3. mobile：loadFor 改走批次（③ 的消費端，stacked on change 1）

- [x] 3.1（先測）純 helper `quotesBatch.ts`：`buildFetchQuotesUrl` / `parseFetchQuotesResponse` 單元測試（URL 整串 encode、ok 回應 map、error/缺 price 筆略過、fetchedAtMs 回退、非 ok/格式錯→{}）；納入 mobile coverage gate
- [x] 3.2 `quotesStore.loadFor`：改兩段式——Phase1 分類（in-mem/Firestore 新鮮判定、過期降級候選），Phase2 單次 `triggerFetchQuotes`（N→1）+ 分配回填；**完整保留 change 1 的過期保留 / 降級 fallback / in-mem 只增不刪**
- [x] 3.3 移除已被批次取代的 mobile 單檔 `triggerFetchQuote`（後端 `fetchQuote` 端點保留）；quotes barrel export 不變

## 4. ADR 增補 + 驗證收尾

- [x] 4.1 `docs/adr/0006-quote-cache-strategy.md` 補「增補（2026-06）：批次讀 fetchQuotes + 事件驅動發現 onDocumentCreated(symbols)，仍屬架構 A、非排程」
- [x] 4.2 全綠：`pnpm -r typecheck` ✓、functions test 29 ✓、mobile test:coverage 18（全域 93%）✓、mobile/functions lint ✓、prettier ✓
- [ ] 4.3（可選 dogfood）`emulators:fn` 起 functions 模擬器，curl `fetchQuotes` 多檔 + 建一筆新 symbol 看 quotes/ 自動出現 —— **owner / 後續**（本 session 僅起 auth+firestore，functions 模擬器未啟）
- [ ] 4.4 commit（scope: functions / mobile）；開 PR；deploy 延後 owner（部署 gate）；續做 change 3
