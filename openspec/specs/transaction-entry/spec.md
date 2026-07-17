# transaction-entry Specification

## Purpose

記錄買入（BUY、單幣別）交易事件並寫入 event-sourcing 的 `users/{uid}/transactions` 表：zod 輸入驗證、`Money` 精度處理、文件組成與 Firestore I/O 分離（ADR-0007 seam）、交易基礎時序清單檢視，以及交易資料的 per-user 隔離。對應 Sprint 3 Change 1（交易輸入）。多幣別 FX、SELL/已實現損益、持倉動態計算與個股對帳 timeline 為後續 sprint / change。

> 來源：docs/portfolio_tracker_planning.md §3（交易紀錄管理）、§4（報酬計算）、§5（多幣別策略）、§6（Collection 3 transactions schema）、§13.2（Sprint 3）；
> 實作紀錄：openspec/changes/archive/2026-06-10-add-transaction-entry/（proposal / design / tasks）、docs/adr/0004-event-sourcing-schema.md、docs/adr/0007-testing-strategy.md。

## Requirements

### Requirement: 記錄買入交易（BUY）

系統 SHALL 允許已登入使用者在 `users/{uid}/transactions/{transactionId}` 記錄交易事件，欄位對齊 planning doc §6 `TransactionDocument`。`transactionId` SHALL 採 Firestore 自動產生的 document id，並回寫至文件的 `transaction_id` 欄位。`created_at` / `updated_at` SHALL 以 `serverTimestamp()` 寫入。本 change 起支援 `transaction_type` 為 `BUY` 與 `SELL`（其餘型別仍不在範圍）。

#### Scenario: 成功記錄一筆買入

- **WHEN** 使用者在 AddTransaction 選 BUY、填妥 `account_id`、`symbol`、`market`、`asset_type`、`quantity`、單價、`transaction_date` 並送出
- **THEN** 系統在當前 uid 的 transactions subcollection 新增一份 `transaction_type="BUY"` 文件，`transaction_id` 等於該 document id，關閉 modal 並在交易清單出現該筆交易

#### Scenario: transaction_id 回寫為 document id

- **WHEN** 系統建立交易文件
- **THEN** 文件的 `transaction_id` 欄位值等於該 Firestore document 的 id

#### Scenario: 時戳以 serverTimestamp 寫入

- **WHEN** 系統建立交易文件
- **THEN** `created_at` 與 `updated_at` 皆以 `serverTimestamp()` 寫入

### Requirement: 記錄賣出交易（SELL）

系統 SHALL 允許已登入使用者記錄 `transaction_type="SELL"` 的交易事件（欄位同 `TransactionDocument`、`total = price × quantity`、`fee`/`tax` 記錄賣出手續費與交易稅）。AddTransaction SHALL 提供 BUY/SELL 切換。SELL 寫入前 SHALL 驗證 `quantity ≤ **所選帳戶（account_id）** 之 (market, symbol) 當下可賣股數`（由該帳戶交易子集經 `deriveHoldings` 推導），避免超賣。可賣量 SHALL 隨表單所選帳戶連動——**只能賣出該帳戶實際持有的股**；同一 symbol 於其他帳戶的持有量**不**計入本次可賣量。

#### Scenario: 成功記錄一筆賣出

- **WHEN** 使用者選 SELL、目標帳戶持有該 symbol 2500 股、賣出 1000 股 @600 並送出
- **THEN** 系統新增一份 `transaction_type="SELL"` 文件，交易清單出現該筆；該帳戶持倉股數隨之降為 1500、已實現損益入帳

#### Scenario: 超賣被拒（帳戶層級）

- **WHEN** 使用者對所選帳戶僅持有 1000 股的 symbol 送出賣出 1500 股
- **THEN** 表單驗證失敗、顯示繁中錯誤（如「賣出股數超過可賣」），不寫入 Firestore

#### Scenario: 該帳戶無持倉不可賣（即使其他帳戶有持倉）

- **WHEN** 使用者選 SELL、所選帳戶目前無該 symbol 持倉（即使同 symbol 在另一帳戶有持倉）
- **THEN** 表單 SHALL 阻擋（該帳戶可賣股數為 0），不寫入；不得以其他帳戶的持有量放行

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

### Requirement: Money 精度處理

系統 SHALL 以 `packages/shared` 的 `Money`（decimal.js）處理所有金額與數量，儲存為 10 位小數 string，禁用 native float 運算。非法數值（NaN / Infinity）SHALL 由 `Money` 丟 `InvalidMoneyValueError`，由表單層攔截為驗證錯誤。

#### Scenario: 使用者輸入轉為 10 位小數 string

- **WHEN** 使用者輸入單價 `"180.5"`
- **THEN** 儲存值為 `"180.5000000000"`

#### Scenario: 非法金額被攔截

- **WHEN** 組成文件時遇到 NaN / Infinity 金額
- **THEN** `Money` 丟 `InvalidMoneyValueError`，交易不寫入

### Requirement: 交易文件組成與 I/O 分離（可測性）

依 ADR-0007，系統 SHALL 將交易文件組成實作為**不依賴 Firestore** 的純函式 `buildTransactionDoc(input, ctx)`（回傳純 `TransactionDocument` 物件），與 Firestore I/O `writeTransaction(uid, doc)` 分離。純轉換 SHALL 可獨立單元測試，且納入 coverage gate。

#### Scenario: 組成邏輯可獨立於 Firestore 測試

- **WHEN** 以固定 input 與 ctx（如 `transactionId`、currency）呼叫 `buildTransactionDoc`
- **THEN** 回傳的純物件欄位完全由輸入決定（deterministic），不需 Firestore 連線即可斷言

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

### Requirement: transactions 資料 per-user 隔離

Firestore rules SHALL 確保使用者僅能讀寫自己 `users/{uid}/transactions/**` 之下的交易，不得存取他人交易。本 change 不改變 rules 行為（既有 `users/{uid}/{document=**}` catch-all 已涵蓋），但 SHALL 補上 transactions 子集合的隔離測試並納入 CI（ADR-0007）。

#### Scenario: 使用者讀寫自己的交易

- **WHEN** 已登入使用者 A 對 `users/A/transactions/{id}` 讀或寫
- **THEN** rules 允許

#### Scenario: 使用者無法存取他人交易

- **WHEN** 已登入使用者 A 嘗試讀或寫 `users/B/transactions/{id}`
- **THEN** rules 拒絕

### Requirement: 單幣別 flat 金額欄位組成

對單幣別 BUY，系統 SHALL 將金額以 flat 欄位寫入交易文件頂層：`currency`（市場原幣別）、`price`、`total`、`fee`、`tax`。`price`/`total`/`fee`/`tax` SHALL 為 `Money` 序列化的 10 位小數 string，其中 `total` 等於 `price × quantity`（成交金額，不含手續費與稅）。交易文件 SHALL **不含** `amounts` map、`amounts_status`、`is_original`、`rate`/`rate_source`/`rate_type`/`rate_date` 等任何匯率欄位——交易不記錄 FX 換算（ADR-0005）。

#### Scenario: 金額以 flat 欄位寫入、無 amounts map

- **WHEN** 使用者以 `currency="TWD"` 記錄一筆買入
- **THEN** 文件頂層含 `currency="TWD"` 與 `price`/`total`/`fee`/`tax`，且**不存在** `amounts`、`amounts_status`、`rate` 等欄位

#### Scenario: total 等於 price × quantity（Money 運算）

- **WHEN** 使用者輸入單價 `500`、數量 `1000`
- **THEN** `total` 為 `Money` 運算結果的 10 位小數 string（`"500000.0000000000"`），非 native float 計算

#### Scenario: 交易不帶任何匯率資訊

- **WHEN** 系統組成單幣別 BUY 文件
- **THEN** 文件不含匯率欄位；跨幣別換算由顯示層於檢視時以最新匯率即時計算（見 currency-display）

### Requirement: 股票代號自動補完（依交易歷史）

交易表單的代號欄 SHALL 在使用者輸入時，依其交易歷史的 distinct `(market, symbol)` 以**前綴比對**（不分大小寫）顯示建議清單。選取一筆建議 SHALL 一併帶入 `symbol`、`market`、`asset_type`、`currency`（取自該標的最近一筆交易）。建議 MUST 不阻擋手動輸入新代號（查無建議時照常可填）。

#### Scenario: 輸入前綴顯示歷史建議

- **WHEN** 使用者在代號欄輸入一段前綴、且歷史中有符合的標的
- **THEN** 顯示符合的標的建議；點選後代號 + 市場 + 資產類型 + 幣別一併帶入

#### Scenario: 新代號不受阻

- **WHEN** 輸入的前綴在歷史中無符合
- **THEN** 不顯示建議、不阻擋；使用者照常手動填代號與其餘欄位

### Requirement: 複製上一筆快捷

新增交易（非編輯）時，若使用者已有至少一筆交易，表單 SHALL 提供「複製上一筆」快捷；點擊 SHALL 以最近一筆交易的值預填表單，且 `transaction_date` 重設為今天、`quantity` 與 `notes` 留空待填。編輯既有交易時 SHALL NOT 顯示此快捷。

#### Scenario: 複製最近一筆預填

- **WHEN** 在新增交易畫面點「複製上一筆」
- **THEN** 帳戶/代號/市場/資產類型/幣別/單價/手續費以最近一筆交易預填，日期為今天、股數與備註留空

#### Scenario: 無交易或編輯模式不顯示

- **WHEN** 使用者尚無任何交易，或正在編輯既有交易
- **THEN** 不顯示「複製上一筆」快捷

### Requirement: 市場×幣別一致性驗證

`packages/shared` SHALL 提供純函式 `expectedCurrencyForMarket(market)`：`TW` → `TWD`、`US` → `USD`、`CRYPTO`/`OTHER` → 不約束（回 null）。transaction 輸入 zod schema SHALL 以 refine 強制此一致性：市場有對應幣別而輸入幣別不符時，`safeParse` SHALL 失敗並附繁體中文錯誤訊息（標示 `currency` 欄位），不寫入 Firestore。`CRYPTO` 市場 SHALL 另以允許集約束：交易幣別限 `USD` / `USDT` / `TWD`（`packages/shared` 提供 `CRYPTO_TRANSACTION_CURRENCIES` 常數），集合外幣別 `safeParse` SHALL 失敗（標示 `currency` 欄位、繁體中文錯誤訊息）。`OTHER` 市場維持不約束。

#### Scenario: TW 市場 × USD 被拒

- **WHEN** 使用者送出 `market="TW"`、`currency="USD"` 的交易
- **THEN** 驗證 SHALL 失敗，錯誤訊息指出台股交易幣別須為 TWD

#### Scenario: US 市場 × TWD 被拒

- **WHEN** 使用者送出 `market="US"`、`currency="TWD"` 的交易（production bug 實例）
- **THEN** 驗證 SHALL 失敗，不寫入 Firestore

#### Scenario: US 市場 × USDT 被拒

- **WHEN** 使用者送出 `market="US"`、`currency="USDT"` 的交易
- **THEN** 驗證 SHALL 失敗（美股交易幣別須為 USD）

#### Scenario: CRYPTO 允許 USD / USDT / TWD

- **WHEN** 使用者送出 `market="CRYPTO"` 搭配 `currency` 為 `USD`、`USDT` 或 `TWD` 的交易
- **THEN** 一致性檢查 SHALL 通過（其餘驗證照舊）

#### Scenario: CRYPTO 集合外幣別被拒

- **WHEN** 使用者送出 `market="CRYPTO"`、`currency="JPY"` 的交易（未來 Phase 2 幣別啟用後）
- **THEN** 驗證 SHALL 失敗，錯誤訊息指出 crypto 交易幣別限 USD / USDT / TWD

#### Scenario: OTHER 不約束

- **WHEN** 使用者送出 `market="OTHER"` 搭配任一支援幣別
- **THEN** 一致性檢查 SHALL 通過（其餘驗證照舊）

### Requirement: 表單市場/幣別聯動與代號樣式軟警告

交易表單 SHALL 於使用者選擇市場時，自動將幣別切換為該市場對應預設；預設值 SHALL 來自 `packages/shared` 純函式 `defaultCurrencyForMarket(market)`：`TW→TWD`、`US→USD`、**`CRYPTO→USD`**、`OTHER→null`（不動）。使用者於 CRYPTO 市場仍可手動改選 `USDT` / `TWD`（允許集內，見一致性驗證）。幣別 picker 選項 SHALL 含 `USDT`。`packages/shared` SHALL 提供純函式 `symbolLooksLikeMarketMismatch(market, symbol)`：市場為 `US` 而代號呈台股樣式（以數字開頭，如 `0050`、`2330`、`00631L`），或市場為 `TW` 而代號為純英文字母（如 `VOO`）時回 true。表單於代號/市場變動時 SHALL 即時顯示**非阻擋**軟警告（如「代號看起來像台股代號，請確認市場選擇」），不阻止送出。

#### Scenario: 選市場自動帶幣別

- **WHEN** 使用者將市場從 US 改為 TW
- **THEN** 幣別欄位 SHALL 自動切為 TWD（使用者仍可手動改，但改成不一致會被驗證擋下）

#### Scenario: 選 CRYPTO 市場預設 USD

- **WHEN** 使用者將市場切換為 CRYPTO
- **THEN** 幣別欄位 SHALL 自動切為 USD；使用者可手動改選 USDT 或 TWD 且通過驗證

#### Scenario: US 市場輸入台股樣式代號顯示軟警告

- **WHEN** 市場為 US、代號輸入 `0050`
- **THEN** 表單 SHALL 顯示市場疑似不符的提示文字，且不阻擋送出

#### Scenario: 樣式相符不顯示警告

- **WHEN** 市場為 US、代號輸入 `VOO`；或市場為 TW、代號輸入 `2330`
- **THEN** 不顯示軟警告

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

### Requirement: 交易清單月分組恆帶年份

交易清單的月分組標題 SHALL 恆帶西元年（如「七月 · 2026」），不因當年而省略——避免同畫面出現兩個無法區分的相同月份標題。

#### Scenario: 當年分組也帶年

- **WHEN** 清單同時含 2026-07 與 2024-07 的交易
- **THEN** 兩組標題 SHALL 分別為「七月 · 2026」與「七月 · 2024」，SHALL NOT 出現無年份的「七月」
