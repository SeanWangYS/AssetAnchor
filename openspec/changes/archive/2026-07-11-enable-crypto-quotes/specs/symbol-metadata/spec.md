# Delta: symbol-metadata（enable-crypto-quotes）

## ADDED Requirements

### Requirement: crypto symbol 的報價幣別恆為 USD

`symbols/{symbolId}` 的 `currency` 欄位語義為**報價幣別**；`market === 'CRYPTO'` 時 SHALL 恆為 `USD`，與交易幣別（`transaction.currency`，可 USD/USDT/TWD）分離。強制點兩處：mobile 由交易推導 symbol target 時，CRYPTO 標的的 `currency` SHALL 固定帶 `USD`（不抄交易幣別）；後端 `fetchSymbolMeta`（symbols 唯一寫入者）於 `market=CRYPTO` 時 SHALL 將寫入的 `currency` coerce 為 `USD`（防禦任何寫入端）。crypto metadata 查詢沿用 `toYahooSymbol` 的 `-USD` ticker（隨 live-quotes 修正生效）。

#### Scenario: USDT 記帳的 crypto 交易產生 USD 報價幣別的 symbol

- **WHEN** 使用者以 `currency="USDT"` 新增 CRYPTO/BTC 交易，觸發 symbol enrich
- **THEN** `symbols/CRYPTO_BTC` 的 `currency` SHALL 為 `"USD"`（非 USDT），metadata 以 `BTC-USD` 向 Yahoo 查得

#### Scenario: 後端 coerce 防禦直接呼叫

- **WHEN** `fetchSymbolMeta` 收到 `market=CRYPTO&currency=TWD` 的 query
- **THEN** 寫入 `symbols/{symbolId}` 的 `currency` SHALL 為 `"USD"`
