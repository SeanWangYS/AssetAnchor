## MODIFIED Requirements

### Requirement: 交易輸入驗證（zod schema）

`packages/shared` SHALL 提供 transaction 輸入的 zod schema，驗證 BUY 單幣別輸入子集：`account_id`、`symbol`（trim 後非空）、`market`、`asset_type`、`transaction_type`、`transaction_date`（`YYYY-MM-DD`）、`quantity`（> 0）、`price`（> 0）、`fee`（≥ 0）、`tax`（≥ 0）、`currency`（市場原幣別，MVP 限 USD / TWD / **USDT**）、`notes`（可空）。型別由 `z.infer` 推導。`original_currency` 欄位**更名為** `currency`（單幣別模型下「original」無意義）。`CURRENCIES` enum SHALL 新增 `USDT`（交易/記帳幣別；換算基準 1:1 釘 USD）。新增 / 修改 `asset_type` / `market` / `transaction_type` / `currency` enum SHALL 補對應測試（planning doc §13.4）。

**所有欄位**（含 `market` / `asset_type` / `transaction_type` / `currency` 等 enum 欄位）的驗證失敗訊息 SHALL 為繁體中文人話；SHALL NOT 將 zod 內建英文訊息或 enum 內部值（如 `"STOCK"|"ETF"|...`）暴露於 UI。enum 欄位訊息以 inline message 定義於 schema（沿用既有欄位訊息慣例，不引全域 locale）。

#### Scenario: 必填欄位缺失被拒

- **WHEN** 使用者送出缺少 `symbol` 或 `quantity` 的表單
- **THEN** zod `safeParse` 回傳失敗、附對應欄位的繁體中文錯誤訊息，且不寫入 Firestore

#### Scenario: enum 欄位未選擇時顯示繁中訊息

- **WHEN** 使用者未選擇 `asset_type`（值為空字串）即送出
- **THEN** 該欄位錯誤訊息 SHALL 為「請選擇資產類型」；`market` / `transaction_type` / `currency` 同理（「請選擇市場」/「請選擇交易類型」/「請選擇幣別」），SHALL NOT 出現 `Invalid option: expected one of ...` 或任何 enum 內部值

#### Scenario: 數量或單價非正數被拒

- **WHEN** 使用者輸入 `quantity="0"`、`quantity="-5"` 或 `price="abc"`
- **THEN** zod 驗證失敗並標示該欄位

#### Scenario: 合法輸入通過驗證

- **WHEN** 使用者輸入完整且合法的 BUY 欄位
- **THEN** zod `safeParse` 成功，回傳型別化的 `TransactionInput`（含 `currency`）

#### Scenario: USDT 為合法交易幣別

- **WHEN** 使用者送出 `market="CRYPTO"`、`currency="USDT"` 的合法交易
- **THEN** zod `safeParse` 成功；`CURRENCIES` 白名單測試涵蓋 `USDT`

### Requirement: 檢視已記錄交易（基礎時序清單）

系統 SHALL 在交易 Tab 顯示當前使用者已記錄交易的時序清單，依 `transaction_date` 由新到舊排序（單欄排序，沿用 Firestore 自動索引；同日順序不保證，足以驗證寫入並達成「第一筆 transaction 寫入」里程碑）。個股分組的對帳 timeline 不在本 change（Sprint 3 Change 2）。

交易的**總金額顯示口徑** SHALL 全 app 統一為**含手續費與稅**：BUY 顯示 `total + fee + tax`（總成本）、SELL 顯示 `total − fee − tax`（總收入，可為負、照實顯示）。適用範圍：交易清單列右側金額、交易詳情「總成本／總收入」列、個股交易歷史明細列。計算 SHALL 走 `packages/shared` 純函式（`transactionTotalWithFees`，`Money` 運算），與持倉推導（`deriveHoldings`）及表單「預估總成本」共用同一口徑——同一筆交易在任何畫面顯示的總金額 SHALL 一致。Firestore `total` 欄位語意（成交金額，不含費）維持不變（見「單幣別 flat 金額欄位組成」），本口徑為顯示層。交易詳情 SHALL 於 `tax` 非零時顯示「交易稅」列（對齊個股交易歷史慣例），使「股數×單價＋手續費＋稅＝總成本」可於畫面對帳。

#### Scenario: 新增後出現在清單

- **WHEN** 使用者成功記錄一筆 BUY
- **THEN** 交易清單即時（onSnapshot）出現該筆，顯示 `symbol`、`quantity`、單價與 `transaction_date`，並依 `transaction_date` 由新到舊排序

#### Scenario: 清單為空時的呈現

- **WHEN** 當前使用者尚無任何交易
- **THEN** 交易清單顯示空狀態提示，而非錯誤

#### Scenario: 總金額含手續費且跨畫面一致

- **WHEN** 一筆 BUY 為 10 股 × US$512.30、手續費 US$1.00、稅 0
- **THEN** 交易清單列右側、交易詳情「總成本」、編輯表單「預估總成本」SHALL 皆顯示 `US$ 5,124.00`（= total + fee + tax），不得出現 5,123.00 / 5,124.00 並存

#### Scenario: 含稅交易的詳情對帳

- **WHEN** 一筆 SELL 含非零 `tax`（如台股證交稅）
- **THEN** 交易詳情 SHALL 顯示「交易稅」列，且「總收入」= total − fee − tax；使用者可由畫面欄位對帳

## ADDED Requirements

### Requirement: 期間篩選自訂起訖區間

交易清單期間篩選 sheet 除 preset（全部/本月/近三月/今年）外，SHALL 提供**自訂起訖**日期區間（spec T5）：起訖為 `YYYY-MM-DD` 受控文字輸入（沿用交易表單 DateField 慣例，MVP 不引第三方 date picker）；**兩欄皆為合法日期**時才進入 custom 狀態並即時顯示命中筆數；起 > 訖 SHALL 顯示「起日需早於訖日」且套用鈕 disabled；custom 狀態下任一欄缺失/非法 SHALL disable 套用鈕（不得套用出 UI 與過濾脫鉤的狀態）。過濾 SHALL 含起訖當日（`start ≤ transaction_date ≤ end`，ISO 字串比較）。套用 custom 後：期間 pill SHALL 顯示實際區間（「期間：M/D–M/D」）；**重開 sheet SHALL 保留 custom 選取並回填起訖值**。選擇任一 preset SHALL 清空自訂輸入。custom 選取不持久化（與 preset 行為一致，session 內有效）。

#### Scenario: 自訂區間過濾生效且含當日

- **WHEN** 使用者輸入起 `2024-09-05`、訖 `2025-01-15` 並套用
- **THEN** 清單只顯示 `transaction_date` 介於兩日（含當日）的交易；套用鈕顯示正確命中筆數；pill 顯示「期間：9/5–1/15」

#### Scenario: 起日晚於訖日被擋

- **WHEN** 起 `2025-01-15`、訖 `2024-09-05`
- **THEN** sheet 顯示「起日需早於訖日」、套用鈕 disabled

#### Scenario: 重開 sheet 保留自訂狀態

- **WHEN** 使用者套用自訂區間後重新開啟期間篩選 sheet
- **THEN** custom 仍為選取狀態、起訖欄回填先前值；再按套用 SHALL NOT 丟失區間

#### Scenario: 單欄輸入不靜默套用

- **WHEN** 使用者只輸入起日（訖為空）且目前選取為 custom
- **THEN** 套用鈕 disabled；SHALL NOT 發生「輸入被靜默忽略、實際套用其他 preset」
