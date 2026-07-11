# symbol-metadata Specification

## Purpose

TBD - created by archiving change add-symbol-metadata. Update Purpose after archive.

## Requirements

### Requirement: 未知代號動態建立 symbol 文件

系統 SHALL 在使用者送出一筆交易、而其 `{market}_{symbol}` 在 `symbols` collection 中尚無對應文件時，動態建立一筆最小 `symbols/{symbolId}` 文件（含 `symbol_id`、`symbol`、`market`、`asset_type`、`currency`、`is_active=true`，metadata 欄位先留待 enrich）。此建立 MUST 為冪等：同一代號已存在時不得重複建立。

#### Scenario: 新代號隨交易建立

- **WHEN** 使用者新增一筆 symbol 為尚未存在之代號的交易
- **THEN** 系統建立 `symbols/{symbolId}` 文件，`symbol_id` = `{market}_{symbol}`、`is_active` = true，其餘識別欄位取自該交易

#### Scenario: 既有代號不重複建立

- **WHEN** 使用者新增一筆 symbol 已存在於 collection 的交易
- **THEN** 系統不建立新文件、不覆寫既有 metadata

### Requirement: 後端補 symbol metadata

後端 SHALL 提供一個 HTTPS endpoint（沿用 live-quotes 的 onRequest 模式），向外部資料源取得 symbol 的 `name`、`name_zh`、`exchange`、`industry`、`sector`，整形後以 Admin SDK upsert 寫入 `symbols/{symbolId}` 並更新 `updated_at`。對缺值或異常回應 MUST fail-soft：不得以空值覆寫既有有效欄位、不得拋例外中斷。

#### Scenario: 成功補資料

- **WHEN** endpoint 收到一個有效代號且外部源回傳完整資料
- **THEN** `symbols/{symbolId}` 的 metadata 欄位被整形後寫入、`updated_at` 更新

#### Scenario: 外部源資料不完整

- **WHEN** 外部源僅回傳部分欄位或部分欄位無效
- **THEN** 僅寫入通過整形的有效欄位，缺漏欄位維持原值（不以空字串覆寫）、不拋例外

#### Scenario: 外部源查無此代號

- **WHEN** 外部源查無該代號
- **THEN** 文件保留、以 raw `symbol` 作為名稱 fallback、endpoint 回報「查無 metadata」而非錯誤

### Requirement: metadata 整形純函式

`packages/shared` SHALL 提供一個純函式，把外部資料源的原始物件整形為 `SymbolDocument` 的 metadata 子集，並防禦缺值、過長字串、前後空白與非字串型別。此函式 MUST 不做任何 IO、MUST 為可單元測試。

#### Scenario: 從多個名稱欄位擇優

- **WHEN** 原始資料同時含 `longName` 與 `shortName`
- **THEN** 純函式以可得的最佳欄位解析出 `name` 並去除前後空白

#### Scenario: 缺欄位安全降級

- **WHEN** 原始資料缺少某 metadata 欄位或型別非字串
- **THEN** 該欄位被整形為安全預設（空字串）而非拋例外

### Requirement: client 顯示權威名稱

持倉（HoldingsOverview）、交易（Transactions）、個股詳情（AssetDetail）畫面 SHALL 以 `symbols/{symbolId}` 文件之名稱作為顯示來源；當該文件尚無名稱 metadata 時 SHALL fallback 顯示 raw ticker。硬編 demo 名稱 map（`holdingsDemo.ts` 的 `SYMBOL_META`）SHALL 不再作為名稱顯示來源。

#### Scenario: 有 metadata 顯示真名

- **WHEN** 某代號的 `symbols` 文件已含 `name`
- **THEN** 對應畫面顯示該名稱（中文畫面優先 `name_zh`，缺則 `name`）

#### Scenario: 尚未 enrich 顯示代號

- **WHEN** 某代號的 `symbols` 文件尚無名稱 metadata
- **THEN** 對應畫面以 raw `symbol` 作為名稱 fallback，不顯示空白或硬編 demo 名稱

### Requirement: symbols collection 存取規則

`symbols/{symbolId}` SHALL 對已登入使用者可讀、可 create（MVP 動態新增）；client SHALL NOT update 或 delete。後端 Admin SDK 的 enrich 寫入不受 rules 限制。本 change MUST 以 rules 測試驗證上述允許/拒絕行為。

#### Scenario: 登入者可讀可建

- **WHEN** 已登入使用者讀取或建立一筆 `symbols/{symbolId}`
- **THEN** 允許

#### Scenario: client 不可改不可刪

- **WHEN** client 嘗試 update 或 delete `symbols/{symbolId}`
- **THEN** 拒絕

### Requirement: crypto symbol 的報價幣別恆為 USD

`symbols/{symbolId}` 的 `currency` 欄位語義為**報價幣別**；`market === 'CRYPTO'` 時 SHALL 恆為 `USD`，與交易幣別（`transaction.currency`，可 USD/USDT/TWD）分離。強制點兩處：mobile 由交易推導 symbol target 時，CRYPTO 標的的 `currency` SHALL 固定帶 `USD`（不抄交易幣別）；後端 `fetchSymbolMeta`（symbols 唯一寫入者）於 `market=CRYPTO` 時 SHALL 將寫入的 `currency` coerce 為 `USD`（防禦任何寫入端）。crypto metadata 查詢沿用 `toYahooSymbol` 的 `-USD` ticker（隨 live-quotes 修正生效）。

#### Scenario: USDT 記帳的 crypto 交易產生 USD 報價幣別的 symbol

- **WHEN** 使用者以 `currency="USDT"` 新增 CRYPTO/BTC 交易，觸發 symbol enrich
- **THEN** `symbols/CRYPTO_BTC` 的 `currency` SHALL 為 `"USD"`（非 USDT），metadata 以 `BTC-USD` 向 Yahoo 查得

#### Scenario: 後端 coerce 防禦直接呼叫

- **WHEN** `fetchSymbolMeta` 收到 `market=CRYPTO&currency=TWD` 的 query
- **THEN** 寫入 `symbols/{symbolId}` 的 `currency` SHALL 為 `"USD"`
