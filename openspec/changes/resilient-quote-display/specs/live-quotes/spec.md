## MODIFIED Requirements

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
