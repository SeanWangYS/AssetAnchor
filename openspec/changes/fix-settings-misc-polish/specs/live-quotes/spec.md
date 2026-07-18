## ADDED Requirements

### Requirement: 報價 as-of 時間可見

持倉頁報價註腳於有報價時 SHALL 顯示動態最後更新時間（HH:mm），SHALL NOT 僅有靜態延遲文案使資料新舊不可判斷。

#### Scenario: 持倉頁顯示最後更新

- **WHEN** 至少一檔報價已取得（含 fetched 時戳）
- **THEN** 註腳 SHALL 含「最後更新 HH:mm」且 SHALL 保留延遲語意（抓取時間 ≠ 報價時刻）
