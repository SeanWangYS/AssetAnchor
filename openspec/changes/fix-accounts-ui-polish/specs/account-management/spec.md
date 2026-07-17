## ADDED Requirements

### Requirement: 帳戶清單狀態可區分且標籤繁中

清單副標 SHALL 為「類型 · 市場」且皆為繁中標籤（SHALL NOT 直出 enum 值如「TW」）；右側值 SHALL 可區分三種狀態：有持股（市值）、啟用但無持股（「無持股」）、已停用（「—」+ 已停用分區）。

#### Scenario: 現金帳戶不再像空帳戶

- **WHEN** 啟用帳戶只有現金、無持股
- **THEN** 清單右側 SHALL 顯示「無持股」，SHALL NOT 與已停用帳戶的「—」相同

### Requirement: 停用文案與現金卡顯示

停用確認 SHALL 以使用者語言說明後果（可隨時重新啟用、不再列入統計），SHALL NOT 使用「軟刪除」等開發術語。詳情頁現金卡檢視態 SHALL 以千分位格式化顯示（非可輸入外觀的裸數字）；已停用帳戶 SHALL NOT 顯示現金編輯入口。

#### Scenario: 檢視態現金格式化

- **WHEN** 帳戶現金為 158000
- **THEN** 檢視態 SHALL 顯示「158,000.00」（千分位、與 hero 現金同 2 位慣例），SHALL NOT 顯示「158000.00」

### Requirement: 帳戶表單關閉與色票

新增帳戶畫面 SHALL 有明示關閉控制項；識別色 swatches SHALL 對齊 spec 數量（×6）且每色 SHALL 有描述性 accessibility label。

#### Scenario: 螢幕閱讀器讀色名

- **WHEN** VoiceOver 聚焦某色塊
- **THEN** SHALL 讀出色名（如「紫色」），SHALL NOT 為空字串

### Requirement: hero 標籤與數值不拆行

帳戶 hero 的「未實現」標籤與其金額/百分比 SHALL 保持同行群組（換行只能發生在群組之間）。

#### Scenario: 窄幅下不拆散

- **WHEN** 畫面寬度不足以單行容納整列
- **THEN** 「未實現 ▲ US$ 7,363.54 +53.99%」SHALL 整組換行，SHALL NOT 標籤與數值分離
