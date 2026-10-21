## ADDED Requirements

### Requirement: 每個 Cloud Function 皆有明確的擴展上限

`apps/functions` 匯出的每個 Cloud Function SHALL 明確設定 `maxInstances` 與 `region: 'asia-east1'`，且 SHALL 取自單一共用模組（`runtimeOptions`），不得各檔自行宣告。面向使用者的 HTTP functions（`fetchQuotes`、`fetchQuote`、`fetchIntraday`、`fetchSymbolMeta`、`ensureHistory`）SHALL 為 `maxInstances: 3`；背景 functions（`scheduledUsdRate`、`seedUsdRate`、`onSymbolCreatedFetchQuote`）SHALL 為 `maxInstances: 1`。`minInstances` SHALL 維持未設定（0，無閒置費用）。

#### Scenario: 使用者端 HTTP function 上限

- **WHEN** 檢視 `fetchQuotes` 的部署設定
- **THEN** `maxInstances` 為 3、`region` 為 `asia-east1`

#### Scenario: 背景 function 上限

- **WHEN** 檢視 `scheduledUsdRate` 的部署設定
- **THEN** `maxInstances` 為 1

### Requirement: 測試強制所有 function 帶上限

functions 的單元測試 SHALL 列舉 `src/index.ts` 所有匯出的 function，任一缺 `maxInstances`、超過 3、或 `region` 不是 `asia-east1` 時 SHALL 失敗。

#### Scenario: 新增 function 忘了設上限

- **WHEN** 開發者新增一個未帶 `maxInstances` 的 function 並從 `index.ts` 匯出
- **THEN** 測試失敗並指出該 function 名稱
