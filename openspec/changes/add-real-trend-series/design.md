# Design: add-real-trend-series

## Context

- 兩畫面走勢圖目前吃 `holdingsDemo.ts` 的 `DEMO_SERIES` 假折線：`HoldingsOverviewScreen`（tabs `1M/3M/YTD/1Y/ALL`，預設 `1Y`）、`AssetDetailScreen`（tabs `1D/1W/1M/3M/1Y/ALL`，預設 `1M`）。`Chart` 元件（`core/ui/charts/Chart.tsx`）吃 `readonly number[]`，純展示，不需改。
- 報價基礎已 ship：雙層 cache（in-memory → `quotes/{symbolId}` → functions `fetchQuotes` → Yahoo v8 chart，ADR-0006）；`getOrFetchQuote` 的 lazy + 15min TTL 模式；resilient-quote-display 的降級哲學（有舊資料先畫、背景刷新）。
- 交易資料全在 client（zustand transactionsStore），`transaction_date` 為 `YYYY-MM-DD` 字典序；`deriveHoldings` 以 `(market, symbol)` 聚合——任意日期的持股量可由交易流重建。
- 外部研究（2026-07-04，含實測）：Yahoo v8 chart 歷史序列可行（2330.TW 回溯至 2000、`TWD=X` 至 2004）；**`range=max&interval=1d` 會被靜默降級成月線**，須用 `period1/period2` 並驗 `meta.dataGranularity`；2025 起 429 收緊，緩解＝少量大請求 + 落地自家 DB；Ghostfolio/Wealthfolio/Portfolio Performance 一致採「存 per-symbol 日線、圖表時重建市值」。
- Owner 已拍板（2026-07-04）：只算證券市值、FX 用 Yahoo `TWD=X`、主架構＝Firestore 落地日線（方案 B）、增量＝開圖 lazy。

## Goals / Non-Goals

**Goals:**

- 兩畫面走勢圖全 timeframe 接真實序列，`DEMO_SERIES` 移除。
- 歷史日線落地 Firestore，Yahoo 呼叫降到「每 symbol 每次開圖最多一次增量」；Yahoo 被擋時圖表仍可用既有落地資料。
- 序列重建為 shared 純函式（TDD、coverage gate 內），精度全程 `Money`，`toNumber()` 只在 Chart 邊界。

**Non-Goals:**（見 proposal Non-goals：現金、分割還原、TWR/benchmark、排程、fallback provider 實作、MMKV）

## Decisions

### D1. 主架構＝Firestore 落地 per-symbol 日線（方案 B，Ghostfolio 模式）

即抓即回（A）把 Yahoo 429 風險暴露在每次使用路徑、無離線；每日組合快照（C）無法回補上線前歷史、補登/改交易會弄髒快照。B 與現有 ADR-0006 雙層 cache 同構，並為未來績效功能鋪資料。**記錄為 ADR-0010**（Context→Decision→Consequences→Alternatives 含 A/C 與研究來源）。

### D2. Schema：`price_history/{symbolId}_{year}`（per-symbol per-year 分塊）——聖牛逐欄評估

Doc 形狀取捨：一天一 doc（讀爆量：1Y 圖 = 250 reads × N symbols）；單一大 doc（20 年 ≈ 250KB，每次增量重寫整 doc，寫入放大）；**per-year 分塊**（一年 ≈ 250 筆 ≈ 8KB，1Y 圖每 symbol 讀 2 docs、ALL(25y) ≈ 26 docs，增量只寫當年 doc）→ 選分塊。

| 欄位         | 型別                        | 說明（對照 planning §6 慣例）                                                                                                |
| ------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `symbol_id`  | string                      | 同 `quotes/{symbolId}` 的 id 慣例（`TW_2330`/`US_AAPL`）；FX pseudo-symbol 用 `FX_USDTWD`                                    |
| `market`     | string                      | `'TW' \| 'US' \| 'FX'`——**不動 shared `Market` enum**（交易域不變）；本 collection 自有型別 `HistoryMarket = Market \| 'FX'` |
| `symbol`     | string                      | 原始代號（`2330`/`AAPL`/`USDTWD`）                                                                                           |
| `currency`   | Currency                    | 序列計價幣別（TW→TWD、US→USD、FX→TWD）                                                                                       |
| `year`       | number                      | 分塊年份，同 doc id 後綴                                                                                                     |
| `closes`     | map\<`YYYY-MM-DD`, string\> | 日線收盤，`Money` 10 位小數 string（ADR-0005 canonical）                                                                     |
| `adjcloses`  | map\<`YYYY-MM-DD`, string\> | 還原收盤，備未來除權/分割還原用，本 change 不消費                                                                            |
| `last_date`  | string                      | 該 doc 已涵蓋的最後日期（增量起點查詢，免掃 map）                                                                            |
| `source`     | string                      | provider 名（`yahoo-finance`），同 `quotes` 慣例                                                                             |
| `updated_at` | timestamp                   | serverTimestamp                                                                                                              |

三端影響：**shared** 新增 `PriceHistoryDocument` type + zod schema（新檔，不動既有 types）；**functions** 新增 writer（Admin SDK upsert merge `closes`）；**mobile** 新增 reader（`getDoc` 直讀，同 `readFirestoreCache` 模式）。既有 collections、`Market`/`Currency` enum、rules 既有段落皆不動。**rules 新增段**：`price_history/{docId}`＝登入可讀、`write: if false`（只 Admin SDK），與 `quotes` 同款；rules 測試必補。planning §6 增補 Collection 7（tasks 內含）。

### D3. FX 歷史＝pseudo-symbol 走同一條管線

`FX_USDTWD`（Yahoo `TWD=X`）以同 schema 落地，backfill 起點＝全域最早交易日。換算歷史市值時 USD 部位乘上當日 FX close（forward-fill 補 null；Yahoo FX 序列實測有零星 null bar）。顯示層現值仍用既有 `exchange_rates`（BOT）——兩者用途不同（歷史圖 vs 現值），註記於 ADR-0010。

### D4. functions `ensureHistory`（onRequest，lazy 增量）

`GET ?items=market:symbol:currency:from,...`（`from`＝該 symbol 最早交易日，client 計算）。每 item：讀該 symbol 最新年度 doc 的 `last_date` → 已涵蓋到最近一個預期交易日則 no-op；否則 Yahoo `period1=max(from, last_date-7d)`、`period2=now`、`interval=1d` 抓取，**驗 `meta.dataGranularity === '1d'`**（不符 fail loud），7 天回看 upsert（append + 假日/缺洞修補，冪等）。逐筆錯誤隔離（同 `fetchQuotes` 慣例）；請求間隔 ≥1s、429 指數退避、瀏覽器 UA。回傳各 item 的 `{ symbolId, lastDate }`（資料本體不回傳，client 從 Firestore 讀——維持單一讀取路徑）。首次 backfill＝同一呼叫的自然特例（`last_date` 不存在 → 從 `from` 全抓）。

### D5. 盤中粒度（AssetDetail `1D`/`1W`）＝即抓即回，不落地

盤中資料時效短、落地無意義。新增 functions `fetchIntraday`（onRequest，`?market=&symbol=&tf=1D|1W` → Yahoo `range=1d&interval=5m` / `range=5d&interval=30m`），直接回傳點列，mobile 記憶體 cache（TTL 對齊 15min）。與 D4 共用 `parseYahooHistory` 解析器。

### D6. shared 純函式（TDD）

- `forwardFillSeries(dates, closes)`：null/缺日補前值。
- `buildSymbolSeries(chunks, range)`：年度 docs → 排序日線點列切片。
- `buildPortfolioSeries(transactions, seriesBySymbol, fxSeries, displayCurrency, range)`：日期軸＝range 內各 symbol 交易日聯集；每日持股量由交易流重建（沿用 `deriveHoldings` 的時序掃描邏輯）；市值 = Σ qty(d) × close(d) × fx(d)，全程 `Money`，輸出 `{ date, value: Money }[]`。缺價 symbol 於該日 forward-fill；完全無資料的日期剔除。
- Timeframe 對應：Overview `1M/3M/YTD/1Y` 切片、`ALL`＝自全域最早交易日；AssetDetail 日線 tabs 同理、`ALL`＝自該 symbol 最早交易日（backfill 範圍即持有期，資料本來只有這段）。
- 序列末端 append 當日即時點（`quotesStore` 現價、fresh 時），圖含今日盤中。
- `toNumber()` 只在 screen 把 `Money[]` 轉 `number[]` 餵 `Chart` 時使用（ADR-0005 逃生門）。

### D7. mobile `services/history`（雙層 cache，不新增第三方依賴）

zustand `historyStore`：`loadFor(targets, earliestTxDates)` → ① 先讀 Firestore 年度 docs（`getDoc`，涵蓋 range 的年份）立即可畫（stale-while-revalidate）；② 背景打 `ensureHistory`，回傳 `lastDate` 比對 in-memory 版本，有更新才重讀該年度 doc。畫面消費 hooks：`useTrendSeries(tf)`（Overview）、`useSymbolSeries(market, symbol, tf)`（AssetDetail）。降級態對齊 resilient-quote-display：無任何資料＝載入中骨架；有舊資料＝先畫 + 背景刷新；刷新失敗保留舊圖不清空。

### D8. 存 `close` 為主、`adjclose` 一併落地

市值＝實際持股 × 原始收盤（真值）；adjclose 回溯改寫特性使其不適合直接當市值輸入，但先落地省未來重抓。分割失真列 Non-goals。

## Risks / Trade-offs

- [Yahoo 429/封鎖 GCP IP] → 落地後圖表永遠有既有資料（增量失敗只是少最新幾天）；退避 + 節流；provider 介面可換（台股 fallback 候選 TWSE 官方 API，留介面）。
- [Yahoo 靜默降級月線] → 逐回應驗 `dataGranularity`，不符即 fail loud、不寫髒資料（對齊 sanitizeQuote 哲學）。
- [TWD=X null bars] → shared `forwardFillSeries` 修補 + 測試涵蓋。
- [分割/除權失真] → Non-goals 明示；`adjcloses` 已落地，未來 change 可做還原。
- [首次開圖 backfill 延遲（數 symbol × 全歷史）] → stale-while-revalidate：無資料時顯示載入態，一次 backfill 後永久增量；請求間隔節流下 10 symbols ≈ 10–15s 一次性成本。
- [每日組合重建的 client 計算量] → 個人交易量（<100 筆）× 25 年日線 ≈ 數十萬次 Money 運算上界；實測前先以純函式效能測試驗證，必要時 memoize by (txHash, tf)。

## Migration Plan

無資料遷移（全新 collection）。dev 走 Firebase Emulator（functions + firestore）；**production functions/rules 部署＝owner gate（部署類）**，與其他累積變更批次執行。Rollback＝移除端點與 rules 段即可，collection 資料可整批刪除無下游依賴。

## Open Questions

（無——範圍/來源/架構/觸發皆已 owner 拍板，2026-07-04。）
