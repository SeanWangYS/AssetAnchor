# ADR-0010：歷史價資料架構（price_history 落地日線 + 開圖 lazy 增量）

- 日期：2026-07-04
- 狀態：Accepted（owner 拍板：範圍/來源/架構/觸發四項決定）
- 關聯：ADR-0005（Money/decimal）、ADR-0006（報價雙層 cache）、ADR-0007 §5（報價來源政策）、change `add-real-trend-series`

## Context

持倉總覽與個股詳情的「資產走勢」圖需要真實歷史序列（owner 2026-06-19 標高優先：「走勢不可以是假資料」）。即時報價已有 ADR-0006 的雙層 cache（Yahoo v8 chart 單點 → `quotes/{symbolId}`），但歷史序列是不同性質的資料：一次抓一段、幾乎不變、量大且要回溯到使用者最早交易日。

外部研究（2026-07-04，含本機實測）確立的事實：

1. **Yahoo v8 chart 可拿完整歷史**：`period1/period2 + interval=1d` 實測 2330.TW 回溯至 2000（6,594 點）、`TWD=X` 至 2004；但 **`range=max&interval=1d` 會被靜默降級成月線**（不報錯，只能驗 `meta.dataGranularity`）；FX 序列有零星 null bar。
2. **Yahoo 2025 起 429 收緊**、datacenter IP（含 GCP）風險偏高；社群共識＝少量大請求、結果落地自家 DB、Yahoo 只做增量。免費 fallback：台股有 TWSE 官方 API（keyless）、美股僅 Alpha Vantage（25 req/天）；Stooq 已死於反爬。
3. **Ghostfolio / Wealthfolio / Portfolio Performance 架構一致**：存 per-symbol 日線、市值圖由「交易 × 歷史價 × 匯率」請求時重建；無人存每日組合快照當第一手資料。Ghostfolio 另有兩個好模式：lazy backfill（起點＝該 symbol 最早交易日）與 7 天回看 upsert（append 與缺洞修補一石二鳥、冪等）。

## Decision

採 **「Firestore 落地 per-symbol 日線 + client 重建市值」**（Ghostfolio 模式），四項 owner 決定：

1. **範圍**：組合走勢序列＝只算證券市值（現金無歷史，不含；hero 卡含現金為另一數字）。
2. **FX 歷史**：Yahoo `TWD=X` 作 pseudo-symbol `FX_USDTWD` 走同一條管線（BOT `exchange_rates` 僅存最新牌告、L6M 上限，不可回溯）。顯示層「現值」換算仍用 BOT——歷史圖與現值用途不同、來源分工。
3. **落地**：新 collection `price_history/{symbolId}_{year}`（per-symbol per-year 分塊；欄位見 planning §6 Collection 7）。分塊理由：一天一 doc 讀爆量（1Y=250 reads×N symbols）、單一大 doc 寫入放大（每次增量重寫 250KB）；年塊 ≈8KB，1Y 圖每 symbol 讀 2 docs。rules 同 `quotes`（登入可讀、只有 Cloud Function 可寫）。
4. **觸發**：開圖時 lazy（functions `ensureHistory`）——`last_date` 已涵蓋最近預期交易日則 no-op；否則自 `max(from, last_date−7d)` 增量（7 天回看 upsert 順帶修補假日/缺洞）；首次即全段 backfill（起點＝該 symbol 最早交易日）。**不做排程**（owner 先前已否決報價排程；不用 app 的日子不花任何資源）。

配套技術決定：

- **抓取紀律**：首選 `period1/period2`（禁 `range=max`）＋逐回應驗 `dataGranularity === '1d'`（不符 fail loud、不寫髒資料）；429 時依序 fallback：換主機（query1→query2，實測限流分開計）、改用最小涵蓋的**有界 range bucket**（5d…10y）；請求間隔 ≥1s、退避重試一次。**UA 用平實的 `Mozilla/5.0 (AssetAnchor)`**——emulator 實測（2026-07-04）假冒完整 Chrome UA 會與 Node fetch 的 TLS 指紋不符、反而更易 429；誠實 UA 穩定通過（研究的「帶瀏覽器 UA」建議對本 stack 不成立）。
- **盤中粒度（AssetDetail 1D/1W）不落地**：`fetchIntraday` 即抓即回（時效短，落地無意義），mobile 記憶體 cache 15min。
- **存 `close` 為主、`adjclose` 一併落地**：市值＝實際持股 × 原始收盤；adjclose 會被除權/分割回溯改寫，不適合直接當市值輸入，先存備未來還原。
- **市值序列在 client 以 shared 純函式重建**（`buildPortfolioSeries`：交易時序掃描 × forward-fill 日線 × FX），Money 全程、`toNumber()` 只在 Chart 邊界；缺價/缺匯率的日期整點剔除（不畫假值）。
- **provider 介面化**（`HistoryProvider`）：來源可替換，台股 fallback 候選 TWSE 官方 API（本階段只留介面）。

## Consequences

- ✅ Yahoo 呼叫降到「每 symbol 每次開圖最多一次增量」；被 429 時圖表仍有既有落地資料（只少最新幾天），與 resilient-quote-display 同一降級哲學。
- ✅ 跨裝置共享、Firestore local cache 天然半離線；未來 TWR/績效/benchmark 都建立在這份資料上。
- ✅ 補登/修改過去交易不會弄髒任何落地資料（市值是推導值，重算即正確）——這是否決「每日組合快照」的核心理由。
- ⚠️ 聖牛 schema 新增 collection（已走 owner gate，2026-07-04 拍板；三端影響評估見 change design.md）。
- ⚠️ 分割/除權未還原：市值歷史段在分割事件附近失真（台股+ETF 為主影響小）；`adjcloses` 已落地，還原屬未來 change。
- ⚠️ 首次開圖 backfill 有一次性延遲（10 symbols ≈ 10–15s，節流下）；之後永久增量。

## Alternatives

- **A. 不落地（即抓即回 + client cache）**：零 schema 變更，但 429 風險直接暴露在每次使用路徑、無離線、換裝置重抓、ALL 每次抓全歷史。否決。
- **C. 每日組合市值快照（per-user）**：圖表讀取最簡單，但無法回補功能上線前的歷史（圖前段永遠空白）、補登/修改交易會讓已存快照變髒需重算、且需排程。三個開源實作皆不採用。否決（快照未來僅可作快取層）。
- **BOT 累積當 FX 歷史**：與現值同源，但只有 L6M 可回溯、僅台灣營業日，1Y/ALL 缺洞。否決。

## References

- 研究彙整（Yahoo 端點實測、429 現況、替代源比較、Ghostfolio 原始碼）：change `add-real-trend-series` 探索紀錄（2026-07-04）
- Ghostfolio `data-gathering.service.ts` / `cron.service.ts`（lazy backfill + 7 天回看模式）
- yfinance issues #2451（max×1d 降級）、discussion #2431（429 現況）
