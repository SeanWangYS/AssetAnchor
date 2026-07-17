## ADDED Requirements

### Requirement: 佔比顯示加總恆為 100%

分析頁同一分配（資產配置圖例、持股佔比卡）內顯示的百分比 SHALL 經 largest-remainder 法分配，使顯示值加總恆為 100.0%；同一標的在同一畫面的佔比顯示 SHALL 彼此一致。報酬率百分比精度 SHALL 與全 app 政策一致（2 位小數）。

#### Scenario: 圖例加總不再 99.9%

- **WHEN** 資產配置四類佔比原始值四捨五入後合計 99.9% 或 100.1%
- **THEN** 顯示值 SHALL 經分配調整為恰好合計 100.0%

#### Scenario: 報酬率精度與持倉頁一致

- **WHEN** 同一時刻持倉頁與分析頁顯示總報酬率
- **THEN** 兩頁 SHALL 皆為 2 位小數（如 +105.84%），SHALL NOT 一頁 2 位一頁 1 位
