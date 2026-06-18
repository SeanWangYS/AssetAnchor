# live-quotes Specification

## Purpose

即時報價的取得、驗證、雙層 cache 與消費（ADR-0006）：Cloud Function `fetchQuote` 自 Yahoo 抓價、邊界 sanity 驗證後寫入共用 `quotes/{symbolId}` cache（15min TTL）；mobile 以雙層 cache 取報價，讓持倉 / 個股顯示現價、未實現損益、今日損益與彙總，並支援下拉刷新。

> 來源：docs/adr/0006-quote-cache-strategy.md、planning §3（股價資料）/ §6（Collection 6 quotes）/ §13.2（Sprint 5）/ ADR-0007 §5（報價來源政策）。
> 實作偏離 ADR（已記錄）：`fetchQuote` 採 **onRequest HTTP**（非 onCall；免 mobile RNFirebase functions 原生模組）；本機持久層**暫以 in-memory 代 MMKV**（MMKV 原生模組需 prebuild，列後續增強）。

## Requirements

### Requirement: 報價邊界驗證（sanity，ADR-0007 §5b）

系統 SHALL 在報價進入系統前以純函式 `sanitizeQuote` 驗證，擋下髒資料：價格須為**有限且 > 0**；OHLC / prevClose / volume 若存在須有限且 ≥ 0。未通過者 SHALL 拒絕（不寫 cache、不顯示），不得靜默放行。報價新鮮度由純函式 `isFresh`（預設 15min TTL；未來時戳視為不新鮮）判定。

#### Scenario: 拒絕非正價 / 非有限

- **WHEN** 報價價格為 `0`、負數、`NaN` 或 `Infinity`
- **THEN** 驗證 SHALL 失敗、該報價不寫入 `quotes/{symbolId}`

#### Scenario: 合法報價通過並正規化為 Money string

- **WHEN** 報價價格為合法正數
- **THEN** 驗證通過，價格以 `Money` 10 位小數 string 儲存

### Requirement: fetchQuote Cloud Function + quotes cache

`apps/functions` SHALL 提供 HTTP `fetchQuote`（onRequest），於 cache miss / 過期（>15min TTL）時經 `QuoteProvider`（Yahoo v8 chart，keyless）抓取、`sanitizeQuote` 驗證後，以 Admin SDK 寫入 `quotes/{symbolId}`（schema 對齊 planning §6）。`QuoteProvider` SHALL 介面化以利替換來源。`quotes` rules 維持「登入可讀、只有後端可寫」。dev 對 Functions 模擬器；production 部署為部署 gate。

#### Scenario: cache 過期觸發抓取並寫入

- **WHEN** 某 symbol 的 `quotes/{symbolId}` 不存在或 `fetched_at` 超過 15 分鐘，呼叫 `fetchQuote`
- **THEN** 後端抓取 + 驗證 + 以 Money string 寫入該文件（`source="yahoo-finance"`、`fetched_at` 為寫入時間）

#### Scenario: 新鮮 cache 不重抓

- **WHEN** `quotes/{symbolId}` 的 `fetched_at` 在 15 分鐘內
- **THEN** 視為新鮮，不重新抓取外部來源

#### Scenario: 髒資料 fail loud

- **WHEN** provider 回傳的價格未通過 sanity（非正 / 非有限）
- **THEN** SHALL 不寫入半套文件、回錯誤（不放行髒資料）

### Requirement: 雙層 cache 讀取與現價/損益顯示

mobile `services/quotes` SHALL 以雙層 cache 取報價：本機 in-memory（新鮮即用）→ Firestore `quotes/{symbolId}`（新鮮即用 + 回填 in-memory）→ HTTP `fetchQuote`（觸發後端抓取）。**當 Firestore 報價存在但已過期（>15min TTL）時，系統 SHALL 仍保留並回填該過期報價（標示 `stale` + 其 `fetched_at` 作為 asOf），同時於背景觸發刷新；不得丟棄過期報價而讓該持倉變成無值。**

持倉清單 / 個股詳情 SHALL 以最新（或退而求其次的過期）報價顯示**現價、市值、未實現損益（金額 + %，§4：`(現價−均價)×股數`）**；過期報價呈現時 SHALL 標示「截至 HH:MM／延遲」並提供重試入口。**今日漲跌（現價−前收）SHALL 僅在該報價為新鮮時呈現，過期或缺 `prevClose` 時顯示「—」，不得以過期價計算今日漲跌。**

持倉總覽 Hero/bento 的彙總（總市值、總未實現、總報酬率）SHALL 採**部分渲染**：以**手上已有報價（新鮮或過期）的持倉**加總真值，缺報價的持倉標記「更新中」並排除於彙總之外，總成本（grandCost）亦 SHALL 以可換算的持倉加總而不因單檔換算失敗整體回空；跨幣別於顯示層以最新匯率換算（ADR-0005）。今日損益彙總 SHALL 僅在所有納入彙總的持倉皆為新鮮報價時呈現，否則顯示「—」。

報價載入 SHALL 於下列時機觸發（採非強制刷新，靠 15min TTL + 共用 cache 去抖）：畫面 **focus**（持倉總覽 / 個股詳情）、App 從背景**回前景**（`AppState` 變為 `active`）、持倉清單變動、冷啟動。持倉總覽另 SHALL 支援 pull-to-refresh **強制**刷新（繞過新鮮判定）。

#### Scenario: 顯示現價與未實現損益（新鮮）

- **WHEN** 持有某 symbol 且取得新鮮報價
- **THEN** 該 position 顯示現價、未實現損益金額與 %（以顯示幣別呈現）、今日漲跌

#### Scenario: 過期降級——顯示最後已知值

- **WHEN** 某 symbol 的 Firestore 報價存在但 `fetched_at` 已超過 15 分鐘，且背景刷新尚未成功（如外部來源 / 函式失敗）
- **THEN** 系統 SHALL 仍以該過期報價顯示現價/市值/未實現，並標示「截至 HH:MM／延遲」+ 重試入口；**不** 顯示永久「報價載入中…」、不 crash

#### Scenario: 彙總部分渲染——缺報價不整頁空白

- **WHEN** 部分持倉已取得報價（新鮮或過期）、另有部分尚無任何報價
- **THEN** Hero/bento SHALL 以**已有報價的持倉**加總顯示總市值/未實現/報酬率，無報價的持倉標記「更新中」並排除於彙總；總額不得因單檔缺值而整頁顯示「報價載入中…」

#### Scenario: 完全無任何報價時才顯示載入中

- **WHEN** 所有持倉皆無任何報價（連過期值都沒有，例如首次冷啟動且離線）或匯率完全未就緒
- **THEN** Hero/bento 彙總顯示「報價載入中…」/「—」（此為唯一仍顯示載入中的情形）

#### Scenario: 今日損益僅於新鮮報價呈現

- **WHEN** 納入彙總的持倉中存在過期報價，或某持倉缺 `prevClose`
- **THEN** 今日損益（單檔與彙總）SHALL 顯示「—」，不以過期價計算今日漲跌

#### Scenario: 每次打開檢查新鮮度（focus / 回前景）

- **WHEN** 使用者切回持倉總覽分頁（畫面 focus）或將 App 自背景帶回前景
- **THEN** 系統 SHALL 觸發報價載入（非強制）：in-memory / Firestore 新鮮則直接用、過期才實際觸發 `fetchQuote`，使「每次打開」都拿到當下可得的最新值

#### Scenario: pull-to-refresh 強制刷新

- **WHEN** 使用者於持倉總覽下拉刷新
- **THEN** 繞過新鮮判定、觸發 `fetchQuote` 取最新，更新顯示

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
