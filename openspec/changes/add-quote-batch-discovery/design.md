## Context

報價架構改進 roadmap 的**層 2（functions 為主）**，stacked 於 change 1 `resilient-quote-display`。現況（ADR-0006 架構 A）：mobile `quotesStore.loadFor` 對每檔持倉各打一次 `fetchQuote`（onRequest），N 檔 = N 次呼叫；「發現新標的」只在使用者開該持倉頁時 lazy 觸發。

既有可重用 seam：`getOrFetchQuote(input, provider, nowMs)`（fetchQuote.ts）已封裝「Firestore 15min 新鮮度判定 → 否則 provider 抓 → sanitizeQuote → 寫 quotes/」；`QuoteProvider`（yahooProvider）介面化。本 change 在其上加「批次讀」與「事件驅動發現」，**不動 schema / rules / 報價來源 / sanity**。

## Goals / Non-Goals

**Goals:**

- 一次呼叫取多檔報價（開頁 N→1），降延遲與 function 調用數；成本不變（server 端仍 15min cache 去重）。
- 新標的進場即由後端抓首筆報價，縮短「新增→看到現價」的延遲。
- 全程對 functions 模擬器開發 + pure-fn 單元測試；production 部署延後 owner。

**Non-Goals:**

- 不動 `quotes`/`symbols` schema、不動 rules、不改報價來源 / `sanitizeQuote`。
- 不做排程 cron（ADR-0006 否決）。
- 不做 MMKV（change 3）。不自動 `firebase deploy`（部署 gate）。

## Decisions

### D1：fetchQuotes 重用 getOrFetchQuote + 逐筆錯誤隔離

新 onRequest `fetchQuotes`：純函式 `parseBatchInput(query)` 解析多個 `market:symbol:currency`（分隔格式 `items=TW:2330:TWD,US:AAPL:USD`），逐筆驗 `MARKETS`/`CURRENCIES`/symbol 非空、上限（如 50）防濫用。handler `Promise.all(items.map(i => getOrFetchQuote(i, yahooProvider, Date.now()).then(ok).catch(err→{symbolId,error})))`，回結果陣列。

- **理由**：重用既有取價/cache/sanity，零重複邏輯；逐筆 catch 確保單檔壞不拖垮整批（對齊 change 1 的部分渲染精神）。
- **替代**：onCall（需 RNFirebase functions 原生模組，違背既有 onRequest 慣例）——否決。

### D2：事件驅動發現用 onDocumentCreated（與 fetchSymbolMeta 解耦）

新 `onDocumentCreated('symbols/{symbolId}')` 觸發器：純函式 `symbolDocToQuoteTarget(data)` 取 `market/symbol/currency`（驗合法否則 null），handler 呼叫 `getOrFetchQuote` 抓首筆寫 quotes/；fail-soft（log 不擲）。symbols 由既有 `fetchSymbolMeta`（mobile `ensureSymbol` 觸發）或 seed 建立，故「新增從未見過的股票」會建立 symbol → 觸發本器。

- **理由**：owner 已選獨立觸發器（與 metadata enrich 解耦、職責單一）。事件驅動 = 架構 A 精神（使用者動作引發，非時鐘）。
- **替代**：(b) 把抓 quote 塞進 `fetchSymbolMeta`（省一個 function 但兩職責耦合）——owner 已否決取 (a)。

### D3：mobile loadFor 改走批次（stacked on change 1）

`quotesStore.loadFor` 將「需抓清單」一次送 `fetchQuotes`（取代逐檔 `triggerFetchQuote`），結果分配回填。純 helper `buildFetchQuotesUrl(targets)` / `parseFetchQuotesResponse(json)` 抽出可單元測試。**完整保留 change 1 的語意**：in-mem/Firestore 新鮮判定、過期保留、降級 fallback、in-mem 只增不刪不變——只把「外呼那一步」由 N 次併成 1 次。

- **理由**：實現 N→1 的端到端價值；helper 純化以利測試（loadFor 本體仍 I/O）。
- **風險**：見下（與 change 1 的 loadFor 交織）。

### D4：ADR-0006 小修訂註記（不開新 ADR）

在 `docs/adr/0006-quote-cache-strategy.md` 補一段「增補（2026-06）：批次讀 `fetchQuotes` + 事件驅動發現 `onDocumentCreated(symbols)`，仍屬架構 A（on-demand/事件驅動、非排程）」。owner 已拍板當小修訂。

## Risks / Trade-offs

- **[與 change 1 loadFor 交織]** 本 change 再次改 `quotesStore.loadFor`（change 1 剛改過）→ Mitigation：stacked 於 change 1 分支，改動聚焦「外呼批次化」、保留 change 1 所有新鮮度/降級分支；helper 純函式測試守行為。
- **[functions 模擬器未啟動於本 session]** 目前只起 auth+firestore → Mitigation：handler 屬 I/O，DoD 靠 pure-fn 測試（parseBatchInput / symbolDocToQuoteTarget / mobile helper）；handler 整合留 `emulators:fn` / owner 驗收。
- **[onCreate 重複/迴圈]** 觸發器寫 quotes/ 不寫 symbols/ → 不會自觸發；且 getOrFetchQuote 有 15min 去重 → Mitigation：天然無迴圈。
- **[批次 URL 過長]** 大量持倉 → Mitigation：上限筆數 + 必要時 mobile 分批；MVP 持倉數小。
- **[部署未生效]** 新 function 需部署才在 production 生效 → Mitigation：部署 gate、owner 執行；dev 對模擬器。

## Migration Plan

純新增 functions + mobile 外呼批次化，無資料遷移、無 schema/rules 變更。逐步：functions 純函式（TDD）→ handler → mobile helper（TDD）→ loadFor 接批次 → ADR 增補。dev 對模擬器；`pnpm -r typecheck`/`lint`/`prettier --check` 全綠。回退＝還原新增檔 + loadFor 那一段。**production 部署延後 owner（部署 gate）。**

## Open Questions

- 批次 query 分隔格式（`items=M:S:C,...` vs 重複參數）：apply 時定，純 `parseBatchInput` 契約涵蓋即可。
- mobile 是否保留單檔 `fetchQuote` 為 fallback：保留（不刪），loadFor 改用批次為主；不影響行為契約。
