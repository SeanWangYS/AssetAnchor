## ADDED Requirements

### Requirement: 種子資料覆蓋 BUY 與 SELL 視覺路徑

emulator 種子腳本（`firebase/scripts/seed-emulator.mjs`）SHALL 同時包含 BUY 與 SELL 交易，使賣出膠囊、已實現損益列、「本月已實現損益」等 SELL 相關畫面在本地視覺驗證中有真實資料可對。SELL 種子 SHALL 滿足持倉推導不變量：同帳戶同標的、賣量 ≤ 先前買量、`transaction_date` 晚於對應 BUY；台股 SELL SHALL 帶非零證交稅（`tax`）。

#### Scenario: reseed 後 SELL 路徑有資料

- **WHEN** 執行 `seed:emulator` 完成後登入測試帳號
- **THEN** 交易清單 SHALL 至少出現一筆賣出（TWD 與 USD 各至少一筆），且已實現損益 SHALL 同時涵蓋正值（綠）與負值（紅）各至少一筆；對應標的的交易歷史 SHALL 顯示已實現損益列；`deriveHoldings` SHALL NOT 拋出 oversell

#### Scenario: 本月已實現恆有值

- **WHEN** 任一月份執行 reseed
- **THEN** 至少一筆 SELL 的 `transaction_date` SHALL 落在執行當月，使持倉頁「本月已實現」顯示非零值

#### Scenario: 自我驗證涵蓋 SELL

- **WHEN** 種子腳本執行完寫入後的自我驗證
- **THEN** SHALL 斷言實際寫入的交易筆數等於種子定義的筆數、每筆 SELL 種子的交易類型確為賣出、且台股 SELL 的證交稅為非零 canonical 10 位小數字串；任一斷言失敗 SHALL 使腳本以非零 exit code 結束
