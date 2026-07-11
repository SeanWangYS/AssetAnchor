# Delta: transaction-entry（enable-crypto-quotes）

## MODIFIED Requirements

### Requirement: 交易輸入驗證（zod schema）

`packages/shared` SHALL 提供 transaction 輸入的 zod schema，驗證 BUY 單幣別輸入子集：`account_id`、`symbol`（trim 後非空）、`market`、`asset_type`、`transaction_type`、`transaction_date`（`YYYY-MM-DD`）、`quantity`（> 0）、`price`（> 0）、`fee`（≥ 0）、`tax`（≥ 0）、`currency`（市場原幣別，MVP 限 USD / TWD / **USDT**）、`notes`（可空）。型別由 `z.infer` 推導。`original_currency` 欄位**更名為** `currency`（單幣別模型下「original」無意義）。`CURRENCIES` enum SHALL 新增 `USDT`（交易/記帳幣別；換算基準 1:1 釘 USD）。新增 / 修改 `asset_type` / `market` / `transaction_type` / `currency` enum SHALL 補對應測試（planning doc §13.4）。

#### Scenario: 必填欄位缺失被拒

- **WHEN** 使用者送出缺少 `symbol` 或 `quantity` 的表單
- **THEN** zod `safeParse` 回傳失敗、附對應欄位的繁體中文錯誤訊息，且不寫入 Firestore

#### Scenario: 數量或單價非正數被拒

- **WHEN** 使用者輸入 `quantity="0"`、`quantity="-5"` 或 `price="abc"`
- **THEN** zod 驗證失敗並標示該欄位

#### Scenario: 合法輸入通過驗證

- **WHEN** 使用者輸入完整且合法的 BUY 欄位
- **THEN** zod `safeParse` 成功，回傳型別化的 `TransactionInput`（含 `currency`）

#### Scenario: USDT 為合法交易幣別

- **WHEN** 使用者送出 `market="CRYPTO"`、`currency="USDT"` 的合法交易
- **THEN** zod `safeParse` 成功；`CURRENCIES` 白名單測試涵蓋 `USDT`

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
