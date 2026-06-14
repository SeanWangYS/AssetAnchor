## REMOVED Requirements

### Requirement: 單幣別 amounts map 組成

**Reason**: model A→B 翻案（ADR-0005）——交易事件改為純單幣別 flat 欄位，移除對稱多幣別 `amounts` map、`amounts_status`、`is_original`、`rate`/`rate_source`/`rate_type`/`rate_date`。App 不在交易內做任何 FX 換算、不追蹤匯率損益；匯率換算抽離至 `exchange_rates` 表 + 顯示層。
**Migration**: 改用新 requirement「單幣別 flat 金額欄位組成」。pre-launch 自用、正式專案預期無交易資料，emulator 資料重置即可；如有正式資料以一次性 backfill script 攤平（讀舊 doc → 上提 `amounts[ccy]` 欄位 → 覆寫、刪除 map/status）。

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: 交易輸入驗證（zod schema）

`packages/shared` SHALL 提供 transaction 輸入的 zod schema，驗證 BUY 單幣別輸入子集：`account_id`、`symbol`（trim 後非空）、`market`、`asset_type`、`transaction_type`、`transaction_date`（`YYYY-MM-DD`）、`quantity`（> 0）、`price`（> 0）、`fee`（≥ 0）、`tax`（≥ 0）、`currency`（市場原幣別，MVP 限 USD / TWD）、`notes`（可空）。型別由 `z.infer` 推導。`original_currency` 欄位**更名為** `currency`（單幣別模型下「original」無意義）。新增 / 修改 `asset_type` / `market` / `transaction_type` enum SHALL 補對應測試（planning doc §13.4）。

#### Scenario: 必填欄位缺失被拒

- **WHEN** 使用者送出缺少 `symbol` 或 `quantity` 的表單
- **THEN** zod `safeParse` 回傳失敗、附對應欄位的繁體中文錯誤訊息，且不寫入 Firestore

#### Scenario: 數量或單價非正數被拒

- **WHEN** 使用者輸入 `quantity="0"`、`quantity="-5"` 或 `price="abc"`
- **THEN** zod 驗證失敗並標示該欄位

#### Scenario: 合法輸入通過驗證

- **WHEN** 使用者輸入完整且合法的 BUY 欄位
- **THEN** zod `safeParse` 成功，回傳型別化的 `TransactionInput`（含 `currency`）
