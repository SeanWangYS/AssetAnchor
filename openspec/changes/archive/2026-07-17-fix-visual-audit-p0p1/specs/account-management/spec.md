## MODIFIED Requirements

### Requirement: 帳戶欄位驗證

送出建立 / 編輯前，系統 SHALL 以 `packages/shared` 的 zod schema 驗證輸入：`account_name` 非空且去除前後空白後長度 ≥ 1；`broker` ∈ `BROKERS`；`account_type` ∈ `ACCOUNT_TYPES`；`base_currency` ∈ { `USD`, `TWD` }（MVP 幣別範圍）；`color` 為合法 hex 色碼。驗證失敗 SHALL 阻止寫入並於對應欄位顯示錯誤訊息。

**所有欄位**（含 `broker` / `account_type` / `base_currency` / `market` 等 enum 欄位）的錯誤訊息 SHALL 為繁體中文人話；SHALL NOT 將 zod 內建英文訊息或 enum 內部值（如 `"FIRSTRADE"|"INTERACTIVE_BROKERS"|...`）暴露於 UI。

表單錯誤 SHALL 於首次送出後**隨輸入即時重驗**：使用者修正任一欄位（文字輸入、picker 選擇、segmented 切換、色塊點選）時，SHALL 以最新值重新驗證並更新各欄位錯誤——已修正的欄位錯誤 SHALL 即時消失、仍不合法者保留（與交易表單 react-hook-form `reValidateMode:'onChange'` 行為一致）；SHALL NOT 出現「欄位已填妥但錯誤訊息殘留、最終卻能送出成功」的假警報狀態。

#### Scenario: 帳戶名稱為空被擋下

- **WHEN** 使用者未填 `account_name` 即送出
- **THEN** 系統不寫入 Firestore，並在 `account_name` 欄位顯示必填錯誤訊息

#### Scenario: 非 MVP 幣別被擋下

- **WHEN** 使用者選擇的 `base_currency` 不在 { USD, TWD } 之內
- **THEN** zod 驗證失敗、阻止送出並提示僅支援 USD / TWD

#### Scenario: enum 欄位未選擇時顯示繁中訊息

- **WHEN** 使用者未選擇 `broker` / `account_type` / `market` 即送出
- **THEN** 對應欄位錯誤訊息 SHALL 為「請選擇券商」/「請選擇帳戶類型」/「請選擇主要市場」，SHALL NOT 出現英文 zod 訊息或 enum 內部值

#### Scenario: 修正欄位後錯誤即時消失

- **WHEN** 空表單送出顯示錯誤後，使用者輸入合法帳戶名稱並自 picker 選擇券商
- **THEN** 「帳戶名稱」與「券商」的錯誤訊息與紅框 SHALL 即時消失（無需再次按送出），其餘未修正欄位錯誤保留
