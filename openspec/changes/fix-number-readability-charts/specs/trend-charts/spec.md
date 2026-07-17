## ADDED Requirements

### Requirement: 走勢圖可讀級軸標籤

持倉與個股走勢圖 SHALL 顯示 Y 軸區間極值刻度（最高/最低）與 X 軸起訖日期標籤，使用者 SHALL 能從圖上讀出數值區間與時間範圍（非僅形狀）。刻度值 SHALL 依顯示幣別以緊湊單位呈現（TWD 萬/億、USD K/M）。

#### Scenario: 走勢圖讀得出值

- **WHEN** 使用者在持倉頁檢視 1Y 資產走勢
- **THEN** 圖上 SHALL 可見區間最高/最低值刻度與起訖日期；切換 timeframe 後標籤 SHALL 隨之更新

#### Scenario: 資料不足時不畫殘缺標籤

- **WHEN** 走勢序列少於 2 點（loading / empty）
- **THEN** SHALL NOT 顯示孤立的軸標籤
