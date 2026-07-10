# transaction-entry Delta: guard-transaction-market-consistency

## ADDED Requirements

### Requirement: 市場×幣別一致性驗證

`packages/shared` SHALL 提供純函式 `expectedCurrencyForMarket(market)`：`TW` → `TWD`、`US` → `USD`、`CRYPTO`/`OTHER` → 不約束（回 null）。transaction 輸入 zod schema SHALL 以 refine 強制此一致性：市場有對應幣別而輸入幣別不符時，`safeParse` SHALL 失敗並附繁體中文錯誤訊息（標示 `currency` 欄位），不寫入 Firestore。

#### Scenario: TW 市場 × USD 被拒

- **WHEN** 使用者送出 `market="TW"`、`currency="USD"` 的交易
- **THEN** 驗證 SHALL 失敗，錯誤訊息指出台股交易幣別須為 TWD

#### Scenario: US 市場 × TWD 被拒

- **WHEN** 使用者送出 `market="US"`、`currency="TWD"` 的交易（production bug 實例）
- **THEN** 驗證 SHALL 失敗，不寫入 Firestore

#### Scenario: CRYPTO / OTHER 不約束

- **WHEN** 使用者送出 `market="OTHER"` 搭配任一支援幣別
- **THEN** 一致性檢查 SHALL 通過（其餘驗證照舊）

### Requirement: 表單市場/幣別聯動與代號樣式軟警告

交易表單 SHALL 於使用者選擇市場時，自動將幣別切換為該市場對應預設（TW→TWD、US→USD；CRYPTO/OTHER 不動）。`packages/shared` SHALL 提供純函式 `symbolLooksLikeMarketMismatch(market, symbol)`：市場為 `US` 而代號呈台股樣式（以數字開頭，如 `0050`、`2330`、`00631L`），或市場為 `TW` 而代號為純英文字母（如 `VOO`）時回 true。表單於代號/市場變動時 SHALL 即時顯示**非阻擋**軟警告（如「代號看起來像台股代號，請確認市場選擇」），不阻止送出。

#### Scenario: 選市場自動帶幣別

- **WHEN** 使用者將市場從 US 改為 TW
- **THEN** 幣別欄位 SHALL 自動切為 TWD（使用者仍可手動改，但改成不一致會被驗證擋下）

#### Scenario: US 市場輸入台股樣式代號顯示軟警告

- **WHEN** 市場為 US、代號輸入 `0050`
- **THEN** 表單 SHALL 顯示市場疑似不符的提示文字，且不阻擋送出

#### Scenario: 樣式相符不顯示警告

- **WHEN** 市場為 US、代號輸入 `VOO`；或市場為 TW、代號輸入 `2330`
- **THEN** 不顯示軟警告
