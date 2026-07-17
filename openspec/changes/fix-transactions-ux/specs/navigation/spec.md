## ADDED Requirements

### Requirement: header 不得有無功能控制項

畫面 header SHALL NOT 放置無任何行為的可點擊控制項；功能尚未實作的入口 SHALL 移除（或以明確「即將推出」回饋呈現——本階段採移除）。

#### Scenario: 通知鈴鐺

- **WHEN** 通知功能尚未實作
- **THEN** 持倉 header SHALL NOT 顯示鈴鐺按鈕
