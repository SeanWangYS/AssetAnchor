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

HoldingsOverview 底部 SHALL 顯示跨幣別「總成本」grand total，將各 position 的原幣別總成本換算成 `preferred_display_currency`（預設 TWD）後加總，使用最新匯率。各市場原幣別小計（精確值）SHALL 與此 grand total（快照）並存。本畫面 SHALL **不**提供幣別切換鈕。

#### Scenario: 顯示 TWD 總成本合計

- **WHEN** 持倉含 TWD 與 USD 部位、且已有最新匯率
- **THEN** 底部顯示「總成本（TWD）」= TWD 部位成本 + USD 部位成本 × 最新 `USD_TWD`

#### Scenario: 無匯率時的呈現

- **WHEN** 尚無最新匯率
- **THEN** grand total 顯示「匯率未就緒」之類提示（原幣別小計照常顯示），不顯示錯誤數字

#### Scenario: 總覽不提供切換鈕

- **WHEN** 使用者在 HoldingsOverview
- **THEN** 無 TWD/USD 切換控制；合計固定以 `preferred_display_currency` 呈現

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
