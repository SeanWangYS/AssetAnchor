# currency-display Specification

## Purpose

TBD - created by archiving change add-multi-currency-fx. Update Purpose after archive.

## Requirements

### Requirement: 顯示時匯率換算純函式

`packages/shared` SHALL 提供顯示時 FX 換算純函式（不依賴 Firestore / React），接受原幣別 `Money`、`exchange_rates.rates` 與目標幣別，回傳換算後的 `Money`（10 位小數）。同幣別 SHALL 原值回傳。換算僅供顯示/分析的 as-of-today 快照，**不落地、不寫回交易**。先寫測試再實作（TDD），納入 `packages/shared` ≥90% coverage gate。

#### Scenario: USD 換算為 TWD

- **WHEN** 以 `Money(1805, USD)` 與 `rates.USD_TWD="31.6800000000"` 換算為 TWD
- **THEN** 回傳 `Money`，值為 `1805 × 31.68` 的 10 位小數 string（decimal.js，非 native float）

#### Scenario: 同幣別回傳自身

- **WHEN** 原幣別與目標幣別相同（如 TWD → TWD）
- **THEN** 回傳等值 `Money`，不套用任何匯率

#### Scenario: 純函式 deterministic

- **WHEN** 以相同輸入呼叫兩次
- **THEN** 回傳相等結果，不需 Firestore / React 環境

### Requirement: 讀取最新匯率

`apps/mobile` 的 `services/exchange-rates` SHALL 以一般 Firestore 讀取取得「最新一筆」`exchange_rates`（`orderBy(date, desc) limit 1`），不依交易日查特定日期。匯率尚未就緒（無任何文件）時 SHALL 優雅降級回傳「無匯率」狀態，不得 crash。mobile **不依賴** `@react-native-firebase/functions`（不呼叫 Cloud Function，只讀 Firestore）。

#### Scenario: 讀取最新一筆匯率

- **WHEN** `exchange_rates` 已有多筆（多日累積）
- **THEN** 取回 `date` 最大的一筆，供顯示層換算使用

#### Scenario: 無匯率時優雅降級

- **WHEN** `exchange_rates` 尚無任何文件（函式還沒跑過）
- **THEN** 服務回傳「無匯率」狀態，畫面不 crash（見下方降級 scenario）

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

### Requirement: AssetDetail 幣別切換

AssetDetail SHALL 提供 TWD/USD segmented 切換，即時以最新匯率換算該股的均價與總成本（以原幣別為基準換算）。預設顯示原幣別。無最新匯率時切換 SHALL 停用或僅顯示原幣別，不 crash。

#### Scenario: 切換顯示換算後數字

- **WHEN** 使用者在 USD 股票的 AssetDetail 切到 TWD、且有最新匯率
- **THEN** 均價 / 總成本即時顯示為以最新 `USD_TWD` 換算後的 TWD 值（10 位計算、2 位顯示）

#### Scenario: 預設原幣別

- **WHEN** 使用者進入 AssetDetail
- **THEN** 預設以該股原幣別顯示，切換為使用者主動操作

#### Scenario: 無匯率時切換降級

- **WHEN** 尚無最新匯率
- **THEN** 幣別切換停用或維持原幣別顯示，不顯示錯誤數字

### Requirement: 顯示格式政策（單一規則表）

全 app 的金額、單價、股數、百分比、日期、匯率顯示 SHALL 遵循單一格式規則表，且規則表的唯一實作點為 `packages/shared` 的 format 模組（mobile 各 feature 不得自定重複實作）：

- 幣別前綴：`NT$`（TWD）、`US$`（USD）、其餘用幣別代碼；前綴與數字之間恆為一個空格。
- 彙總金額（市值/成本/損益/現金）：TWD 0 位小數、USD 與 USDT 2 位、其他幣別 2 位；千分位分組。
- 單價與均價：一律 2 位小數（不因幣別或整數值省略）。
- 股數：至多 4 位小數、去尾零、千分位。
- 匯率：固定 2 位小數、不去尾零。
- 完整日期顯示：`YYYY/MM/DD`；含時刻的時間戳：`YYYY/MM/DD HH:mm`。表單輸入欄位維持 ISO `YYYY-MM-DD`（輸入格式不受本規則約束）；期間篩選 chip 的縮寫區間（如「9/5–1/15」）與清單列的日/月拆欄不屬完整日期顯示、不受本條約束。
- 明文例外：帳戶市值 hero 一律 2 位小數（含現金與跨幣別換算的既有 owner 決策）；編輯表單帶入原值時不得丟失尾零精度。

#### Scenario: 台股均價不再取整

- **WHEN** 持倉列或個股頁顯示 TWD 均價 751.068
- **THEN** SHALL 顯示「NT$ 751.07」（2 位小數、帶空格），SHALL NOT 顯示「NT$751」

#### Scenario: 匯率固定兩位

- **WHEN** 分析頁 footnote 顯示 USD/TWD 匯率 31.995
- **THEN** SHALL 顯示「1 USD = 32.00」格式的 2 位小數值（31.99 或 32.00 依捨入），SHALL NOT 顯示整數「32」

#### Scenario: 日期單一格式

- **WHEN** 任一畫面顯示完整交易日期或快照時間
- **THEN** 日期 SHALL 為 `YYYY/MM/DD`、時間戳 SHALL 為 `YYYY/MM/DD HH:mm`；完整日期顯示 SHALL NOT 並存第三種格式

### Requirement: 正負與零值表達

損益類數字的方向表達 SHALL 全 app 一致：金額損益用 ▲/▼ 箭頭（不帶 +/− 號）；百分比用 +/−（U+2212）號（不帶箭頭）；同一數字 SHALL NOT 同時出現箭頭與正負號。明文例外：交易清單與交易詳情的**已實現損益金額**沿設計原型用 +/− 號。**顯示為零**（捨入後不含非零數字）的損益值 SHALL 以中性色顯示、不帶箭頭也不帶正負號。

#### Scenario: 零已實現損益不顯示上漲箭頭

- **WHEN** 個股頁已實現損益為 0
- **THEN** SHALL 以次要文字色顯示「NT$ 0」（或對應幣別格式），SHALL NOT 顯示綠色「▲」

#### Scenario: 同畫面樣式不混用

- **WHEN** 持倉 hero 同時顯示未實現金額與報酬率
- **THEN** 金額 SHALL 用 ▲/▼、百分比 SHALL 用 +/−，兩者 SHALL NOT 交換或疊加

### Requirement: 關鍵大數不得截斷

hero 與 bento 卡的關鍵金額（持股市值、總未實現損益、分析 hero、個股現價）SHALL 於溢出時自動縮小字級完整顯示，SHALL NOT 以省略號截斷（縮放下限屬實作參數，見 design）。

#### Scenario: 總未實現損益完整顯示

- **WHEN** 總未實現損益為 NT$ 2,813,530 且卡片寬度不足
- **THEN** SHALL 縮字完整顯示「▲ NT$ 2,813,530」，SHALL NOT 顯示「NT$ 2,813,5…」
