# Delta: live-quotes（enable-crypto-quotes）

## ADDED Requirements

### Requirement: crypto ticker 組法（`-USD` 後綴）

`toYahooSymbol` SHALL 對 `market === 'CRYPTO'` 組出 `${symbol}-USD`（後綴寫死 `USD`，不得取自 `symbol.currency`——Yahoo 無 `BTC-USDT` 類 pair）；`TW → .TW`、其餘市場原樣的既有行為不變。使用者輸入層維持只打幣種代號（`BTC`），後綴為系統知識（同台股打 `2330` 不打 `.TW`）。

#### Scenario: CRYPTO 標的組出 -USD ticker

- **WHEN** 以 `market="CRYPTO"`、`symbol="BTC"` 呼叫 `toYahooSymbol`
- **THEN** 回傳 `"BTC-USD"`（既有 `TW→2330.TW`、`US→AAPL` 原樣行為不變）

#### Scenario: crypto 報價取得正確標的價格

- **WHEN** 持倉含 `CRYPTO_BTC`，觸發 `fetchQuote`/`fetchQuotes`
- **THEN** 後端向 Yahoo 請求 `BTC-USD`（CRYPTOCURRENCY），寫入 `quotes/CRYPTO_BTC` 的價格為 BTC 市場價，而非同名 ETF 價

### Requirement: Yahoo 回應標的身分驗證（防靜默錯價）

`parseYahooChart` SHALL 於輸出中帶回 Yahoo `meta.symbol`（缺值為 null）。`QuoteProvider`（yahooProvider）SHALL 於解析後比對回傳標的與請求的 ySymbol（大小寫不敏感）：**有值且不一致**時 SHALL 擲 `SymbolNotFoundError`（歸類 `symbol_not_found` 永久錯誤，走既有「查無代號」降級，不得將錯誤標的價寫入 `quotes/`）；`meta.symbol` 缺值時不擋（避免來源減欄位造成全面斷流）。

#### Scenario: 回錯標的被擋下（原 bug 場景）

- **WHEN** 請求 `BTC-USD` 但 Yahoo 回應之 `meta.symbol` 為其他標的（模擬 200 回錯標的）
- **THEN** provider SHALL 擲 `SymbolNotFoundError`，`quotes/{symbolId}` 不被寫入，client 顯示「查無報價代號」降級而非錯價

#### Scenario: 身分相符正常放行

- **WHEN** 請求 `2330.TW` 且回應 `meta.symbol === "2330.TW"`（或大小寫差異）
- **THEN** 報價正常解析、驗證、寫入

#### Scenario: meta.symbol 缺值不誤殺

- **WHEN** Yahoo 回應缺 `meta.symbol` 但含有效價格
- **THEN** 身分驗證 SHALL 跳過（不擲錯），沿用既有 sanity 驗證路徑

### Requirement: 報價幣別由市場決定（與成本幣別分離）

報價幣別 SHALL 由市場決定，`packages/shared` 提供純函式 `quoteCurrencyForMarket(market, fallback)`：`TW→TWD`、`US→USD`、**`CRYPTO→USD`**、`OTHER→fallback`。強制點：

- functions `fetchQuote` / `fetchQuotes` 入口 SHALL 對 `market=CRYPTO` coerce 報價幣別為 `USD`（server 為 `quotes/{symbolId}` 唯一寫入者；client 聲稱的幣別不可信）；既有錯值 doc 於 TTL 過期後被正確值覆寫。
- mobile 為 QuoteEntry 標幣別 SHALL 用 `quoteCurrencyForMarket`（不得抄 position 的交易幣別）。
- 估值 SHALL 以**報價幣別**為報價定價（市值、今日漲跌）；市值（報價幣別）與成本（lot 交易幣別）**各自**換算至顯示幣別後再計算未實現損益（ADR-0005 顯示時換算），不得把報價金額誤標為交易幣別。

#### Scenario: crypto quote doc 幣別恆 USD

- **WHEN** client 以 `CRYPTO:BTC:TWD` 請求報價（TWD lot 的舊行為）
- **THEN** 後端 SHALL 以 USD 寫入 `quotes/CRYPTO_BTC`（`currency="USD"`）

#### Scenario: TWD 記帳的 crypto 持倉市值正確換算

- **WHEN** 持有 `CRYPTO/BTC` 0.15 股（TWD lot、成本 NT$12,600），BTC 報價 US$64,000、USD_TWD=32
- **THEN** 顯示幣別 TWD 下市值 SHALL ≈ NT$307,200（0.15×64,000×32），未實現損益 = 市值(TWD) − 成本(TWD)；SHALL NOT 把 USD 報價當 TWD 計成 NT$9,600
