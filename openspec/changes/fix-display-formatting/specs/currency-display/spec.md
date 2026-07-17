## ADDED Requirements

### Requirement: 顯示格式政策（單一規則表）

全 app 的金額、單價、股數、百分比、日期、匯率顯示 SHALL 遵循單一格式規則表，且規則表的唯一實作點為 `packages/shared` 的 format 模組（mobile 各 feature 不得自定重複實作）：

- 幣別前綴：`NT$`（TWD）、`US$`（USD）、其餘用幣別代碼；前綴與數字之間恆為一個空格。
- 彙總金額（市值/成本/損益/現金）：TWD 0 位小數、USD 與 USDT 2 位、其他幣別 2 位；千分位分組。
- 單價與均價：一律 2 位小數（不因幣別或整數值省略）。
- 股數：至多 4 位小數、去尾零、千分位。
- 匯率：固定 2 位小數、不去尾零。
- 顯示日期：`YYYY/MM/DD`；含時刻的時間戳：`YYYY/MM/DD HH:mm`。表單輸入欄位維持 ISO `YYYY-MM-DD`（輸入格式不受本規則約束）。
- 明文例外：帳戶市值 hero 一律 2 位小數（含現金與跨幣別換算的既有 owner 決策）；編輯表單帶入原值時不得丟失尾零精度。

#### Scenario: 台股均價不再取整

- **WHEN** 持倉列或個股頁顯示 TWD 均價 751.068
- **THEN** SHALL 顯示「NT$ 751.07」（2 位小數、帶空格），SHALL NOT 顯示「NT$751」

#### Scenario: 匯率固定兩位

- **WHEN** 分析頁 footnote 顯示 USD/TWD 匯率 31.995
- **THEN** SHALL 顯示「1 USD = 32.00」格式的 2 位小數值（31.99 或 32.00 依捨入），SHALL NOT 顯示整數「32」

#### Scenario: 日期單一格式

- **WHEN** 任一畫面顯示交易日期或快照時間
- **THEN** 日期 SHALL 為 `YYYY/MM/DD`、時間戳 SHALL 為 `YYYY/MM/DD HH:mm`；同 app SHALL NOT 並存第三種日期顯示格式

### Requirement: 正負與零值表達

損益類數字的方向表達 SHALL 全 app 一致：金額損益用 ▲/▼ 箭頭（不帶 +/− 號）；百分比用 +/−（U+2212）號（不帶箭頭）；同一數字 SHALL NOT 同時出現箭頭與正負號。值為零時 SHALL 以中性色顯示、不帶箭頭也不帶正負號。

#### Scenario: 零已實現損益不顯示上漲箭頭

- **WHEN** 個股頁已實現損益為 0
- **THEN** SHALL 以次要文字色顯示「NT$ 0」（或對應幣別格式），SHALL NOT 顯示綠色「▲」

#### Scenario: 同畫面樣式不混用

- **WHEN** 持倉 hero 同時顯示未實現金額與報酬率
- **THEN** 金額 SHALL 用 ▲/▼、百分比 SHALL 用 +/−，兩者 SHALL NOT 交換或疊加
