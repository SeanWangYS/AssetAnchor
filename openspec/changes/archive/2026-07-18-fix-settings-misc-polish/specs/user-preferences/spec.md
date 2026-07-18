## ADDED Requirements

### Requirement: 設定頁用語可區分且版本單一來源

設定頁的登入身分區塊 SHALL 與券商「帳戶」用語可區分（「登入帳號」）；跨帳戶現金列 SHALL 標示合計語意；About 顯示版本 SHALL 與發布版本同源（單一定義點，SHALL NOT 手寫多份）。唯讀輸入欄位 SHALL 有可辨識的 disabled 樣式。

#### Scenario: 版本不再漂移

- **WHEN** 發布版本升版（單一來源更新）
- **THEN** About 頁版本 SHALL 自動一致，SHALL NOT 出現 0.0.1 vs 0.0.2 兩值並存

#### Scenario: 帳號用語可區分

- **WHEN** 檢視設定頁
- **THEN** 登入身分 SHALL 標示「登入帳號」、跨帳戶現金 SHALL 標示「現金餘額（合計）」，SHALL NOT 與券商「帳戶」混用

#### Scenario: 唯讀 email 可辨識

- **WHEN** 檢視個人資料頁
- **THEN** 唯讀 email 欄 SHALL 與可編輯欄位有視覺差異
