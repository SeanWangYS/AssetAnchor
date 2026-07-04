# analysis Delta Specification（wire-analysis-real-data）

## ADDED Requirements

### Requirement: 分析頁以真實持倉與報價聚合

分析頁的 hero 與五張圖卡 SHALL 以**真實資料**計算：持倉由 transactions 經 shared `deriveHoldings` 推導（零新增 Firestore 監聽），每檔市值 = 報價現價 × 股數（原幣別、全程 `Money`，ADR-0005），成本 = `Position.totalCost`；SHALL NOT 使用寫死的 mock holdings。標的名稱 SHALL 沿用 symbols metadata（缺值 fallback raw ticker）；資產類別（個股/ETF）SHALL 取自交易的 `asset_type`。報價 SHALL 走既有 quotes 雙層 cache（ADR-0006），與持倉頁共用，並沿用「targets 變動載入 + 分頁 focus/回前景檢查新鮮度」的載入時機。

`Position[]` × 報價 → `AnalysisRawHolding[]` 的映射 SHALL 為 `packages/shared` 純函式 `buildAnalysisInput`（報價與 metadata 以 resolver 注入、無 I/O、有單元測試並納入 coverage gate），輸出並包含 `includedCount`（有報價已納入）、`pendingCount`（缺報價已排除）、`anyStale`（任一納入者過期）。

#### Scenario: 有持倉且報價齊全

- **WHEN** 使用者有真實持倉且全部標的報價可用（新鮮）
- **THEN** hero 顯示以現價計算的持股市值/未實現損益/報酬率，五張圖卡以同一組真實聚合資料渲染（TWD 內部基準、顯示時換算）

#### Scenario: buildAnalysisInput 映射市值

- **WHEN** 以一組 `Position` 與報價 resolver 呼叫 `buildAnalysisInput`
- **THEN** 每檔輸出 `value = price × quantity`、`cost = totalCost`（皆原幣別 10 位小數 string），幣別/代號/名稱/類別對應正確

#### Scenario: 無持倉

- **WHEN** 使用者尚無任何持倉（無交易或全數賣出）
- **THEN** 分析頁顯示空態（「尚無持倉」，導引到交易頁），不渲染 hero 與圖卡

#### Scenario: 交易載入中與載入失敗

- **WHEN** transactions 首次載入中（尚無資料）或監聽失敗
- **THEN** 分別顯示載入中畫面與錯誤畫面（與持倉頁同款元件）

### Requirement: 分析頁報價降級顯示

分析頁 SHALL 對齊持倉頁的報價降級慣例（live-quotes 部分渲染）：缺報價的持倉 SHALL 排除於聚合並揭露「N 檔報價更新中」（SHALL NOT 以假值或 0 充數）；過期報價 SHALL 仍納入市值但揭露「部分為最後已知報價（延遲）」；揭露列 SHALL 附「重試」可強制刷新。當有持倉但全部缺報價（`includedCount === 0`）時，SHALL 顯示「報價載入中…」與重試，不渲染圖卡。

#### Scenario: 部分標的缺報價

- **WHEN** 7 檔持倉中 2 檔暫無可用報價
- **THEN** hero 與圖卡以其餘 5 檔聚合渲染，hero 下方揭露「2 檔報價更新中」+ 重試

#### Scenario: 全部標的缺報價

- **WHEN** 所有持倉皆無可用報價（含冷啟動尚未回填）
- **THEN** 顯示「報價載入中…」與重試按鈕，不渲染聚合圖卡

#### Scenario: 含過期報價

- **WHEN** 任一納入聚合的標的報價已超過新鮮 TTL
- **THEN** 該標的仍以最後已知價納入市值，並揭露「部分為最後已知報價（延遲）」

## MODIFIED Requirements

### Requirement: 重新整理回饋

分析頁 refresh 圓鈕 SHALL 觸發**真實報價強制刷新**（略過新鮮判定的批次 loadFor）並以 toast「報價已更新」回饋；刷新完成後聚合數字隨新報價重算。

#### Scenario: 點 refresh

- **WHEN** 使用者點分析頁 refresh 圓鈕
- **THEN** 對目前持倉 targets 強制刷新報價，顯示「報價已更新」toast，數字以新報價重算

### Requirement: 分析頁 TWD/USD 全頁切換

分析頁 SHALL 提供 TWD/USD 全頁 segmented 切換，內部以 TWD 為基準、依最新 `exchange_rates` 換算顯示（未就緒 fallback demo 匯率 1 USD = 30.95），**預設值取自使用者顯示幣別偏好 `preferred_display_currency`（缺值 fallback TWD）**。切換為使用者主動操作，於頁內覆寫不寫回偏好。hero 註腳 SHALL 顯示實際使用中的 USD/TWD 匯率值（非寫死示意值）。

#### Scenario: 切換為 USD

- **WHEN** 使用者在分析頁切到 USD
- **THEN** 全頁數值即時以最新匯率換算為 USD 顯示

#### Scenario: 預設取自顯示幣別偏好

- **WHEN** 使用者顯示幣別偏好為 USD 並開啟分析頁
- **THEN** 全頁切換 SHALL 預設停在 USD（偏好為 TWD 或缺值時預設 TWD）

#### Scenario: 註腳顯示實際匯率

- **WHEN** 最新 `exchange_rates` 的 USD_TWD 為 32.10
- **THEN** hero 註腳顯示「匯率 1 USD = 32.1」（未就緒時顯示 demo 值 30.95）
