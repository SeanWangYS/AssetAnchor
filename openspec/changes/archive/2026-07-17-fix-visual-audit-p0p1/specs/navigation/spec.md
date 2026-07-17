## ADDED Requirements

### Requirement: in-tab stack 畫面標題供返回鈕文字

各 in-tab stack 中即使 `headerShown: false`（自繪 ScreenHeader）的畫面，其 route options SHALL 仍設定繁體中文 `title`——native-stack 以上一畫面的 title 作為返回鈕文字，未設 title 時會裸露英文 route 名（如「TransactionList」）於 UI。ScreenHeader 顯示的標題與 route `title` SHALL 共用同一 i18n 常數（`i18n/zh-TW.ts`），避免兩處字串漂移。

#### Scenario: 交易詳情返回鈕顯示繁中標題

- **WHEN** 使用者自交易清單進入交易詳情
- **THEN** header 返回鈕文字 SHALL 為「交易紀錄」（`zhTW.transactions.listTitle`），SHALL NOT 顯示 route 名「TransactionList」

#### Scenario: 全 stack 無 route 名裸露

- **WHEN** 使用者在任一 in-tab stack 進入子頁
- **THEN** 返回鈕文字皆為繁體中文畫面標題；新增畫面時此規則納入 checklist
