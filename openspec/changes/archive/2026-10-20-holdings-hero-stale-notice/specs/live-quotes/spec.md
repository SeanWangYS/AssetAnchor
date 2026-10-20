## ADDED Requirements

### Requirement: 報價新鮮度分級純函式

`packages/shared` SHALL 匯出純函式，將「持有中標的的報價 `fetchedAtMs` 集合」與 `nowMs` 分級為 `fresh` / `soft` / `hard`，並回傳**最舊**的 `fetchedAtMs`、最舊報價距今的整數天數（無條件捨去）、以及達 `hard` 門檻的檔數與總檔數。分級以**最舊**一檔為準：最舊報價距今 **≤ 1 小時**為 `fresh`、**> 1 小時且 ≤ 24 小時**為 `soft`、**> 24 小時**為 `hard`（邊界含：剛好 1 小時仍為 `fresh`、剛好 24 小時仍為 `soft`）。空集合 SHALL 回 `fresh`（無報價時由「報價載入中」/「更新中」既有降級處理）。未來時戳（clock skew / 髒資料）SHALL 視為距今 0（不得因負值誤判）。`packages/shared` 亦 SHALL 匯出 `M/D HH:mm` 日期時間格式化函式（月/日不補零、時/分補零，裝置本地時區）。兩者 SHALL 以 TDD 撰寫並納入 shared coverage gate（≥ 90%）。

#### Scenario: 全部新鮮

- **WHEN** 所有報價距今皆 ≤ 1 小時
- **THEN** 回傳 `fresh`

#### Scenario: 最舊一檔決定等級

- **WHEN** 有 6 檔報價 5 分鐘前更新、1 檔 3 小時前更新
- **THEN** 回傳 `soft`，最舊時間＝3 小時前那檔的 `fetchedAtMs`

#### Scenario: 超過一天且計算天數與受影響檔數

- **WHEN** 7 檔報價皆停在 29 天又 5 小時前
- **THEN** 回傳 `hard`、天數 29、hard 檔數 7、總檔數 7

#### Scenario: 邊界值

- **WHEN** 最舊報價距今剛好 1 小時；另一情形剛好 24 小時
- **THEN** 前者為 `fresh`、後者為 `soft`

#### Scenario: 空集合與未來時戳

- **WHEN** 傳入空集合；另一情形最舊時戳大於 `nowMs`
- **THEN** 皆回傳 `fresh`

#### Scenario: 日期時間格式

- **WHEN** 格式化本地時間 2026-09-22 17:10 與 2026-10-03 09:05
- **THEN** 分別得到 `9/22 17:10` 與 `10/3 09:05`

## MODIFIED Requirements

### Requirement: 雙層 cache 讀取與現價/損益顯示

mobile `services/quotes` SHALL 以雙層 cache 取報價：本機 in-memory（新鮮即用）→ Firestore `quotes/{symbolId}`（新鮮即用 + 回填 in-memory）→ HTTP `fetchQuote`（觸發後端抓取）。**當 Firestore 報價存在但已過期（>15min TTL）時，系統 SHALL 仍保留並回填該過期報價（標示 `stale` + 其 `fetched_at` 作為 asOf），同時於背景觸發刷新；不得丟棄過期報價而讓該持倉變成無值。**

持倉清單 / 個股詳情 SHALL 以最新（或退而求其次的過期）報價顯示**現價、市值、未實現損益（金額 + %，§4：`(現價−均價)×股數`）**。過期報價的標示：**個股詳情** SHALL 標示「最後更新 HH:mm · 延遲」；**持倉總覽** SHALL 依「報價過期兩級提示」（見「報價 as-of 時間可見」）呈現，15 分鐘 TTL 過期但最舊報價距今 ≤ 1 小時時 SHALL NOT 顯示過期提示（避免一般刷新延遲造成雜訊）。**今日漲跌（現價−前收）SHALL 僅在該報價為新鮮時呈現，過期或缺 `prevClose` 時顯示「—」，不得以過期價計算今日漲跌。**

持倉總覽 Hero/bento 的彙總（總市值、總未實現、總報酬率）SHALL 採**部分渲染**：以**手上已有報價（新鮮或過期）的持倉**加總真值，缺報價的持倉依錯誤狀態標記——`symbol_not_found` 標記「查無代號」、其餘標記「更新中」——並排除於彙總之外，總成本（grandCost）亦 SHALL 以可換算的持倉加總而不因單檔換算失敗整體回空；跨幣別於顯示層以最新匯率換算（ADR-0005）。今日損益彙總 SHALL 僅在所有納入彙總的持倉皆為新鮮報價時呈現，否則顯示「—」。

報價載入 SHALL 於下列時機觸發（採非強制刷新，靠 15min TTL + 共用 cache 去抖）：畫面 **focus**（持倉總覽 / 個股詳情）、App 從背景**回前景**（`AppState` 變為 `active`）、持倉清單變動、冷啟動。持倉總覽另 SHALL 支援 pull-to-refresh **強制**刷新（繞過新鮮判定）。

#### Scenario: 顯示現價與未實現損益（新鮮）

- **WHEN** 持有某 symbol 且取得新鮮報價
- **THEN** 該 position 顯示現價、未實現損益金額與 %（以顯示幣別呈現）、今日漲跌

#### Scenario: 過期降級——顯示最後已知值

- **WHEN** 某 symbol 的 Firestore 報價存在但 `fetched_at` 已超過 15 分鐘，且背景刷新尚未成功（如外部來源 / 函式失敗）
- **THEN** 系統 SHALL 仍以該過期報價顯示現價/市值/未實現；個股詳情標示「最後更新 HH:mm · 延遲」，持倉總覽依兩級門檻顯示過期提示（> 1 小時起）並提供重試；**不** 顯示永久「報價載入中…」、不 crash

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

### Requirement: 報價 as-of 時間可見

持倉總覽 SHALL NOT 常駐顯示報價時間註腳；報價時間 SHALL 僅在**持有中標的報價的最舊 `fetched_at`** 距今超過門檻時，以「報價新鮮度分級純函式」決定的兩級提示呈現於 hero 大數字下方，且時間 SHALL **含日期**（`M/D HH:mm`），SHALL NOT 只顯示 `HH:mm`（避免停更多日仍像當天）：

- `soft`（> 1 小時）：淡色小字 `報價更新於 M/D HH:mm`（最舊時間）。
- `hard`（> 24 小時）：橙色警示框 + 「重試」（強制刷新，同 pull-to-refresh），hero 大數字變淡。全部持有標的皆達 `hard` 時文案 SHALL 為 `報價已 N 天未更新（停在 M/D HH:mm）`；僅部分達 `hard` 時 SHALL 為 `N 檔報價已逾 1 天未更新`（不得以少數標的的天數描述整體）。
- `fresh`：不顯示任何報價時間。

判定 SHALL 只取持有中標的（`quoteTargets`）的報價，SHALL NOT 掃描整個報價 store（已出清標的的舊報價不得觸發提示）。既有「N 檔報價更新中 / N 檔查無代號」揭露 + 重試 SHALL 保留並可與兩級提示並存；持倉總覽 SHALL NOT 再顯示「部分為最後已知報價（延遲）」字樣（由兩級提示取代）。`fetched_at`＝後端成功抓價時間（休市時仍持續更新），故其變舊代表後端抓取失敗。

#### Scenario: 報價新鮮時不顯示時間

- **WHEN** 持有標的報價最舊一檔距今 ≤ 1 小時
- **THEN** hero 下方 SHALL NOT 顯示任何報價時間或過期提示

#### Scenario: 慢一小時以上顯示含日期淡字

- **WHEN** 最舊一檔報價停在 10/21 12:48，現在 10/21 14:05
- **THEN** hero 大數字下方顯示淡色 `報價更新於 10/21 12:48`，無警示框

#### Scenario: 全部停更多日顯示醒目警示

- **WHEN** 所有持有標的報價皆停在 9/22 17:10，現在 10/21 22:00（後端持續失敗）
- **THEN** 顯示橙色警示 `報價已 29 天未更新（停在 9/22 17:10）` + 「重試」，hero 大數字變淡；點「重試」觸發強制刷新

#### Scenario: 部分標的停更多日

- **WHEN** 7 檔中 1 檔報價停在 5 天前、其餘新鮮
- **THEN** 顯示橙色警示 `1 檔報價已逾 1 天未更新` + 「重試」

#### Scenario: 已出清標的不影響

- **WHEN** 報價 store 內有已全數賣出標的的數月前報價，持有中標的皆新鮮
- **THEN** SHALL NOT 顯示任何過期提示
