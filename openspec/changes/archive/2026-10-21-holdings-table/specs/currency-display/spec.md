## MODIFIED Requirements

### Requirement: 持倉總覽跨幣別總成本合計

HoldingsOverview SHALL 於「資產走勢」走勢圖**之上**提供 TWD/USD segmented 切換鈕；此切換即**顯示幣別偏好（`preferred_display_currency`）的控制**——切換即持久化至 `users/{uid}` 並帶動全 app（持倉 hero/bento、持股表格、分析頁切換預設）。本畫面**所有金額**（hero 持股市值、各損益 bento、持股表格所有金額欄與組小計）SHALL 以該偏好幣別呈現、百分比不換算；跨幣別以最新匯率換算（缺率退 demo 匯率）。清單上方的跨幣別「總成本」grand total 與各市場原幣別小計 SHALL 不再顯示（owner 2026-10-21，design spec D10；總成本資訊可由表格「成本」欄與 bento 推得）。

持倉 hero 的 label SHALL 為「**持股市值（{幣別}）**」而非「總資產」——hero 數值 = 純持股市值（`computeHoldingsHero`），**不含各帳戶現金**；「總資產」措辭會誤導使用者以為含現金（帳戶詳情「帳戶市值」= 持股 + 現金為另一口徑）。此命名 SHALL 與分析頁 hero「持股市值」一致。持倉 hero **不再顯示「不含現金」註腳**（owner 2026-10-21 決定 hero 精簡，design spec D7；label「持股市值」已表達純持股口徑），該口徑說明 SHALL 保留於程式碼註解；分析頁 hero 的「不含現金」註腳不受影響。

> 註：原本「本畫面不提供幣別切換鈕、合計固定以偏好呈現」之約束，因 owner 設計決策（2026-06-17）改為「切換鈕設於本畫面＝偏好控制」而推翻。本 requirement 名稱沿用歷史命名；grand total 已於 2026-10-21 移除。

#### Scenario: 不再顯示總成本合計

- **WHEN** 持倉含 TWD 與 USD 部位
- **THEN** 清單上方 SHALL NOT 顯示「總成本（{幣別}）」行，各組標題 SHALL NOT 顯示原幣別小計

#### Scenario: 無匯率時的呈現

- **WHEN** 尚無最新匯率
- **THEN** 需換匯的金額欄與組小計以 demo 匯率退回或顯示「—」，不顯示錯誤數字、不 crash

#### Scenario: 走勢圖之上的切換鈕＝偏好控制

- **WHEN** 使用者在 HoldingsOverview 切換 TWD/USD
- **THEN** 本頁所有金額（含持股表格）即時改以新幣別呈現、百分比不變；新值持久化為 `preferred_display_currency`，並帶動分析頁切換預設。寫入失敗時還原前值並提示

#### Scenario: hero 標籤與現金口徑

- **WHEN** 使用者檢視持倉總覽 hero
- **THEN** label SHALL 為「持股市值（TWD）」（或偏好幣別）、hero 下方 SHALL NOT 顯示「不含現金」等常駐註腳；hero 數值 SHALL 維持純持股市值口徑（= 總成本 + 未實現損益，三元組互洽），SHALL NOT 併入現金
