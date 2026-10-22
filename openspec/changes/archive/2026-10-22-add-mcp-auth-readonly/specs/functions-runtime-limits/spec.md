## MODIFIED Requirements

### Requirement: 每個 Cloud Function 皆有明確的擴展上限

`apps/functions` 匯出的每個 Cloud Function SHALL 明確設定 `maxInstances` 與 `region: 'asia-east1'`，且 SHALL 取自單一共用模組（`runtimeOptions`），不得各檔自行宣告。面向使用者的 HTTP functions（`fetchQuotes`、`fetchQuote`、`fetchIntraday`、`fetchSymbolMeta`、`ensureHistory`、`mcp`）SHALL 為 `maxInstances: 3`；背景 functions（`scheduledUsdRate`、`seedUsdRate`、`onSymbolCreatedFetchQuote`）SHALL 為 `maxInstances: 1`。`minInstances` SHALL 維持未設定（0，無閒置費用）。

#### Scenario: 使用者端 HTTP function 上限

- **WHEN** 檢視 `fetchQuotes` 的部署設定
- **THEN** `maxInstances` 為 3、`region` 為 `asia-east1`

#### Scenario: MCP function 上限

- **WHEN** 檢視 `mcp` 的部署設定
- **THEN** `maxInstances` 為 3、`region` 為 `asia-east1`

#### Scenario: 背景 function 上限

- **WHEN** 檢視 `scheduledUsdRate` 的部署設定
- **THEN** `maxInstances` 為 1

## ADDED Requirements

### Requirement: MCP function 是唯一不經 App Check gate 的使用者端 HTTP function

`mcp` function 的呼叫者是 Claude 的伺服器，無法取得 App 的裝置證明，因此 SHALL NOT 套用 App Check gate，改由 OAuth bearer token 保護（見 `mcp-server`）。functions 的單元測試 SHALL 斷言：除 `mcp` 外的所有使用者端 HTTP functions 皆帶 App Check gate 標記，且 `mcp` 不帶該標記；新增任何未帶 gate 的使用者端 HTTP function 時 SHALL 失敗。

#### Scenario: MCP function 不經 App Check

- **WHEN** 檢視 `mcp` 的部署設定標籤
- **THEN** 不含 App Check gate 標記，且測試通過

#### Scenario: 新增未帶 gate 的使用者端 function

- **WHEN** 開發者新增一個不經 App Check gate 的使用者端 HTTP function（不是 `mcp`）並從 `index.ts` 匯出
- **THEN** 測試失敗並指出該 function 名稱
