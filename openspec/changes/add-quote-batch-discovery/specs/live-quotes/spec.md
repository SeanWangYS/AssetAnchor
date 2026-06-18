## ADDED Requirements

### Requirement: 批次報價端點 fetchQuotes

`apps/functions` SHALL 提供 HTTP `fetchQuotes`（onRequest、cors、region asia-east1），讓 mobile 以**單次呼叫**取得多檔報價，取代逐檔 `fetchQuote`。純函式 `parseBatchInput` SHALL 解析 query 的多個 `market:symbol:currency`、逐筆驗證（`market ∈ MARKETS`、`currency ∈ CURRENCIES`、symbol 非空），並 SHALL 設**筆數上限**（防濫用）；超量或全數非法 SHALL 回 400。handler SHALL 以 `Promise.all` 對每筆重用既有 `getOrFetchQuote`（沿用 server 端 15min 新鮮度判定、`sanitizeQuote`、寫 `quotes/{symbolId}`），且 SHALL **逐筆錯誤隔離**——單檔抓取失敗回該筆 error、不影響其餘成功筆。回應為結果陣列（每筆含 `symbolId` + 報價欄位，或 `symbolId` + error）。`quotes` rules 不變（登入可讀、後端可寫）。

#### Scenario: 一次取多檔報價

- **WHEN** 呼叫 `fetchQuotes`，query 帶多個合法 `market:symbol:currency`
- **THEN** 回應陣列每筆對應一個 symbol，已抓取/新鮮者帶 `price`（10 位小數 string）+ `prevClose` + `fetchedAtMs`，並已寫入共用 `quotes/{symbolId}`

#### Scenario: 逐筆錯誤隔離

- **WHEN** 批次中某一檔抓取失敗（來源錯誤 / sanity 不過），其餘合法
- **THEN** 該筆於回應標記 error，其餘筆 SHALL 正常回傳，整批不因單檔失敗而 fail

#### Scenario: 非法 / 超量輸入

- **WHEN** query 無任何合法項，或項數超過上限
- **THEN** SHALL 回 400（不部分放行非法輸入）

### Requirement: 事件驅動報價發現（symbol 新建即抓首筆）

`apps/functions` SHALL 提供 Firestore 觸發器 `onDocumentCreated('symbols/{symbolId}')`，於新標的首次進場（`symbols/{symbolId}` 被建立）時自動抓取**首筆報價**寫入共用 `quotes/{symbolId}`，使該持倉首次檢視即有現價、不必等使用者開頁才 lazy 觸發。純函式 `symbolDocToQuoteTarget` SHALL 從新建 symbol 文件取 `market/symbol/currency` 並驗證（不合法回 null）。handler SHALL 對合法 target 呼叫 `getOrFetchQuote`；抓取失敗 SHALL **fail-soft**（記 log、不擲錯，避免觸發器無限重試）。此為事件驅動 / on-demand，**非排程**（對齊 ADR-0006）。

#### Scenario: 新標的進場自動抓首筆報價

- **WHEN** `symbols/{symbolId}` 文件被建立（例：使用者新增一檔從未出現過的股票，經 fetchSymbolMeta 寫入 symbols）
- **THEN** 觸發器 SHALL 抓取該 symbol 首筆報價並寫入 `quotes/{symbolId}`（若該 quote 尚不存在）

#### Scenario: 抓取失敗不擋觸發器

- **WHEN** 新標的首抓報價失敗（來源暫時不可用）
- **THEN** 觸發器 SHALL fail-soft（記 log、不擲錯），不阻塞 symbol 建立、不無限重試；後續使用者開頁時仍可由既有 on-demand 流程補抓

#### Scenario: 文件缺必要欄位

- **WHEN** 新建 symbol 文件缺 `market`/`symbol`/`currency` 或值非法
- **THEN** `symbolDocToQuoteTarget` SHALL 回 null、觸發器略過（不抓、不擲錯）
