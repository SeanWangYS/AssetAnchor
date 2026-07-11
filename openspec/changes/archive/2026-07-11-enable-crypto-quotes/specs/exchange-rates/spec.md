# Delta: exchange-rates（enable-crypto-quotes）

## ADDED Requirements

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
