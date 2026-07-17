# navigation Specification

## Purpose

TBD - created by archiving change align-to-design-package. Update Purpose after archive.

## Requirements

### Requirement: 底部四 tab 導航結構

系統 SHALL 以 React Navigation Bottom Tabs 提供恰好四個 tab，順序為 **持倉 / 交易 / 分析 / 設定**。帳戶管理 SHALL NOT 為獨立 tab，而是「設定」下的子頁。

#### Scenario: 已登入落地持倉 tab

- **WHEN** 已登入使用者進入 MainTabs
- **THEN** 顯示四 tab（持倉/交易/分析/設定），落地於持倉 tab（HoldingsOverview）

#### Scenario: 帳戶管理為設定子頁

- **WHEN** 使用者要管理帳戶
- **THEN** 從「設定 → 帳戶管理」進入 AccountList（非從底部 tab）

### Requirement: 新增交易入口慣例（交易 tab FAB-only）

交易 tab 的新增交易入口 SHALL 為畫面右下角 FAB，且 SHALL NOT 在交易 tab 的 header 提供 ＋。持倉 tab SHALL 保留 header 右上 ＋ 作為新增交易入口（唯一例外）。

#### Scenario: 交易 tab 用 FAB 新增

- **WHEN** 使用者在交易 tab 想新增交易
- **THEN** 只透過右下 FAB 開啟 AddTransaction sheet；header 無 ＋

#### Scenario: 持倉 tab 保留 header ＋

- **WHEN** 使用者在持倉 tab
- **THEN** header 右上 ＋ 開啟 AddTransaction sheet

### Requirement: 帳戶新增入口（FAB）

帳戶管理（設定子頁）的新增帳戶入口 SHALL 為 FAB。

#### Scenario: 帳戶列表用 FAB 新增

- **WHEN** 使用者在帳戶列表
- **THEN** 透過 FAB 開啟 AddAccount 表單 sheet

### Requirement: SplashGate 擋 auth 閃現

App 啟動 SHALL 先經 SplashGate，在 auth 狀態確定前不得閃現 AuthStack 或 MainTabs。auth 狀態 SHALL 以 conditional render（非 navigate）切換：未登入顯示 AuthStack（落地 SignIn）、已登入顯示 MainTabs（落地持倉）。

#### Scenario: 啟動先 Splash

- **WHEN** App 冷啟動、auth 狀態尚未確定
- **THEN** 顯示 SplashGate，不閃現登入或主畫面

#### Scenario: 狀態確定後切換

- **WHEN** onAuthStateChanged 回報狀態
- **THEN** 未登入 → AuthStack(SignIn)；已登入 → MainTabs(持倉)

### Requirement: Modal group（bottom sheet）

AddTransaction / AddAccount(EditAccount) / 期間篩選 SHALL 以 Modal group 的 bottom sheet 呈現。EditTransaction SHALL 重用 AddTransaction sheet（標題「編輯交易」、帶入既有值）。

#### Scenario: AssetDetail 帶入新增交易

- **WHEN** 使用者在 AssetDetail 點「為此標的新增交易」
- **THEN** 開啟 AddTransaction sheet 並帶入該股 symbol / 帳戶 / 均價

#### Scenario: 編輯重用新增 sheet

- **WHEN** 使用者編輯一筆交易
- **THEN** 開啟同一 AddTransaction sheet，標題為「編輯交易」、欄位帶入既有值

### Requirement: in-tab stack 畫面標題供返回鈕文字

各 in-tab stack 中即使 `headerShown: false`（自繪 ScreenHeader）的畫面，其 route options SHALL 仍設定繁體中文 `title`——native-stack 以上一畫面的 title 作為返回鈕文字，未設 title 時會裸露英文 route 名（如「TransactionList」）於 UI。ScreenHeader 顯示的標題與 route `title` SHALL 共用同一 i18n 常數（`i18n/zh-TW.ts`），避免兩處字串漂移。

#### Scenario: 交易詳情返回鈕顯示繁中標題

- **WHEN** 使用者自交易清單進入交易詳情
- **THEN** header 返回鈕文字 SHALL 為「交易紀錄」（`zhTW.transactions.listTitle`），SHALL NOT 顯示 route 名「TransactionList」

#### Scenario: 全 stack 無 route 名裸露

- **WHEN** 使用者在任一 in-tab stack 進入子頁
- **THEN** 返回鈕文字皆為繁體中文畫面標題；新增畫面時此規則納入 checklist

### Requirement: header 不得有無功能控制項

畫面 header SHALL NOT 放置無任何行為的可點擊控制項；功能尚未實作的入口 SHALL 移除（或以明確「即將推出」回饋呈現——本階段採移除）。

#### Scenario: 通知鈴鐺

- **WHEN** 通知功能尚未實作
- **THEN** 持倉 header SHALL NOT 顯示鈴鐺按鈕
