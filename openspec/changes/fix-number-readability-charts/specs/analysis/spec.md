## ADDED Requirements

### Requirement: 圖表刻度單位正確分層

分析頁圖表的數值刻度 SHALL 使用正確分層的緊湊單位（TWD：萬/億；USD：K/M），SHALL NOT 出現「5000K」等錯層表達。

#### Scenario: 大額 TWD 刻度

- **WHEN** 雙柱圖軸頂為 5,000,000（TWD 顯示模式）
- **THEN** 刻度 SHALL 顯示「500萬」（或等值正確分層單位），SHALL NOT 顯示「5000K」

### Requirement: 排行金額完整可讀

分析頁排行卡右側金額 SHALL 完整顯示（溢出時自動縮字級），圖例色塊 SHALL 與背景有可辨識對比。

#### Scenario: 排行最大值不截斷

- **WHEN** 未實現損益排行最大值為 +NT$ 3,077,864
- **THEN** SHALL 完整顯示全數字，SHALL NOT 截斷為「+NT$ 3,077,8…」
