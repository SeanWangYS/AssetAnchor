# price-history Specification (delta)

## ADDED Requirements

### Requirement: Yahoo 歷史抓取以 period1/period2 並驗證粒度

functions 的歷史抓取 SHALL 以 `period1`/`period2`（Unix 秒）+ `interval=1d` 呼叫 Yahoo v8 chart 為首選；429 限流時 SHALL 依序 fallback：換主機（query1→query2，限流實測分開計）、改用**最小涵蓋的有界 range bucket**（5d…10y；一律禁用 `range=max`）。無論路徑 SHALL 驗證回應 `meta.dataGranularity === '1d'`；不符者 SHALL fail loud（不寫入任何資料）。解析 SHALL 為純函式 `parseYahooHistory`（不打外網、可測），輸出 `{ date, close, adjclose }[]`，close 為 null 的 bar 保留 null 由消費端處理。

#### Scenario: 靜默降級月線被擋下

- **WHEN** Yahoo 回應的 `meta.dataGranularity` 為 `'1mo'`（月線降級）
- **THEN** 該 symbol 本次增量 SHALL 失敗（fail loud），`price_history` 不寫入任何內容

#### Scenario: 正常日線解析

- **WHEN** Yahoo 回應含 `timestamp[]` 與 `indicators.quote[0].close[]`、`indicators.adjclose[0].adjclose[]` 且粒度為 `1d`
- **THEN** 解析輸出等長的 `{ date: YYYY-MM-DD, close, adjclose }[]`，日期以交易所時區換算

### Requirement: price_history 落地 schema 與安全規則

系統 SHALL 以 `price_history/{symbolId}_{year}` per-symbol per-year 分塊落地日線（欄位：`symbol_id, market, symbol, currency, year, closes, adjcloses, last_date, source, updated_at`；價格為 `Money` 10 位小數 string）。Firestore rules SHALL 設定登入者可讀、client 不可寫（只有 Admin SDK / Cloud Function 可寫），並有 rules 測試驗證。

#### Scenario: 登入者可讀

- **WHEN** 已登入使用者讀取 `price_history/TW_2330_2025`
- **THEN** 讀取成功

#### Scenario: client 寫入被拒

- **WHEN** 任何 client（含已登入）嘗試寫入 `price_history/**`
- **THEN** 寫入被 rules 拒絕

### Requirement: ensureHistory lazy 增量與回補

functions SHALL 提供 HTTP `ensureHistory`（onRequest，`?items=market:symbol:currency:from,...`）：每 item 查最新年度 doc 的 `last_date`——已涵蓋最近預期交易日則 no-op；否則自 `max(from, last_date − 7 天)` 抓到今日並 upsert（7 天回看，append 與缺洞修補冪等）。`last_date` 不存在時 SHALL 自 `from`（該 symbol 最早交易日）全段回補。逐 item 錯誤隔離（單檔失敗不拖垮整批）；對 Yahoo 的請求 SHALL 間隔 ≥1 秒、429 退避重試，User-Agent SHALL 與 client TLS 指紋一致（平實 UA；不得假冒瀏覽器——實測會觸發 UA/TLS 不符偵測）。回傳各 item `{ symbolId, lastDate }` 或 `{ symbolId, error }`。

#### Scenario: 已是最新則不打 Yahoo

- **WHEN** `ensureHistory` 收到的 symbol 其 `last_date` 已涵蓋最近一個預期交易日
- **THEN** 該 item 不呼叫 Yahoo，直接回傳現有 `lastDate`

#### Scenario: 首次回補

- **WHEN** symbol 無任何 `price_history` doc
- **THEN** 自 `from` 日期起抓取完整日線並依年份分塊寫入，各 doc `last_date` 正確

#### Scenario: 單檔失敗隔離

- **WHEN** 批次中某 symbol 抓取失敗（如 429）
- **THEN** 該 item 回 `{ symbolId, error }`，其餘 item 正常完成且已落地資料不受影響

### Requirement: FX 歷史以 pseudo-symbol 落地

USD→TWD 歷史匯率 SHALL 以 pseudo-symbol `FX_USDTWD`（Yahoo `TWD=X`）走同一條 `ensureHistory` 管線落地（`market: 'FX'`、`currency: 'TWD'`），backfill 起點＝使用者全域最早交易日。shared 的 `Market` enum SHALL 不受影響（本 collection 自有 `HistoryMarket` 型別）。

#### Scenario: FX 序列落地

- **WHEN** `ensureHistory` 收到 `FX:USDTWD:TWD:<最早交易日>` item
- **THEN** `price_history/FX_USDTWD_{year}` docs 建立，closes 為 TWD 計價的 `Money` string

### Requirement: 盤中序列即抓即回不落地

functions SHALL 提供 HTTP `fetchIntraday`（onRequest，`?market=&symbol=&tf=1D|1W`），對應 Yahoo `range=1d&interval=5m`（1D）/ `range=5d&interval=30m`（1W），直接回傳點列，SHALL NOT 寫入 Firestore。

#### Scenario: 1D 盤中點列

- **WHEN** mobile 以 `tf=1D` 呼叫 `fetchIntraday`
- **THEN** 回傳當日 5 分鐘粒度點列，Firestore 無新增寫入
