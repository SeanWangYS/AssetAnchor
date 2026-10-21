## MODIFIED Requirements

### Requirement: ensureHistory lazy 增量與回補

functions SHALL 提供 HTTP `ensureHistory`（onRequest，`?items=market:symbol:currency:from,...`）：每 item 查最新年度 doc 的 `last_date`——已涵蓋最近預期交易日則 no-op；否則自 `max(from, last_date − 7 天)` 抓到今日並 upsert（7 天回看，append 與缺洞修補冪等）。`last_date` 不存在時 SHALL 自 `from`（該 symbol 最早交易日）全段回補。逐 item 錯誤隔離（單檔失敗不拖垮整批）；對 Yahoo 的請求 SHALL 間隔 ≥1 秒、429 退避重試，User-Agent SHALL 與 client TLS 指紋一致（平實 UA；不得假冒瀏覽器——實測會觸發 UA/TLS 不符偵測）。每個對 Yahoo 的請求 SHALL 在 8 秒內未回應即中止（視為該 item 失敗）。函式 timeout SHALL 為 120 秒；處理開始後已耗時 ≥ 50 秒時 SHALL 不再開始新的 item，其餘 item 以 `{ symbolId, error, deferred: true }` 回傳且不呼叫 Yahoo。回傳各 item `{ symbolId, lastDate }` 或 `{ symbolId, error }`。

#### Scenario: 已是最新則不打 Yahoo

- **WHEN** `ensureHistory` 收到的 symbol 其 `last_date` 已涵蓋最近一個預期交易日
- **THEN** 該 item 不呼叫 Yahoo，直接回傳現有 `lastDate`

#### Scenario: 首次回補

- **WHEN** symbol 無任何 `price_history` doc
- **THEN** 自 `from` 日期起抓取完整日線並依年份分塊寫入，各 doc `last_date` 正確

#### Scenario: 單檔失敗隔離

- **WHEN** 批次中某 symbol 抓取失敗（如 429）
- **THEN** 該 item 回 `{ symbolId, error }`，其餘 item 正常完成且已落地資料不受影響

#### Scenario: 時間預算用盡延後其餘 item

- **WHEN** 批次處理到第 N 個 item 時已耗時 ≥ 50 秒
- **THEN** 第 N 個起的 item 皆回 `{ symbolId, error, deferred: true }`、不呼叫 Yahoo，已完成的 item 結果照常回傳

#### Scenario: Yahoo 請求卡住

- **WHEN** 某次 Yahoo 請求 8 秒內未回應
- **THEN** 該請求中止，該 item 回 `{ symbolId, error }`，批次繼續處理下一個 item
