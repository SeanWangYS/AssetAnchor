## Why

報價架構（ADR-0006）目前 mobile 是「開持倉頁時，每檔持倉各打一次 `fetchQuote`」——N 檔 = N 個 HTTP/function 呼叫，延遲與 function 調用數隨持倉數線性成長。且「發現新股票」只在使用者**開該持倉頁**時才 lazy 觸發首抓，新增從未出現過的標的後第一次檢視仍要等抓取。

本 change 補上層 2 的兩個後端能力：**批次讀**（一次抓多檔，N→1）與**事件驅動發現**（新 symbol 進場即由後端自動抓首筆報價），讓「每次打開→全部資產最新報價」這個需求（planning §3）更快、更完整。仍對齊 ADR-0006 架構 A（Cloud Function 代理 + 共用 `quotes/` cache、15min TTL、on-demand/事件驅動、**非排程**）。**不動 Firestore schema / rules。**

## What Changes

- **② 批次報價端點 `fetchQuotes`（functions, onRequest）**：query 帶多個 `market:symbol:currency`；純函式 `parseBatchInput` 驗證解析（每筆驗 `MARKETS`/`CURRENCIES`/symbol 非空，設上限筆數防濫用），handler 以 `Promise.all` 重用既有 `getOrFetchQuote`（已具 server 端 15min 新鮮度 + `sanitizeQuote` + 寫 `quotes/`），**逐筆錯誤隔離**（單檔失敗不拖垮整批），回傳結果陣列。
- **③ 事件驅動發現 `onSymbolCreatedFetchQuote`（functions, `onDocumentCreated('symbols/{symbolId}')`）**：純函式 `symbolDocToQuoteTarget` 從新建 symbol 文件取 `market/symbol/currency`（驗合法否則略過），handler 呼叫 `getOrFetchQuote` 抓首筆報價寫 `quotes/`；**fail-soft**（log、不擲，避免無限重試）。
- **mobile 接線**：`quotesStore.loadFor` 由「逐檔 `triggerFetchQuote`」改為「收集需抓清單 → 單次 `fetchQuotes` → 分配回填」；新增可測純 helper `buildFetchQuotesUrl` / `parseFetchQuotesResponse`。**保留 change 1（resilient-quote-display）的過期保留 / 降級語意不變。**
- **ADR-0006 小修訂註記**：在 `docs/adr/0006-quote-cache-strategy.md` 補「事件驅動發現 + 批次讀」增補段（屬架構 A 精神、非排程；owner 已拍板，不開新 ADR）。

## Capabilities

### New Capabilities

（無——新增需求掛在既有 `live-quotes` capability 下。）

### Modified Capabilities

- `live-quotes`: **ADDED** 兩條需求——(1)「批次報價端點」：mobile 開頁以單次 `fetchQuotes` 取多檔，後端逐筆重用既有取價/cache 邏輯、錯誤隔離；(2)「事件驅動報價發現」：`symbols/{symbolId}` 新建時後端自動抓首筆報價寫 `quotes/`。既有單檔 `fetchQuote`、sanity、雙層 cache 讀取需求不變。

## Impact

- **functions（apps/functions）**：新增 `quotes/fetchQuotes.ts`、`quotes/onSymbolCreated.ts`（各含 pure-fn + test）；`index.ts` 匯出新成員。重用 `getOrFetchQuote`（fetchQuote.ts）、`yahooProvider`。
- **mobile（apps/mobile）**：`services/quotes/quotesStore.ts` 的 `loadFor` 改走批次；新增純 helper 檔 + 測試。**stacked on `feature/resilient-quote-display`**（change 1）。
- **不影響**：Firestore schema（`quotes`/`symbols` 欄位不變，聖牛無動）、`firestore.rules`（`quotes` 後端寫、`symbols` 登入可 create，不變）、報價來源/sanity 邏輯。
- **依賴**：`firebase-functions ^7`（v2 `onDocumentCreated`，已具）；無新增套件。
- **部署**：新增 function 需 `firebase deploy --only functions` 才在 production 生效——**部署 gate，延後由 owner 執行**；本 change 全程對 functions 模擬器（`emulators:fn`）開發測試。

## Non-goals

- **本機 MMKV 持久層**：屬 change 3 `add-mmkv-quote-cache`（動原生 build），不在本 change。
- **排程批次刷新（cron）**：ADR-0006 已否決，本 change 維持事件驅動 / on-demand。
- **production 部署**：延後 owner（部署 gate）；不在本 change 自動執行。
- **改報價來源 / sanity / schema**：沿用既有 `QuoteProvider`、`sanitizeQuote`、`quotes` schema。
- **真機 / Google 登入 runtime 驗證**：延後至 Apple Developer 通過後批次驗收。
