# live-quotes Delta: surface-quote-symbol-errors

## ADDED Requirements

### Requirement: 報價錯誤分類（symbol_not_found vs transient）

報價抓取失敗 SHALL 分為兩類並帶錯誤碼傳遞到 client：`symbol_not_found`（Yahoo 對該代號回 HTTP 404，屬**永久錯誤**——代號在該市場不存在，重試不會成功）與 `transient`（其他失敗：網路、429、5xx、sanity 不過等，屬**暫時錯誤**）。`QuoteProvider`（yahooProvider）SHALL 在 404 時擲出可辨識的 not-found 錯誤型別；`fetchQuotes` per-item error SHALL 含 `code` 欄位（`symbol_not_found` | `transient`），回應格式為既有欄位的向後相容擴充。

#### Scenario: Yahoo 404 分類為 symbol_not_found

- **WHEN** `fetchQuotes` 批次中某筆（如 `US:0050`）Yahoo 回 HTTP 404
- **THEN** 該筆回應 error SHALL 帶 `code: "symbol_not_found"`，其餘筆不受影響（沿用逐筆錯誤隔離）

#### Scenario: 其他失敗分類為 transient

- **WHEN** 某筆抓取因網路錯誤、HTTP 429/5xx 或 sanity 驗證失敗而失敗
- **THEN** 該筆回應 error SHALL 帶 `code: "transient"`

### Requirement: client 端報價錯誤能見度（不得靜默吞錯）

mobile `services/quotes` SHALL 不得以空 `catch {}` 吞掉報價鏈路錯誤：`fetchQuotes` 呼叫失敗（網路 / 非 2xx / 回應格式異常）、Firestore cache 讀取失敗、per-item error SHALL 一律經集中式 `logQuoteError`（MVP 以 `console.warn` 輸出結構化訊息：symbolId + 階段 + 錯誤）記錄，作為未來接錯誤上報服務（Sentry）的單一 seam。`parseFetchQuotesResponse` SHALL 解析並保留 per-item error 的 `code`，回傳給 store（不得將錯誤與「無資料」混同）。

#### Scenario: 批次回應含 per-item error 時保留錯誤碼

- **WHEN** `fetchQuotes` 回應中某筆帶 `error.code`
- **THEN** 解析結果 SHALL 將該 symbolId 標記為對應錯誤碼並回傳，且經 `logQuoteError` 記錄

#### Scenario: HTTP / 網路層失敗留下記錄

- **WHEN** `fetchQuotes` 請求整體失敗（fetch 擲錯或非 2xx）
- **THEN** SHALL 經 `logQuoteError` 記錄（含 HTTP 狀態或錯誤訊息），不得無聲返回空結果

### Requirement: 查無代號降級顯示（symbol_not_found）

mobile SHALL 於 store 維護 per-symbol 報價錯誤狀態。持倉清單列：`symbol_not_found` 的持倉 SHALL 顯示「查無報價代號」標示（引導使用者檢查市場/代號設定），不得顯示「更新中」或無限載入。Hero/bento 彙總：`symbol_not_found` 的持倉 SHALL 自「更新中」（pending）語義中排除、歸為「查無代號」；當**所有**持倉皆無可用報價且其中至少一檔為 `symbol_not_found` 時，Hero SHALL 顯示錯誤降級文案（如「N 檔查無報價代號，請檢查市場/代號」）而非「報價載入中…」。`transient` 錯誤 SHALL 維持既有「更新中／延遲」路徑，不受本 requirement 影響。錯誤狀態為 runtime 狀態，SHALL 不寫入 Firestore。

#### Scenario: 單檔查無代號——清單列與彙總標示

- **WHEN** 持倉中某檔（如 market=US、symbol=0050）持續回 `symbol_not_found`，其餘持倉有報價
- **THEN** 該持倉列 SHALL 顯示「查無報價代號」標示；Hero 彙總以其餘持倉部分渲染，該檔計入「查無代號」而非「更新中」

#### Scenario: 全部持倉查無代號——不再永遠載入中

- **WHEN** 所有持倉皆無任何報價（含無 stale fallback），且至少一檔錯誤為 `symbol_not_found`
- **THEN** Hero SHALL 顯示「查無報價代號」錯誤降級文案與檢查引導，**不得**顯示永久「報價載入中…」

#### Scenario: 錯誤狀態於報價成功後清除

- **WHEN** 曾標記 `symbol_not_found` 或 `transient` 的 symbol 於後續刷新成功取得報價（例：使用者修正交易的 market 後產生新 symbolId，或暫時性故障恢復）
- **THEN** 該 symbol 的錯誤狀態 SHALL 清除，恢復正常現價顯示

## MODIFIED Requirements

### Requirement: 批次報價端點 fetchQuotes

`apps/functions` SHALL 提供 HTTP `fetchQuotes`（onRequest、cors、region asia-east1），讓 mobile 以**單次呼叫**取得多檔報價，取代逐檔 `fetchQuote`。純函式 `parseBatchInput` SHALL 解析 query 的多個 `market:symbol:currency`、逐筆驗證（`market ∈ MARKETS`、`currency ∈ CURRENCIES`、symbol 非空），並 SHALL 設**筆數上限**（防濫用）；超量或全數非法 SHALL 回 400。handler SHALL 以 `Promise.all` 對每筆重用既有 `getOrFetchQuote`（沿用 server 端 15min 新鮮度判定、`sanitizeQuote`、寫 `quotes/{symbolId}`），且 SHALL **逐筆錯誤隔離**——單檔抓取失敗回該筆 error、不影響其餘成功筆；**每筆 error SHALL 帶 `code` 欄位（`symbol_not_found` | `transient`）供 client 區分永久/暫時錯誤**。回應為結果陣列（每筆含 `symbolId` + 報價欄位，或 `symbolId` + error（含 `code`））。`quotes` rules 不變（登入可讀、後端可寫）。

#### Scenario: 一次取多檔報價

- **WHEN** 呼叫 `fetchQuotes`，query 帶多個合法 `market:symbol:currency`
- **THEN** 回應陣列每筆對應一個 symbol，已抓取/新鮮者帶 `price`（10 位小數 string）+ `prevClose` + `fetchedAtMs`，並已寫入共用 `quotes/{symbolId}`

#### Scenario: 逐筆錯誤隔離

- **WHEN** 批次中某一檔抓取失敗（來源錯誤 / sanity 不過），其餘合法
- **THEN** 該筆於回應標記 error（含 `code`），其餘筆 SHALL 正常回傳，整批不因單檔失敗而 fail

#### Scenario: 非法 / 超量輸入

- **WHEN** query 無任何合法項，或項數超過上限
- **THEN** SHALL 回 400（不部分放行非法輸入）

### Requirement: 雙層 cache 讀取與現價/損益顯示

mobile `services/quotes` SHALL 以雙層 cache 取報價：本機 in-memory（新鮮即用）→ Firestore `quotes/{symbolId}`（新鮮即用 + 回填 in-memory）→ HTTP `fetchQuote`（觸發後端抓取）。**當 Firestore 報價存在但已過期（>15min TTL）時，系統 SHALL 仍保留並回填該過期報價（標示 `stale` + 其 `fetched_at` 作為 asOf），同時於背景觸發刷新；不得丟棄過期報價而讓該持倉變成無值。**

持倉清單 / 個股詳情 SHALL 以最新（或退而求其次的過期）報價顯示**現價、市值、未實現損益（金額 + %，§4：`(現價−均價)×股數`）**；過期報價呈現時 SHALL 標示「截至 HH:MM／延遲」並提供重試入口。**今日漲跌（現價−前收）SHALL 僅在該報價為新鮮時呈現，過期或缺 `prevClose` 時顯示「—」，不得以過期價計算今日漲跌。**

持倉總覽 Hero/bento 的彙總（總市值、總未實現、總報酬率）SHALL 採**部分渲染**：以**手上已有報價（新鮮或過期）的持倉**加總真值，缺報價的持倉依錯誤狀態標記——`symbol_not_found` 標記「查無代號」、其餘標記「更新中」——並排除於彙總之外，總成本（grandCost）亦 SHALL 以可換算的持倉加總而不因單檔換算失敗整體回空；跨幣別於顯示層以最新匯率換算（ADR-0005）。今日損益彙總 SHALL 僅在所有納入彙總的持倉皆為新鮮報價時呈現，否則顯示「—」。

報價載入 SHALL 於下列時機觸發（採非強制刷新，靠 15min TTL + 共用 cache 去抖）：畫面 **focus**（持倉總覽 / 個股詳情）、App 從背景**回前景**（`AppState` 變為 `active`）、持倉清單變動、冷啟動。持倉總覽另 SHALL 支援 pull-to-refresh **強制**刷新（繞過新鮮判定）。

#### Scenario: 顯示現價與未實現損益（新鮮）

- **WHEN** 持有某 symbol 且取得新鮮報價
- **THEN** 該 position 顯示現價、未實現損益金額與 %（以顯示幣別呈現）、今日漲跌

#### Scenario: 過期降級——顯示最後已知值

- **WHEN** 某 symbol 的 Firestore 報價存在但 `fetched_at` 已超過 15 分鐘，且背景刷新尚未成功（如外部來源 / 函式失敗）
- **THEN** 系統 SHALL 仍以該過期報價顯示現價/市值/未實現，並標示「截至 HH:MM／延遲」+ 重試入口；**不** 顯示永久「報價載入中…」、不 crash

#### Scenario: 彙總部分渲染——缺報價不整頁空白

- **WHEN** 部分持倉已取得報價（新鮮或過期）、另有部分尚無任何報價
- **THEN** Hero/bento SHALL 以**已有報價的持倉**加總顯示總市值/未實現/報酬率，無報價的持倉依錯誤狀態標記「更新中」或「查無代號」並排除於彙總；總額不得因單檔缺值而整頁顯示「報價載入中…」

#### Scenario: 完全無任何報價且無永久錯誤時才顯示載入中

- **WHEN** 所有持倉皆無任何報價（連過期值都沒有，例如首次冷啟動且離線）、無任何 `symbol_not_found` 錯誤，或匯率完全未就緒
- **THEN** Hero/bento 彙總顯示「報價載入中…」/「—」（此為唯一仍顯示載入中的情形；若存在 `symbol_not_found` 則改走查無代號降級，見 ADDED「查無代號降級顯示」）

#### Scenario: 今日損益僅於新鮮報價呈現

- **WHEN** 納入彙總的持倉中存在過期報價，或某持倉缺 `prevClose`
- **THEN** 今日損益（單檔與彙總）SHALL 顯示「—」，不以過期價計算今日漲跌

#### Scenario: 每次打開檢查新鮮度（focus / 回前景）

- **WHEN** 使用者切回持倉總覽分頁（畫面 focus）或將 App 自背景帶回前景
- **THEN** 系統 SHALL 觸發報價載入（非強制）：in-memory / Firestore 新鮮則直接用、過期才實際觸發 `fetchQuote`，使「每次打開」都拿到當下可得的最新值

#### Scenario: pull-to-refresh 強制刷新

- **WHEN** 使用者於持倉總覽下拉刷新
- **THEN** 繞過新鮮判定、觸發 `fetchQuote` 取最新，更新顯示
