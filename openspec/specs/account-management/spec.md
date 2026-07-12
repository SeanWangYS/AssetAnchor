# account-management Specification

## Purpose

管理券商帳戶：建立 / 編輯 / 軟刪除停用、cash_balances 手動編輯、display_order 排序、`users.settings.default_account_id` 連動，以及帳戶資料的 per-user 隔離。對應 Sprint 2（Accounts），交易與持倉（Sprint 3+）皆掛在帳戶之下。

> 來源：docs/portfolio_tracker_planning.md §3（帳戶管理）、§6（Collection 2 accounts schema）、§11（導航）；
> 實作紀錄：openspec/changes/archive/2026-06-08-add-account-management/（proposal / design / tasks）、docs/adr/0003-navigation-structure.md。

## Requirements

### Requirement: 建立券商帳戶

系統 SHALL 允許已登入使用者在 `users/{uid}/accounts/{accountId}` 建立帳戶，欄位對齊 planning doc §6 `AccountDocument`。`accountId` SHALL 採 Firestore 自動產生的 document id，並回寫至文件的 `account_id` 欄位（與既有 `userDoc` 將 uid 同時作為 doc id 與欄位的 pattern 一致）。`created_at` / `updated_at` / `cash_balances_updated_at` SHALL 以 `serverTimestamp()` 寫入。

#### Scenario: 成功建立帳戶

- **WHEN** 使用者在 AddAccount 填妥 `account_name`、`broker`、`account_type`、`base_currency`、`market` 並送出
- **THEN** 系統在當前 uid 的 accounts subcollection 新增一份文件，`account_id` 等於該 document id、`is_active=true`，並關閉 modal 返回 AccountList，列表出現該帳戶

#### Scenario: 建立第一個帳戶時設為預設

- **WHEN** 使用者建立其名下第一個帳戶（先前 accounts 為空）
- **THEN** 系統將 `users/{uid}.settings.default_account_id` 設為新帳戶的 `account_id`

#### Scenario: display_order 自動指派

- **WHEN** 使用者在已有 N 個帳戶時建立新帳戶
- **THEN** 新帳戶的 `display_order` 等於現有帳戶 `display_order` 最大值加 1

### Requirement: 編輯帳戶基本資料

系統 SHALL 允許使用者在 AccountDetail 編輯既有帳戶的 `account_name`、`broker`、`account_type`、`base_currency`、`market`、`color`、`notes`，並更新 `updated_at`。`account_id`、`created_at` SHALL 不可變更。

#### Scenario: 成功編輯帳戶

- **WHEN** 使用者修改帳戶的 `account_name` 與 `color` 並儲存
- **THEN** 系統以 merge 更新該文件對應欄位、刷新 `updated_at`，AccountDetail 與 AccountList 顯示更新後的名稱與識別色

### Requirement: 停用與啟用帳戶（軟刪除）

系統 SHALL 以 `is_active` 旗標做軟刪除，**不得**提供帳戶實體刪除。停用 SHALL 設 `is_active=false`、啟用 SHALL 設 `is_active=true`。當被停用的帳戶為當前 `default_account_id` 時，系統 SHALL 清空 `users/{uid}.settings.default_account_id`（設為 null）。

#### Scenario: 停用帳戶

- **WHEN** 使用者在 AccountDetail 對一個 `is_active=true` 的帳戶執行停用
- **THEN** 該文件 `is_active` 變為 false，AccountList 預設視圖不再顯示該帳戶

#### Scenario: 停用的是預設帳戶

- **WHEN** 使用者停用的帳戶其 `account_id` 等於 `users/{uid}.settings.default_account_id`
- **THEN** 系統將 `default_account_id` 清為 null（重指派邏輯留待 Sprint 3）

#### Scenario: 重新啟用帳戶

- **WHEN** 使用者對一個 `is_active=false` 的帳戶執行啟用
- **THEN** 該文件 `is_active` 變為 true，並重新出現在 AccountList 預設視圖

### Requirement: 帳戶列表顯示與排序

AccountList SHALL 預設顯示當前 uid 下 `is_active=true` 的帳戶，依 `display_order` 遞增排序，並呈現每個帳戶的識別 `color` 與 `account_name`。系統 SHALL 提供檢視已停用帳戶的方式（例如「顯示已停用」切換），以便重新啟用。

#### Scenario: 列表依 display_order 排序

- **WHEN** 使用者開啟 AccountList 且名下有多個啟用帳戶
- **THEN** 帳戶依 `display_order` 由小到大排列，各列顯示帳戶識別色與名稱

#### Scenario: 檢視已停用帳戶

- **WHEN** 使用者切換為顯示已停用帳戶
- **THEN** 列表額外呈現 `is_active=false` 的帳戶，且可從中執行重新啟用

### Requirement: 手動編輯現金餘額（cash_balances）

系統 SHALL 允許使用者在 AccountDetail 手動輸入該帳戶的現金 snapshot，範圍為 MVP 幣別 USD 與 TWD，數值以 decimal string（小數第 10 位）寫入 `cash_balances` map。每次儲存 SHALL 更新 `cash_balances_updated_at`。畫面顯示時 SHALL 以 2 位小數呈現（`Money.toDisplayString`），儲存維持 10 位 canonical。現金餘額為手動 snapshot，**不**由交易自動推導。

#### Scenario: 編輯現金餘額

- **WHEN** 使用者在 AccountDetail 將 USD 現金改為 5000、TWD 現金改為 0 並儲存
- **THEN** `cash_balances` 寫入 `{ "USD": "5000.0000000000", "TWD": "0.0000000000" }`、`cash_balances_updated_at` 刷新為當前 serverTimestamp

#### Scenario: 顯示為 2 位小數

- **WHEN** 使用者重新進入 AccountDetail 檢視已儲存的現金
- **THEN** 輸入框顯示 2 位小數（如 `5000.00`），Firestore 儲存仍為 10 位 canonical string

### Requirement: 帳戶欄位驗證

送出建立 / 編輯前，系統 SHALL 以 `packages/shared` 的 zod schema 驗證輸入：`account_name` 非空且去除前後空白後長度 ≥ 1；`broker` ∈ `BROKERS`；`account_type` ∈ `ACCOUNT_TYPES`；`base_currency` ∈ { `USD`, `TWD` }（MVP 幣別範圍）；`color` 為合法 hex 色碼。驗證失敗 SHALL 阻止寫入並於對應欄位顯示錯誤訊息。

#### Scenario: 帳戶名稱為空被擋下

- **WHEN** 使用者未填 `account_name` 即送出
- **THEN** 系統不寫入 Firestore，並在 `account_name` 欄位顯示必填錯誤訊息

#### Scenario: 非 MVP 幣別被擋下

- **WHEN** 使用者選擇的 `base_currency` 不在 { USD, TWD } 之內
- **THEN** zod 驗證失敗、阻止送出並提示僅支援 USD / TWD

### Requirement: 帳戶資料隔離

Firestore security rules SHALL 確保使用者僅能讀寫自己 `users/{uid}/accounts/**` 下的帳戶；任何已登入使用者 SHALL 無法讀取或寫入他人帳戶。

#### Scenario: 不能讀取他人帳戶

- **WHEN** 使用者 A 嘗試讀取 `users/{B}/accounts/{accountId}`（B ≠ A）
- **THEN** Firestore rules 拒絕該讀取（permission denied）

#### Scenario: 不能寫入他人帳戶

- **WHEN** 使用者 A 嘗試在 `users/{B}/accounts` 建立或更新文件
- **THEN** Firestore rules 拒絕該寫入（permission denied）

### Requirement: 設定頁現金餘額跨帳戶總覽（唯讀展示）

設定頁（SettingsHome）的「現金餘額」列 SHALL 為**唯讀展示列**：不可點、不導航、無 chevron，右側顯示**跨帳戶現金總計**，由 `accountsStore` 各（啟用）帳戶的 `cash_balances` 依幣別加總（USD / TWD），以 `Money.toDisplayString`（2 位小數）＋幣別前綴呈現（如「NT$ X · US$ Y」），對齊原型 mock（analysis-page-spec §3.2 設定頁）。加總精度 SHALL 走 `Money`（ADR-0005），不得用 native float。

「帳戶管理」列維持可點、導向 Accounts 子頁（現金的逐帳戶編輯仍於 AccountDetail，見既有「手動編輯現金餘額」需求）。

#### Scenario: 現金餘額顯示跨帳戶加總且不可點

- **WHEN** 使用者於設定頁檢視「現金餘額」列，且帳戶含 TWD 現金合計 222,200、USD 現金合計 3,130.42
- **THEN** 該列右側顯示「NT$ 222,200.00 · US$ 3,130.42」之類各幣別加總；點擊該列**不**發生導航

#### Scenario: 某幣別無餘額

- **WHEN** 使用者所有帳戶皆無 USD 現金、僅有 TWD 現金
- **THEN** 現金餘額列 SHALL 僅顯示有餘額的幣別（如「NT$ X」），不顯示 0 值幣別（或依設計呈現），數值由 `Money` 加總

### Requirement: 帳戶估值以市值呈現

帳戶詳情 hero、帳戶列表 row、帳戶詳情持股列的估值 SHALL 以**真實報價市值**呈現，不得以投入成本作為市值代理。帳戶詳情 hero SHALL 顯示「帳戶市值」（持股市值 + 現金，基礎幣別）＋拆分小字（持股市值 · 現金）＋並列「投入成本 · 未實現損益（金額 + %）」（B 案）；持股列 SHALL 顯示市值 + 報酬%（原幣別，均價留於 subtitle）。報價缺失/過期時 SHALL 複用 live-quotes 的部分渲染與降級（「更新中…」／「查無代號」／最後已知值 + asOf + 重試），**不得**以成本冒充市值；全部持股皆無報價時市值/未實現顯示「報價載入中…」而現金照常顯示。多幣別 SHALL 以當日匯率換算進基礎幣別合計（ADR-0005），rates 未就緒時退回揭露而非靜默混算。所有運算 SHALL 用 `Money`，UI 出口才 `toDisplayString()`。持股列表維持無帳戶識別色點（A1 / holdings D3）。

帳戶詳情 hero 的「帳戶市值」**主數字**在顯示層 SHALL 滿足兩項可讀性條件：(1) SHALL 顯示到**小數點第二位**（含基礎幣別為 TWD 者，如 `NT$ 1,234,567.89`），對齊 `toDisplayString` 的 2 位小數語意——顯示層小數位不受基礎幣別影響；(2) 字級 SHALL **依數字長度自動縮放**（`adjustsFontSizeToFit` + 合理 `minimumFontScale`）以**完整單行**呈現，極長金額 SHALL NOT 被截斷或以省略號取代。此為顯示層行為，運算精度不變（仍走 `Money`，Firestore 維持 10 位 canonical string）。

#### Scenario: 帳戶詳情 hero 顯示市值與成本/未實現

- **WHEN** 使用者進入某帳戶詳情且該帳戶持股取得報價
- **THEN** hero SHALL 顯示「帳戶市值＝持股市值 + 現金」（基礎幣別）、拆分小字「持股市值 X · 現金 Y」、並列「投入成本 X · 未實現損益 ±Y（±Z%）」（未實現 = 市值 − 成本，正綠 ▲ / 負紅 ▼）

#### Scenario: hero 帳戶市值顯示到小數第二位（含 TWD）

- **WHEN** 使用者進入基礎幣別為 TWD 的帳戶詳情且帳戶市值可計算
- **THEN** hero 主數字 SHALL 顯示到小數點第二位（如 `NT$ 1,234,567.89`），而非 0 位小數；基礎幣別為 USD 者同樣顯示 2 位小數

#### Scenario: hero 帳戶市值長數字自動縮放單行完整呈現

- **WHEN** 帳戶市值為極大金額（如逾七位數再加兩位小數）致預設字級一行放不下
- **THEN** hero 主數字字級 SHALL 自動縮小至可完整單行呈現（`adjustsFontSizeToFit`），數字 SHALL NOT 被截斷、SHALL NOT 換行、SHALL NOT 以省略號取代；短數字維持較大基礎字級

#### Scenario: 持股列顯示市值與報酬率

- **WHEN** 帳戶詳情列出該帳戶持股且某持股有報價
- **THEN** 該列右側 SHALL 顯示該持股市值（原幣別）與報酬%（`Pnl`），均價顯示於 subtitle

#### Scenario: 帳戶列表 row 顯示市值

- **WHEN** 使用者於帳戶列表檢視某有持股的帳戶
- **THEN** 該 row 右側 SHALL 顯示該帳戶持股市值（原幣別；多幣別各列），非投入成本

#### Scenario: 報價缺失降級不以成本冒充

- **WHEN** 某帳戶部分持股無報價、或全部無報價
- **THEN** 有報價者先納入市值合計、缺者標「更新中…」/「查無代號」；全缺時市值/未實現顯示「報價載入中…」但**現金照常顯示**；任何情況 SHALL NOT 以投入成本填充市值欄位

#### Scenario: 多幣別換算進基礎幣別

- **WHEN** 帳戶同時持有 TWD 與 USD 標的且匯率就緒
- **THEN** hero 帳戶市值/成本/未實現 SHALL 以當日匯率換算進基礎幣別合計；rates 未就緒時 SHALL 揭露（如「另計」）而非以 demo 值靜默混算
