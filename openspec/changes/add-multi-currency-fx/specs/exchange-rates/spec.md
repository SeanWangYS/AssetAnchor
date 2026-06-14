## ADDED Requirements

### Requirement: 每日台銀匯率抓取與寫入

系統 SHALL 以 `apps/functions` 的排程 Cloud Function（`onSchedule`，時區 Asia/Taipei，每日牌告固定後執行）抓取台灣銀行牌告匯率、解析 USD 即期賣出（`spot_sell`），並以 Admin SDK 寫入 `exchange_rates/{date}`（`date` = 實際牌告日）。寫入 SHALL 為 idempotent（同一牌告日重跑覆寫同一文件，不重複建立）。此為專案第一個 Cloud Function（planning §13.3 里程碑）。

#### Scenario: 排程觸發抓取並寫入最新牌告

- **WHEN** 排程觸發、台銀有當日牌告
- **THEN** 系統解析 USD `spot_sell`，寫入 `exchange_rates/{該牌告日}`，含雙向 `rates`

#### Scenario: 以實際牌告日為 document id

- **WHEN** 函式於非交易日（週末/假日）執行、台銀仍回最近一個工作日牌告
- **THEN** document id 為**該牌告的實際資料日期**（非執行當天），故不產生「假日空匯率」文件

#### Scenario: 同一牌告日重跑為 idempotent 覆寫

- **WHEN** 同一牌告日函式被執行多次
- **THEN** `exchange_rates/{牌告日}` 被覆寫而非重複建立，內容一致

### Requirement: BOT CSV 解析（spot_sell 抽取）

`apps/functions` SHALL 提供可獨立測試的純解析函式，從台銀 `flcsv/0/L6M/USD` CSV（UTF-8 BOM + CRLF，含「資料日期」欄）取最新一行，抽出牌告日與「本行賣出／即期」欄作為 `spot_sell`。解析失敗（格式變動、缺欄、非數值）SHALL fail loud，**不得寫入半套文件**。（實測：`flcsv/0/L6M` 無幣別會回「找不到資料」、`flcsv/0/day` 無日期欄，故採 `L6M/USD`。）

#### Scenario: 從 L6M/USD 頂行抽出 spot_sell 與牌告日

- **WHEN** 解析一段合法的台銀 USD L6M CSV
- **THEN** 回傳最新一行的牌告日（`YYYY-MM-DD`）與 `spot_sell`（10 位小數 string）

#### Scenario: 解析失敗時 fail loud

- **WHEN** CSV 格式變動或目標欄位非數值
- **THEN** 函式拋出明確錯誤、不寫入 `exchange_rates`，由 logs 可見失敗

### Requirement: exchange_rates 文件形狀

`exchange_rates/{date}` 文件 SHALL 含：`date`（牌告日 `YYYY-MM-DD`）、`source`（`"BOT"`）、`rate_type`（`"spot_sell"`）、`rates`（至少 `USD_TWD` 與 `TWD_USD` 兩向，皆 `Money` 10 位小數 string）、`fetched_at`（`serverTimestamp()`）、`is_estimated`（boolean，本模型以實際牌告日為 key，恆 `false`）。對照 planning §6：精簡 `rates` 為雙向（移除第二階段才用的 `_buy`/`_cash_sell`），新增 `rate_type` 明示基準。

#### Scenario: 欄位完整

- **WHEN** 檢視任一筆 `exchange_rates` 文件
- **THEN** `date`、`source`、`rate_type`、`rates`、`fetched_at`、`is_estimated` 皆存在且型別正確

#### Scenario: rates 含雙向且為 10 位小數 string

- **WHEN** 寫入 USD/TWD 匯率
- **THEN** `rates.USD_TWD` 與 `rates.TWD_USD` 皆為 `Money.toDecimalString()` 格式（互為倒數，預存省顯示層計算）

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
