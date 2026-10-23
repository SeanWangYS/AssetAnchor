## MODIFIED Requirements

### Requirement: search_symbol 對應名稱或代號到 App 的 symbol

`search_symbol` SHALL 接受 `query`（代號或名稱）與選填 `market`，回傳最多 10 筆候選，每筆含 `symbol_id`、`symbol`、`market`、`asset_type`、`currency`、`name`、`name_zh`。比對 SHALL 依序涵蓋：代號完全相符（不分大小寫）、代號前綴、使用者自己交易過的 symbol 的中英文名稱包含查詢字串。`name` 與 `name_zh` 皆為空的 symbol（報價來源從未解析成功的空殼）SHALL NOT 出現在候選中。工具說明 SHALL 指示 Claude：截圖只有中文名稱時，先依自身知識轉成代號再以代號查詢，並在確認清單同時列出代號與名稱供使用者核對。查無結果時 SHALL 回傳空清單與提示「AssetAnchor 尚無此代號」，SHALL NOT 建立新 symbol。

#### Scenario: 以代號查詢台股 ETF

- **WHEN** `query` 為 `0050`
- **THEN** 候選第一筆為 `symbol_id` `TW_0050`、`market` `TW`、`currency` `TWD`

#### Scenario: 以中文名稱查詢已交易過的股票

- **WHEN** 使用者曾交易台積電且其 symbol 有中文名稱，`query` 為 `台積電`
- **THEN** 候選含 `TW_2330`

#### Scenario: 空殼 symbol 不列入候選

- **WHEN** `symbols` 同時有 `TW_0050`（有名稱）與 `US_0050`（`name`、`name_zh` 皆空），`query` 為 `0050`
- **THEN** 候選只有 `TW_0050`

#### Scenario: 查無代號

- **WHEN** `query` 為 `ZZZZ`
- **THEN** 回傳空清單與提示「AssetAnchor 尚無此代號」，`symbols` 集合沒有新增文件

### Requirement: validate_transactions 檢查待匯入清單且不寫入

`validate_transactions` SHALL 接受 `account_id` 與 1～50 筆待匯入列（`transaction_date`、`symbol`、`market`、`transaction_type`（`BUY`／`SELL`）、`quantity`、`price`，選填 `asset_type`、`currency`（預設依市場：TW→TWD、US→USD）、`fee`、`tax`（預設 0）、`notes`、`keep_duplicate`）。未填 `asset_type` 時 SHALL 採用 AssetAnchor symbol 主檔的 `asset_type`，主檔沒有此代號時預設 `STOCK`。帳戶 SHALL 屬於權杖使用者，否則回傳「找不到帳戶」。每列 SHALL 回報 `status`：`ok`、`duplicate`（疑似重複且未標記保留）、`invalid`（附繁中原因，沿用 App 交易表單的驗證規則與訊息）、`oversell`（附可賣數量），以及 `new_symbol`（AssetAnchor 尚無此代號、匯入時會建立）。代號不在 AssetAnchor、或主檔中只有名稱皆空的空殼時，TW／US 市場 SHALL 向報價來源確認確實存在此代號，查無時該列 SHALL 為 `invalid`「找不到此代號，請確認代號與市場」。工具 SHALL 回傳正規化後的清單（金額為 10 位小數 string）與確認碼；全部列皆為 `ok` 時才回傳確認碼。工具 SHALL NOT 寫入任何資料。

#### Scenario: 全部正確

- **WHEN** 驗證 2 筆合法的台股買入
- **THEN** 兩列 `status` 皆為 `ok`，回傳確認碼與正規化金額（例如 `"580.0000000000"`）

#### Scenario: 混雜問題列

- **WHEN** 清單含一筆與既有交易重複的列、一筆台股卻填 USD 的列、一筆超賣的賣出
- **THEN** 三列分別為 `duplicate`、`invalid`（「台股交易幣別須為 TWD」）、`oversell`，且不回傳確認碼

#### Scenario: 代號市場錯誤

- **WHEN** 待匯入列為 `market: US`、`symbol: 0050`，且 AssetAnchor 與報價來源皆查無此美股代號
- **THEN** 該列為 `invalid`「找不到此代號，請確認代號與市場」

#### Scenario: 空殼 symbol 不算已存在

- **WHEN** 主檔有名稱皆空的 `US_APPL`，待匯入列為 `market: US`、`symbol: APPL`，報價來源查無此代號
- **THEN** 該列為 `invalid`「找不到此代號，請確認代號與市場」

#### Scenario: 類型沿用主檔

- **WHEN** 主檔 `US_SGOV` 的 `asset_type` 為 `ETF`，待匯入列未填 `asset_type`
- **THEN** 正規化後該列 `asset_type` 為 `ETF`

### Requirement: 刪除交易需先預覽並以確認碼執行

`preview_delete_transactions` SHALL 接受 `transaction_ids`（1～20 筆）或 `import_batch_id`（擇一）。指定的交易 SHALL 全部屬於權杖使用者，否則回傳「找不到交易」並列出不存在的 ID。預覽 SHALL 依交易日期由舊到新（同日買入在賣出之前）逐筆列出完整內容，並以 `findNewOversells` 檢查刪除後是否造成超賣；有超賣時 SHALL 說明並不回傳確認碼。確認碼 SHALL 綁定使用者與這組交易的 ID 與內容，30 分鐘有效。`delete_transactions` SHALL 要求 `transactions.write`、接受相同指定方式加確認碼；任何一筆在預覽後被修改或已不存在、指定的組合不同、或確認碼過期時 SHALL 拒絕。通過時 SHALL 以單一 batch 硬刪除全部指定交易，回傳刪除筆數。SHALL NOT 提供依條件刪除。

#### Scenario: 刪除單筆

- **WHEN** 預覽刪除一筆沒有後續賣出的 BUY，再以確認碼執行
- **THEN** 該交易被刪除，回傳刪除 1 筆

#### Scenario: 刪除整批匯入

- **WHEN** 以某次匯入的 `import_batch_id` 預覽並執行刪除
- **THEN** 該批全部交易被刪除，其他交易不受影響

#### Scenario: 預覽依日期排序

- **WHEN** 預覽刪除一批日期交錯的交易
- **THEN** `transactions` 依 `transaction_date` 由舊到新排列

#### Scenario: 超過 20 筆

- **WHEN** `transaction_ids` 有 21 筆
- **THEN** 回傳錯誤「一次最多刪除 20 筆；要刪整批匯入請改用 import_batch_id」

#### Scenario: 刪除造成超賣

- **WHEN** 預覽刪除一筆之後仍有賣出依賴它的 BUY
- **THEN** 說明哪一天的賣出會超賣，不回傳確認碼；執行時同樣拒絕
