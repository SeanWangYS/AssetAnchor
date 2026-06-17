## MODIFIED Requirements

### Requirement: 持倉總覽跨幣別總成本合計

HoldingsOverview SHALL 於「資產走勢」走勢圖**之上**提供 TWD/USD segmented 切換鈕；此切換即**顯示幣別偏好（`preferred_display_currency`）的控制**——切換即持久化至 `users/{uid}` 並帶動全 app（持倉 hero/bento、本頁總成本、分析頁切換預設）。本畫面**所有金額**（hero 總資產、各損益 bento、底部「總成本」grand total）SHALL 以該偏好幣別呈現、百分比不換算；跨幣別合計以最新匯率換算（缺率退 demo 匯率）。各市場原幣別小計（精確值）SHALL 與 grand total（快照）並存。

> 註：原本「本畫面不提供幣別切換鈕、合計固定以偏好呈現」之約束，因 owner 設計決策（2026-06-17）改為「切換鈕設於本畫面＝偏好控制」而推翻。

#### Scenario: 顯示總成本合計（依偏好幣別）

- **WHEN** 持倉含 TWD 與 USD 部位、且已有最新匯率，顯示幣別偏好為 TWD
- **THEN** 底部顯示「總成本（TWD）」= TWD 部位成本 + USD 部位成本 × 最新 `USD_TWD`；偏好為 USD 時以 USD 呈現

#### Scenario: 無匯率時的呈現

- **WHEN** 尚無最新匯率
- **THEN** grand total 顯示「匯率未就緒」之類提示（原幣別小計照常顯示），不顯示錯誤數字

#### Scenario: 走勢圖之上的切換鈕＝偏好控制

- **WHEN** 使用者在 HoldingsOverview 切換 TWD/USD
- **THEN** 本頁所有金額即時改以新幣別呈現、百分比不變；新值持久化為 `preferred_display_currency`，並帶動分析頁切換預設。寫入失敗時還原前值並提示
