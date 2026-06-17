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

mobile `services/quotes` SHALL 以雙層 cache 取報價：本機 in-memory（新鮮即用）→ Firestore `quotes/{symbolId}`（新鮮即用 + 回填 in-memory）→ HTTP `fetchQuote`（觸發後端抓取）。持倉清單 / 個股詳情 SHALL 以最新報價顯示**現價、市值、未實現損益（金額 + %，§4：`(現價−均價)×股數`）、今日漲跌（現價−前收）**；持倉總覽 Hero/bento SHALL 顯示**彙總真值**（總市值、總未實現、總報酬率、今日損益），跨幣別於顯示層以最新匯率換算（ADR-0005）。持倉總覽 SHALL 支援 pull-to-refresh 強制刷新。

#### Scenario: 顯示現價與未實現損益

- **WHEN** 持有某 symbol 且取得新鮮報價
- **THEN** 該 position 顯示現價、未實現損益金額與 %（以顯示幣別呈現）

#### Scenario: 彙總需全部持倉皆有報價

- **WHEN** 並非所有持倉皆取得報價（或匯率未就緒）
- **THEN** Hero/bento 彙總 SHALL 顯示「報價載入中…」/「—」，不顯示部分或錯誤的總額

#### Scenario: pull-to-refresh 強制刷新

- **WHEN** 使用者於持倉總覽下拉刷新
- **THEN** 繞過新鮮判定、觸發 `fetchQuote` 取最新，更新顯示

#### Scenario: 報價未就緒降級

- **WHEN** 報價尚未取得 / 抓取失敗
- **THEN** 現價/未實現顯示「報價未就緒」之類提示，不顯示錯誤數字、不 crash
