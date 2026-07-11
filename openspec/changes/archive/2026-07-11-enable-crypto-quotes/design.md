# Design: enable-crypto-quotes

## Context

資料模型全鏈本就支援 crypto（`MARKETS` 含 `CRYPTO`、表單可選、`symbolId=CRYPTO_BTC`），唯獨 market→Yahoo ticker 組法漏了 CRYPTO 分支：

- `apps/functions/src/quotes/parseYahooChart.ts:39-41` `toYahooSymbol`：只有 `TW→.TW`，else 原樣回傳 → 送 `BTC` 撞 NYSE Arca 同名 ETF，**HTTP 200 回 $28.27（非 404）**，靜默錯價寫進 `quotes/` cache；resilient-quote-display 的 404 降級接不到。
- `apps/functions/src/history/yahooHistoryProvider.ts:30` `toYahooHistorySymbol`：同缺 CRYPTO 分支（TW / FX pseudo-symbol 有分支）。
- `apps/functions/src/symbols/symbolMetaProvider.ts:27`：複用 `toYahooSymbol`——修函式即同時修復（三條 call path、兩個函式）。

更廣缺陷：`parseYahooChart` 從不驗證回傳標的身分（`meta.symbol`），任何市場都可能「200 但回錯標的」。

幣別現況：`CURRENCIES = [TWD, USD | JPY, EUR, HKD, CNY(Phase 2 reserved)]`；交易 schema `MVP_CURRENCIES = [USD, TWD]`；`expectedCurrencyForMarket` TW→TWD、US→USD、CRYPTO/OTHER→null，同一函式**同時**驅動表單自動同步與 schema 硬擋（`superRefine`）。`exchange_rates/{date}.rates` 目前只有 `USD_TWD`/`TWD_USD` 雙向；`convertMoney` 純查表、缺 key fail-loud（ADR-0005）。`symbols/{symbolId}` 由後端 `fetchSymbolMeta` 依 client query 參數寫入（含 `currency`）。

owner 2026-07-11 拍板：①Yahoo 為主（CoinGecko 備援翻案自 add-live-quotes Non-Goal、但另開 change）②USDT 記入聖牛作為**交易幣別**、1:1 釘 USD ③使用者只打 `BTC`、系統補 `-USD`（同台股打 `2330` 不打 `.TW`）。

## Goals / Non-Goals

**Goals:**

- crypto 標的（BTC、ETH…）三條 Yahoo call path（即時報價 / 歷史 / metadata）拿到正確標的的價。
- 「200 但回錯標的」整類靜默錯價被系統性擋下（所有市場受益，不只 crypto）。
- USDT 成為合法**交易幣別**（聖牛三端一致），換算以 1:1 釘 USD，`convertMoney` 合約不變。
- CRYPTO 市場的市場×幣別規則明確化：預設 USD、允許 USD/USDT/TWD。

**Non-Goals:**

- CoinGecko 備援、其他 stablecoin、USDT 作為可持有標的、crypto 專屬分析、既有錯價 cache 主動遷移、production 部署本身（owner gate）——見 proposal Non-goals。

## Decisions

### D1｜crypto ticker 寫死 `-USD`，不從 `symbol.currency` 組

`toYahooSymbol` / `toYahooHistorySymbol` 加 `market === 'CRYPTO'` 分支回 `${symbol}-USD`。**不可**用 `symbol.currency` 組（如 `BTC-USDT`）：Yahoo 無 `BTC-USDT` 會 404，且報價幣別與交易幣別是兩個概念（D4）。`symbolMetaProvider` 複用 `toYahooSymbol`，隨修隨好。

- 替代案：讓使用者輸入完整 `BTC-USD` → 否決（owner 拍板③：與台股 `2330` 慣例一致，後綴屬系統知識不該外洩給使用者；且既有交易資料已存 `BTC`）。

### D2｜標的身分護欄放在 provider 層，mismatch 歸類 `symbol_not_found`

`parseYahooChart` 維持純函式，輸出**新增 `yahooSymbol` 欄位**（`meta.symbol`，缺則 null）；`yahooProvider.fetch` 於 parse 後比對 `parsed.yahooSymbol` 與請求的 `ySymbol`（大小寫不敏感），不一致 → 擲 `SymbolNotFoundError`（永久錯誤，走既有「查無代號」降級 UI，重試不會成功——Yahoo 對該 ticker 的解讀就是別的標的）。歷史路徑 `yahooHistoryProvider` 以同法比對 `meta.symbol`（既有 `dataGranularity` 驗證旁再加一道，fail loud 不落地）。

- 為何不在 `parseYahooChart` 內比對：parse 函式不該知道「請求了什麼」；把預期值傳進 parse 會污染純解析職責，放 provider 層則量測點與錯誤分類（`quoteErrors.ts`）同層。
- 為何歸 `symbol_not_found` 而非 `transient`：mismatch 是永久性（Yahoo 固定把 `BTC` 解析成該 ETF），歸 transient 會無限重試。

### D3｜USDT peg 在 functions 寫入層特判，`convertMoney` 不動

`exchangeRates/fetchAndStore.ts` 寫 `exchange_rates/{date}` 時，以 USD 匯率衍生 USDT 鍵（1:1 peg）：`USDT_TWD = USD_TWD`、`TWD_USDT = TWD_USD`、`USDT_USD = USD_USDT = "1.0000000000"`。`convertMoney` 維持純查表 + 缺 key fail-loud（ADR-0005 不臆測匯率）。

- 替代案：`convertMoney` 內特判 USDT→視同 USD → 否決：peg 是**資料政策**不是換算邏輯，寫在產資料的單一位置，落地文件自我完備、可稽核；shared 純函式保持 dumb。
- 舊日期文件無 USDT 鍵：顯示層一律讀最新文件，部署後首次排程即補齊；補齊前 USDT 換算 fail-loud（可接受，MVP 尚無 USDT 交易存量）。

### D4｜報價幣別 vs 交易幣別分離（關鍵不變量）

- **`symbol.currency`（報價幣別）**：CRYPTO 一律 `USD`。強制點兩處：mobile `symbolTargetsFromTransactions`（CRYPTO target 的 currency 固定 USD、不抄 `t.currency`）＋ functions `fetchSymbolMeta`（server 為 symbols 唯一寫入者，market=CRYPTO 時 coerce `currency='USD'`——防禦既有 client / 未來寫入端）。
- **`transaction.currency`（交易/記帳幣別）**：可 USD / USDT / TWD。USDT 換算基準 1:1 釘 USD（D3）。

### D5｜`expectedCurrencyForMarket` 不動；新增「預設」與「允許集」兩個純函式

memory 拍板句「`expectedCurrencyForMarket` CRYPTO→USD」直譯會出錯：該函式同時餵 schema 硬擋（superRefine）——回 USD 會把 USDT/TWD 交易硬擋掉，牴觸拍板②。故拆概念：

- `expectedCurrencyForMarket`：**維持** TW→TWD、US→USD、CRYPTO/OTHER→null（硬擋語義不變）。
- 新增 `defaultCurrencyForMarket(market)`：TW→TWD、US→USD、**CRYPTO→USD**、OTHER→null——供表單自動同步（實現「CRYPTO 預設 USD」）。
- 新增 `CRYPTO_TRANSACTION_CURRENCIES = ['USD','USDT','TWD']` + schema superRefine 補 CRYPTO 分支：交易幣別不在集合內 → 繁中錯誤（硬擋）。OTHER 維持不約束。

### D6｜聖牛 schema 逐欄對照（planning §6）

| 欄位                    | 現況            | 變更                                  | mobile                      | functions                            | shared                            |
| ----------------------- | --------------- | ------------------------------------- | --------------------------- | ------------------------------------ | --------------------------------- |
| `CURRENCIES` enum       | 6 值（USDT 無） | ＋`USDT`（MVP 段）                    | picker 選項來源             | `fetchSymbolMeta` 白名單驗證自動放行 | enum + 白名單測試更新             |
| `transactions.currency` | MVP 限 USD/TWD  | 白名單 ＋USDT；CRYPTO 限 USD/USDT/TWD | 表單驗證/預設               | 不讀此欄（報價走 symbol）            | zod schema + 測試                 |
| `symbols.currency`      | 抄交易幣別      | CRYPTO 恆 USD（兩處強制，D4）         | target 推導改               | `fetchSymbolMeta` coerce             | 型別不變                          |
| `exchange_rates.rates`  | USD_TWD/TWD_USD | ＋USDT 四鍵（D3）                     | `convertMoney` 查表自動受益 | `fetchAndStore` 寫入                 | `RateMap` 型別本為 open map，不變 |

無欄位改名/刪除、無型別變更——全為 enum 擴值與資料鍵新增，向後相容（**BREAKING** 標記是治理層級，非 wire 相容性）。owner 已拍板（2026-07-11），人類介入 gate 已過。

### D7｜混幣別記帳＝per-currency lots（apply 期 e2e 發現；owner 拍板「簡單、資料相容」）

e2e 實測：種子 BTC（TWD）＋新增 BTC（USD）→ `deriveHoldings` 混幣別擲錯 → mobile fail-soft 全頁空。修法＝`scan()` 分組鍵由 `(market, symbol)` 改為 `(market, symbol, currency)`：同標的不同幣別為**獨立 lot / 獨立持倉列**，Money 運算永不跨幣別；顯示層本就逐持倉以 `convertMoney` 換算至顯示幣別，兩列 BTC 各自正確。資料零遷移、單幣別資料行為完全不變（key 多帶的 currency 對既有資料是常數）。

- SELL 沖銷同幣別 lot：`sellableQuantity(ForAccount)` 增加 `currency` 參數——賣出幣別選錯 → 可賣 0、表單自然擋下（不需新驗證規則）。
- 替代案：同標的鎖幣別（guard 禁混）→ 否決（owner：不要複雜化；且「MAX 用 TWD、幣安用 USDT 買同一顆幣」是合理記帳）。
- 替代案：推導時 FX 換算合併 → 否決（違反 ADR-0005「交易只記原幣別、顯示才換算」；且需歷史匯率）。

### D8｜全域總覽逐-symbol 容錯（owner 拍板併入本 change）

既有 `safeHoldingsFromTxs`（帳戶層，PR#21/#45）已是逐-(market,symbol) 隔離；新增 `deriveHoldingsSafe(transactions)` 直接複用之，HoldingsOverview / Analysis 的全域推導改用 safe 版——單一 symbol 爛資料（oversell / orphan SELL）只跳過該 symbol＋console.warn，**不再清空整個投資組合**。shared 原 `deriveHoldings` 維持 fail-loud（ADR-0007 不放寬）。

### D9｜報價幣別由市場決定（quoteCurrencyForMarket）

e2e 同時揪出既有靜默錯值：`quotes/{symbolId}`.currency 由 client 依 position.currency 傳入（BTC TWD lot → quote doc 標 TWD），估值層再以 position.currency 給報價定價（`valuation:113/191`）→ USD 報價被當 TWD 用（畫面 NT$9,632、實應 ~NT$308k）。修法＝新增 shared 純函式 `quoteCurrencyForMarket(market, fallback)`（TW→TWD、US→USD、**CRYPTO→USD**、OTHER→fallback）：

- functions `fetchQuote`/`fetchQuotes` 入口 coerce CRYPTO 的報價幣別為 USD（server 為 quotes 唯一寫入者，同 D4 防禦模式）；舊錯值 doc 於 TTL 過期後被覆寫。
- mobile quotesStore 給 QuoteEntry 標幣別時改用 `quoteCurrencyForMarket`（不再抄 position.currency）。
- 估值（valuation）給**報價**定價一律用報價幣別（`q.currency`）；市值（報價幣別）與成本（lot 幣別）**各自**換算至顯示幣別後再算未實現損益。今日漲跌同理。

## Risks / Trade-offs

- [Yahoo `meta.symbol` 格式差異（如大小寫、後綴變體）造成誤殺] → 比對大小寫不敏感；先以測試 fixture 覆蓋 TW（`2330.TW`）/ US（`AAPL`）/ CRYPTO（`BTC-USD`）三市場真實回應形狀；`meta.symbol` 缺值時**不擋**（避免 Yahoo 減欄位時全面斷報價），僅在「有值且不一致」時判死。
- [USDT peg 偏離 1:1（歷史上 depeg 事件）] → MVP 接受：記帳用途、偏差 <1% 遠小於報價意義；未來要精確可另抓 USDT-USD 實價（不在本 change）。
- [舊 `exchange_rates` 文件無 USDT 鍵] → 顯示層讀最新文件；部署後首次排程補齊；期間 fail-loud 符合 ADR-0005。
- [production `quotes/CRYPTO_*` 已有錯價 cache] → 15min TTL 過期後由修正後 ticker 覆寫，不需遷移；owner 部署後以 BTC 實測驗收。
- [`parseYahooChart` 回傳形狀新增欄位] → `ParsedYahooQuote` 是 functions 內部型別，加欄位向後相容；`RawQuote`（shared）不動。

## Migration Plan

1. shared（enum/純函式/schema + 測試）→ functions（ticker/護欄/peg + 測試）→ mobile（picker/預設/target 推導），單一 PR、CI 綠。
2. 部署（owner gate）：`firebase deploy --only functions`——`fetchQuote(s)`/`fetchHistory`/`fetchSymbolMeta`/`fetchExchangeRate` 全部重佈。
3. 驗收（owner，真機或 Simulator 連 prod）：新增 BTC 交易 → 報價 ≈ 市場價（非 $28）；`quotes/CRYPTO_BTC` 文件被正確價覆寫；USDT 交易可送出且換算正常。
4. 回滾：functions 重佈前一版即可；schema 擴值無資料遷移、無回滾負擔。

## Open Questions

（無——owner 已於 2026-07-11 拍板全部關鍵決策；D5 的函式拆分屬實作層調整，不改拍板語義。）
