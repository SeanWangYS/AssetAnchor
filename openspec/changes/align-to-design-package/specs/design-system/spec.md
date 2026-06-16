## ADDED Requirements

### Requirement: Dark-first design tokens 為單一視覺來源

`core/theme` SHALL 提供 dark-first design tokens 作為全 app 視覺單一來源：底色（頁底 `#0A0C10`、畫面底 `#0E1117`）、文字四階透明白、分隔線、accent（預設 `#7C6CF0`，4 段可選）、漲跌色（漲 `#2FD37E` / 跌 `#FF5E62`）、買賣漸層（買 `#7C5CE6→#C24FD6` / 賣 `#2E74E6→#35C6EA`）、字型（Nunito 數字 / Noto Sans TC 中文）、8px 間距、圓角階層。畫面 SHALL NOT 自行硬編色票/字級，一律引用 token。

#### Scenario: 畫面引用 token

- **WHEN** 任一畫面需要色彩 / 字級 / 間距
- **THEN** 由 `core/theme` 取得，不在畫面內硬編 hex

#### Scenario: dark-first 預設

- **WHEN** App 顯示任一畫面
- **THEN** 預設深色（畫面底 `#0E1117`），而非 light-mode 佔位（`#FFFFFF`/iOS 藍）

### Requirement: 漲跌色與買賣色為兩套獨立系統

系統 SHALL 將「漲跌（盈虧語意）」與「買/賣（交易方向）」視為兩套獨立色系：漲跌用綠/紅（▲▼ 數字、圖表正負），買/賣用主題漸層（買 紫→洋紅、賣 藍→青）。兩者 SHALL NOT 互相混用，且 SHALL NOT 採用台股「買紅賣綠」。

#### Scenario: 數字漲跌用綠紅

- **WHEN** 顯示報酬 / 損益正負
- **THEN** 正用漲綠 `#2FD37E`、負用跌紅 `#FF5E62`，前綴 ▲/▼

#### Scenario: 買賣鈕/膠囊用漸層

- **WHEN** 顯示買入 / 賣出（按鈕、交易列表膠囊）
- **THEN** 買用紫→洋紅漸層、賣用藍→青漸層

### Requirement: 顯示格式規則

顯示層 SHALL 統一：正負以 ▲/▼ 標示；金額前綴 `NT$`(TWD) / `US$`(USD)；百分比帶正負號；所有數字套 `tabular-nums`。金額計算 SHALL 用 `Money`/decimal.js，禁 native float；原型寫死數字僅顯示示意，不得作為精度依據。

#### Scenario: 金額與漲跌顯示

- **WHEN** 顯示一筆 TWD 金額與其漲跌
- **THEN** 形如 `▲ NT$ 88,200`、`+7.66%`，數字等寬（tabular-nums）

### Requirement: 共用 UI 元件集

`core/ui` SHALL 提供設計稿所需共用元件（Card[含 glow variant]、Segmented、TimeTabs、Avatar/代號圓標、Pnl、Fab、ConfirmDialog、EmptyState、Toast、CashBalanceCard、品牌組件 AALogoMark/AAWordmark/AABrandLockup、以及 `charts/`：Chart/Donut/DualBar/HBar），供各 feature 組裝。features SHALL NOT 各自重刻共用元件。

#### Scenario: feature 組裝共用元件

- **WHEN** 某畫面需要分段切換 / 圖表 / 確認對話框
- **THEN** 使用 `core/ui` 既有元件，不在 feature 內重刻
