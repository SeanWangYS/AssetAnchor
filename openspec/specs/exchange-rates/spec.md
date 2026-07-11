# exchange-rates Specification

## Purpose

TBD - created by archiving change add-multi-currency-fx. Update Purpose after archive.

## Requirements

### Requirement: 每日台銀匯率抓取與寫入

系統 SHALL 以 `apps/functions` 的排程 Cloud Function（`onSchedule`，時區 Asia/Taipei，每日固定時刻執行）自 Yahoo Finance chart 端點抓取 `TWD=X`（1 USD = N TWD 市場價），並以 Admin SDK 寫入 `exchange_rates/{date}`（`date` = 來源時戳換算 Asia/Taipei 的實際資料日）。寫入 SHALL 為 idempotent（同一資料日重跑覆寫同一文件，不重複建立）。抓取 SHALL 沿用報價層已於 production 驗證的請求慣例（誠實 User-Agent；ADR-0010）。

#### Scenario: 排程觸發抓取並寫入最新市場匯率

- **WHEN** 排程觸發、Yahoo 回有效 `TWD=X` chart 資料
- **THEN** 系統取最新價為 `USD_TWD`，寫入 `exchange_rates/{該資料日}`，含雙向 `rates`

#### Scenario: 以實際資料日為 document id

- **WHEN** 函式於外匯市場休市時段（如週末）執行、Yahoo 回最近一個交易時段的資料
- **THEN** document id 為**來源時戳所屬的 Asia/Taipei 日曆日**（非執行當天），故不產生「休市日空匯率」文件

#### Scenario: 同一資料日重跑為 idempotent 覆寫

- **WHEN** 同一資料日函式被執行多次
- **THEN** `exchange_rates/{資料日}` 被覆寫而非重複建立，內容一致

### Requirement: Yahoo chart 匯率解析（純函式、fail loud）

`apps/functions` SHALL 提供可獨立測試的純解析函式：輸入 Yahoo chart 回應（`TWD=X`），輸出 `{ date, rate }`——`rate` 為最新市場價（10 位小數 string 的來源值）、`date` 為來源時戳（epoch 秒）換算 **Asia/Taipei** 的 `YYYY-MM-DD`。解析失敗（缺欄、非正數值、缺時戳）SHALL fail loud 擲出明確錯誤，**不得寫入半套文件**。

#### Scenario: 從合法 chart 回應抽出 rate 與資料日

- **WHEN** 解析一段含有效 price 與時戳的 `TWD=X` chart 回應
- **THEN** 回傳 `rate`（正數）與 `date`（時戳的 Asia/Taipei 日曆日）

#### Scenario: 時區換算正確（UTC 與台北跨日）

- **WHEN** 來源時戳落在 UTC 與 Asia/Taipei 不同日曆日的時段（UTC 16:00–24:00 = 台北翌日 00:00–08:00）
- **THEN** `date` 為 Asia/Taipei 的日曆日（非 UTC 日）

#### Scenario: 解析失敗時 fail loud

- **WHEN** chart 回應缺 price、price 非正數、或缺時戳
- **THEN** 函式擲出明確錯誤、不寫入 `exchange_rates`，由 logs 可見失敗

### Requirement: exchange_rates 文件形狀

`exchange_rates/{date}` 文件 SHALL 含：`date`（資料日 `YYYY-MM-DD`）、`source`（`"YAHOO"`）、`rate_type`（`"market"`，`packages/shared` 的 `RateType` union SHALL 新增此值）、`rates`（至少 `USD_TWD` 與 `TWD_USD` 兩向，皆 `Money` 10 位小數 string）、`fetched_at`（`serverTimestamp()`）、`is_estimated`（boolean，本模型以實際資料日為 key，恆 `false`）。欄位**結構**與既有文件完全一致；歷史 `source: "BOT"` 文件不回填、與新文件並存（消費端不依賴 `source`/`rate_type` 值）。

#### Scenario: 欄位完整

- **WHEN** 檢視任一筆新寫入的 `exchange_rates` 文件
- **THEN** `date`、`source`（`"YAHOO"`）、`rate_type`（`"market"`）、`rates`、`fetched_at`、`is_estimated` 皆存在且型別正確

#### Scenario: rates 含雙向且為 10 位小數 string

- **WHEN** 寫入 USD/TWD 匯率
- **THEN** `rates.USD_TWD` 與 `rates.TWD_USD` 皆為 `Money.toDecimalString()` 格式（互為倒數，預存省顯示層計算）

#### Scenario: 與歷史 BOT 文件並存

- **WHEN** collection 中同時存在 `source: "BOT"` 舊文件與 `source: "YAHOO"` 新文件
- **THEN** 消費端（讀最新 `date`）行為不受影響，無須資料遷移

### Requirement: 匯率資料安全模型（client 唯讀 / 後端唯寫）

`exchange_rates/{date}` SHALL 為全域共用：已登入使用者可讀、任何 client 不可寫（`firestore.rules` 既有 `read: if request.auth != null` / `write: if false`），僅後端 Admin SDK（Cloud Function）可寫。本 change SHALL 補上 client 寫入被拒的 rules 測試並納入 CI。

#### Scenario: 登入使用者可讀

- **WHEN** 已登入使用者讀 `exchange_rates/{date}`
- **THEN** rules 允許

#### Scenario: client 寫入被拒

- **WHEN** 任一 client（即使已登入）嘗試寫 `exchange_rates/{date}`
- **THEN** rules 拒絕（僅後端 Admin SDK 可寫）

#### Scenario: 未登入不可讀

- **WHEN** 未登入者嘗試讀 `exchange_rates/{date}`
- **THEN** rules 拒絕

### Requirement: USDT 匯率鍵（1:1 釘 USD）

`exchangeRates` 寫入函式 SHALL 於每筆 `exchange_rates/{date}` 文件的 `rates` 中，以 USD 匯率**衍生** USDT 鍵（1:1 peg，資料政策特判在寫入層、`convertMoney` 純查表合約不變）：`USDT_TWD = USD_TWD`、`TWD_USDT = TWD_USD`、`USDT_USD = "1.0000000000"`、`USD_USDT = "1.0000000000"`（皆 `Money` 10 位小數 string）。既有 `USD_TWD` / `TWD_USD` 鍵與文件其餘欄位不變。歷史文件不回填；USDT 換算於缺 key 時維持 fail-loud（ADR-0005，不臆測匯率）。

#### Scenario: 新文件含 USDT 四鍵

- **WHEN** 排程抓取寫入新的 `exchange_rates/{date}` 文件
- **THEN** `rates` SHALL 含 `USDT_TWD`（= `USD_TWD` 同值）、`TWD_USDT`（= `TWD_USD` 同值）、`USDT_USD` 與 `USD_USDT`（皆 `"1.0000000000"`）

#### Scenario: USDT 交易金額換算為 TWD

- **WHEN** 顯示層以最新 `rates` 將 `Money("100", "USDT")` 換算為 TWD（`convertMoney`）
- **THEN** 結果 SHALL 等同 100 USD 換算 TWD 的金額（1:1 peg），10 位小數 string

#### Scenario: 舊文件缺 USDT 鍵時 fail loud

- **WHEN** 以缺 USDT 鍵的舊 `rates` map 換算 USDT 金額
- **THEN** `convertMoney` SHALL 擲「exchange rate missing」錯誤，不得靜默臆測匯率
