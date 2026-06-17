## MODIFIED Requirements

### Requirement: 分析頁 TWD/USD 全頁切換

分析頁 SHALL 提供 TWD/USD 全頁 segmented 切換，內部以 TWD 為基準、依最新匯率換算顯示（demo 1 USD = 30.95 TWD），**預設值取自使用者顯示幣別偏好 `preferred_display_currency`（缺值 fallback TWD）**。切換為使用者主動操作，於頁內覆寫不寫回偏好。

#### Scenario: 切換為 USD

- **WHEN** 使用者在分析頁切到 USD
- **THEN** 全頁數值即時以最新匯率換算為 USD 顯示

#### Scenario: 預設取自顯示幣別偏好

- **WHEN** 使用者顯示幣別偏好為 USD 並開啟分析頁
- **THEN** 全頁切換 SHALL 預設停在 USD（偏好為 TWD 或缺值時預設 TWD）
