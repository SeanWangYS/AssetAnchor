# ADR-0004: 交易採 Event Sourcing schema + 動態 holdings 計算

- **狀態**：Accepted
- **日期**：2026-06-10
- **相關**：planning doc §4（報酬計算）、§6（Collection 3 transactions schema = 聖牛）、§13.5（ADR 寫入時機）、ADR-0007（測試策略）；於 OpenSpec change `add-transaction-entry`（Sprint 3 Change 1）首次落地

## Context

planning doc §6 早已把 `users/{uid}/transactions/{id}` 定為「核心 event sourcing 表」，並明訂「不存 holdings collection、持倉動態計算」。此設計在 Sprint 0 即落成 `packages/shared` 的 `TransactionDocument` 型別與 §8 複合索引，但直到 Sprint 3 才第一次真正寫入交易、據以推導持倉。本 ADR 在此落地時點，把這個**已於規劃階段拍板**的決策正式記錄成 ADR（§13.5 將其列為 ADR-004），讓後續 Change 2（持倉計算）、Sprint 4（多幣別）、Sprint 5（賣出/損益）能一致引用，而非散落在 planning doc。

投資組合 App 的資料本質是「一連串交易事件」：買、賣、配息、分割、併購…。持倉股數、加權平均成本、已實現/未實現損益**全是這些事件的衍生計算**。如何儲存這條事件流，決定了資料一致性風險、計算正確性、與未來擴充（年化報酬、IRR、走勢圖）的可能性。

## Decision

### 1. transactions 為 append-only 事件流

每筆交易是一個**不可變事件**（`transaction_type` ∈ BUY / SELL / DIVIDEND_* / SPLIT / …，MVP 僅 BUY）。不在交易上就地改寫持倉，而是新增事件。事件保留 `transaction_date`、原始幣別、對稱多幣別 `amounts` map（交易日匯率，歷史保真）、以及預留欄位 `lot_id` / `related_transaction_id` / `ex_date`（FIFO/賣出對應/除權息，後續階段用）。

### 2. 不存 holdings collection——持倉動態計算

持倉是衍生資料：`持有股數 = Σ(BUY 股數) − Σ(SELL 股數)`、`加權平均成本 = 總成本(含手續費) / 總股數`（§4）。**不**另存 holdings 文件，每次需要時由 transactions 即時推導。理由：

- 衍生資料若落地，就有「事件與快照不一致」的風險（漏更新、競態）；不存就沒有這個 bug 類別。
- MVP 交易筆數小（自用），動態計算速度無虞。
- 賣出歸零後重買視為新持有週期（§4）——event log + `lot_id` 預留即可支援，不需可變持倉記錄。

### 3. 對稱式多幣別 amounts map（歷史保真）

每筆事件以對稱 JSON map 記錄各幣別金額（含原始幣別，`is_original` 標記），用**交易日**匯率換算。單幣別（MVP Sprint 3）只填原幣別一筆、`rate=1`、`amounts_status=COMPLETE`；多幣別（Sprint 4）再補第二個 key。schema 預留多幣別，未來加 JPY/EUR 不需重構。

### 4. 純推導邏輯放 `packages/shared`

持倉/成本/損益的推導是跨端純函式（mobile 顯示、未來 functions 可能也用），放 `packages/shared`、走 TDD ≥90%（ADR-0007）。交易文件組裝（`buildTransactionDoc`）同理放 shared。Firestore I/O 留在 mobile service 層（seam 分離）。

### 5. 何時改存 holdings / daily_snapshots（重訪條件）

- 交易筆數 > 千筆（動態計算變慢）
- 需要每日資產走勢圖（daily_snapshots，第二/三階段）
- 需要即時推播

未達上述條件前，維持純動態計算。

## Consequences

- **單一事實來源**：transactions 是唯一真相，持倉/成本/損益皆可重算、可稽核、可對帳；不會有快照漂移。
- **計算成本**：每次載入持倉需掃該使用者 transactions 重算——MVP 規模可接受；超過閾值（決策 5）再引入快照。
- **schema 是聖牛**：`TransactionDocument`（= §6）為 mobile / functions / shared 的單一型別來源，改欄位前必須逐三端評估（OpenSpec design 強制對照）。Sprint 3 Change 1 已驗證單幣別 BUY 為其零變更子集。
- **推導邏輯的測試紀律**：Change 2 的 `costBasis` / holdings 推導以 §4 worked example（台積電 avg=550.76）為 fixture，先測再實作。
- **未來擴充友善**：年化報酬、TWR、IRR、含息總報酬（第二階段）都能在不改既有事件的前提下，從同一條事件流推導。

## Alternatives Considered

- **另存 holdings collection（持倉快照）**：讀取快、但引入事件↔快照一致性風險（需在每次交易時同步更新，易漏、競態），且 MVP 不需要。否決，留待筆數/走勢圖需求出現（決策 5）。
- **可變持倉記錄（就地改股數/成本，不留事件）**：最省儲存，但喪失歷史與稽核能力，無法支援「賣出歸零重買=新週期」、IRR、對帳。否決。
- **以非對稱單幣別儲存、顯示時即時換匯**：省欄位，但喪失交易日匯率的歷史保真，日後對帳/報酬計算會因匯率變動而對不起來。否決（採對稱 amounts map）。
- **不寫獨立 ADR，僅留 planning doc §6**：可行，但 event sourcing 是跨多個 sprint 反覆引用的基礎決策，獨立 ADR 才能被 Change 2 / S4 / S5 一致連結。否決。
