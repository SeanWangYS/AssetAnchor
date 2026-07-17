## ADDED Requirements

### Requirement: 關鍵大數不得截斷

hero 與 bento 卡的關鍵金額（持股市值、總未實現損益、分析 hero、個股現價）SHALL 於溢出時自動縮小字級完整顯示，SHALL NOT 以省略號截斷（縮放下限屬實作參數，見 design）。

#### Scenario: 總未實現損益完整顯示

- **WHEN** 總未實現損益為 NT$ 2,813,530 且卡片寬度不足
- **THEN** SHALL 縮字完整顯示「▲ NT$ 2,813,530」，SHALL NOT 顯示「NT$ 2,813,5…」
