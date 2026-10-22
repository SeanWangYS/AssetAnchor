## ADDED Requirements

### Requirement: 交易文件記錄匯入來源

`TransactionDocument` SHALL 新增兩個選填欄位：`source`（`'mcp'`）與 `import_batch_id`（string）。透過 MCP 寫入的交易 SHALL 帶 `source: 'mcp'` 與同批共用的 `import_batch_id`；App 手動輸入的交易 SHALL 維持不寫這兩個欄位，缺欄位 SHALL 視為 App 手動輸入。持倉推導、報酬計算與 App 畫面 SHALL NOT 因這兩個欄位改變行為。

#### Scenario: MCP 匯入的交易帶來源

- **WHEN** 透過 `create_transactions` 匯入 3 筆交易
- **THEN** 3 筆文件皆含 `source: 'mcp'` 與相同的 `import_batch_id`

#### Scenario: 既有交易不受影響

- **WHEN** 讀取一筆沒有 `source` 欄位的既有交易
- **THEN** 持倉與報酬計算結果與新增欄位前相同

### Requirement: 重複判定以六個欄位比對

`packages/shared` SHALL 提供純函式，以 `transaction_date`、`account_id`、`market` + `symbol`（不分大小寫）、`transaction_type`、`quantity`、`price` 組成重複判定鍵；`quantity` 與 `price` SHALL 先經 `Money` 正規化為 10 位小數再比較（`1000` 與 `1000.0000000000` 視為相同）。批次比對 SHALL 標出與既有交易相同、或與同批前面列相同的列。

#### Scenario: 數值寫法不同仍判定重複

- **WHEN** 既有交易為 `2025-01-02 / acc-a / TW 2330 / BUY / 1000.0000000000 / 580.0000000000`，待匯入列為同日同帳戶 `2330 BUY 1000 @ 580`
- **THEN** 該列標記為疑似重複

#### Scenario: 同批內重複

- **WHEN** 待匯入清單第 1 列與第 3 列六個欄位完全相同
- **THEN** 第 3 列標記為疑似重複，第 1 列不標記

### Requirement: 批次寫入前檢查帳戶層級超賣

`packages/shared` SHALL 提供純函式，將既有交易與待匯入列合併後，依帳戶、`(market, symbol, currency)` 與時序（同日先 BUY 後 SELL）模擬持有量，回報因待匯入列而首次出現的超賣；既有資料本身已存在的異常 SHALL NOT 歸咎於待匯入列。回報 SHALL 指出是哪一列 SELL、當下可賣數量與欲賣數量。

#### Scenario: 只匯入賣出造成超賣

- **WHEN** 帳戶 `acc-a` 沒有 `AAPL` 持倉，待匯入一筆 `AAPL SELL 10`
- **THEN** 該列回報超賣，可賣數量為 0

#### Scenario: 同批先買後賣不算超賣

- **WHEN** 待匯入 `2025-01-02 AAPL BUY 10` 與 `2025-03-01 AAPL SELL 10`
- **THEN** 不回報超賣

#### Scenario: 當沖不算超賣

- **WHEN** 待匯入同一天的 `2330 SELL 1000` 與 `2330 BUY 1000`（清單中賣出在前）
- **THEN** 不回報超賣（同日先 BUY 後 SELL）
