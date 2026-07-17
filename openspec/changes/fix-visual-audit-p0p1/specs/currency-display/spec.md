## MODIFIED Requirements

### Requirement: 持倉總覽跨幣別總成本合計

HoldingsOverview SHALL 於「資產走勢」走勢圖**之上**提供 TWD/USD segmented 切換鈕；此切換即**顯示幣別偏好（`preferred_display_currency`）的控制**——切換即持久化至 `users/{uid}` 並帶動全 app（持倉 hero/bento、本頁總成本、分析頁切換預設）。本畫面**所有金額**（hero 持股市值、各損益 bento、底部「總成本」grand total）SHALL 以該偏好幣別呈現、百分比不換算；跨幣別合計以最新匯率換算（缺率退 demo 匯率）。各市場原幣別小計（精確值）SHALL 與 grand total（快照）並存。

持倉 hero 的 label SHALL 為「**持股市值（{幣別}）**」而非「總資產」——hero 數值 = 純持股市值（`computeHoldingsHero`），**不含各帳戶現金**；「總資產」措辭會誤導使用者以為含現金（帳戶詳情「帳戶市值」= 持股 + 現金為另一口徑）。hero 註腳 SHALL 明示「不含現金」。此命名 SHALL 與分析頁 hero「持股市值」及其「不含現金」註腳一致（analysis-page spec 既有定義）；設計包（holdings-overview spec 與 app-prototype 原型）SHALL 同步此措辭。

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

#### Scenario: hero 標籤與現金口徑

- **WHEN** 使用者檢視持倉總覽 hero
- **THEN** label SHALL 為「持股市值（TWD）」（或偏好幣別）、註腳含「不含現金」；hero 數值 SHALL 維持純持股市值口徑（= 總成本 + 未實現損益，三元組互洽），SHALL NOT 併入現金
