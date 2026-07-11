# Delta: price-history（enable-crypto-quotes）

## ADDED Requirements

### Requirement: crypto 歷史 ticker 組法與標的身分驗證

`toYahooHistorySymbol` SHALL 對 `market === 'CRYPTO'` 組出 `${symbol}-USD`（後綴寫死 `USD`）；既有 `TW → .TW`、FX pseudo-symbol（`USDTWD → TWD=X`）行為不變。歷史抓取 SHALL 於既有 `dataGranularity === '1d'` 驗證之外，比對回應 `meta.symbol` 與請求 ySymbol（大小寫不敏感）：有值且不一致 SHALL fail loud，`price_history` 不寫入任何資料（防歷史序列被錯誤標的污染）。

#### Scenario: CRYPTO 歷史組出 -USD ticker

- **WHEN** 以 `market="CRYPTO"`、`symbol="BTC"` 呼叫 `toYahooHistorySymbol`
- **THEN** 回傳 `"BTC-USD"`；`ensureHistory` 對 crypto 持倉可增量回補正確日線

#### Scenario: 歷史回錯標的不落地

- **WHEN** 歷史回應之 `meta.symbol` 與請求 ySymbol 不一致
- **THEN** 本次增量 SHALL 失敗（fail loud），`price_history/{symbolId}` 不寫入任何 bar
