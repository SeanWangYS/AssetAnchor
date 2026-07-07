# exchange-rates 變更（fix-usd-rate-source）

## MODIFIED Requirements

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

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: BOT CSV 解析（spot_sell 抽取）

**Reason**：台銀 `rate.bot.com.tw` 全站自 ~2026-06-30 起對非瀏覽器 client 回 anti-bot JS challenge（需執行 JS + cookie），伺服器端抓取 CSV 這條路已不可行，排程每日必失敗（production 實證，見 runbook `testflight-release.md` 坑 4）。

**Migration**：`parseBotCsv.ts` 及其測試隨本 change 移除；抓取改依「Yahoo chart 匯率解析」requirement。既有 `source: "BOT"` 歷史文件保留不動（見「exchange_rates 文件形狀」的並存 scenario）。
