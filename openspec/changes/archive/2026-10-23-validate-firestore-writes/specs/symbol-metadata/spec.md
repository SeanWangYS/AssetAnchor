## MODIFIED Requirements

### Requirement: symbols collection 存取規則

`symbols/{symbolId}` SHALL 對已登入使用者可讀；client SHALL NOT create、update 或 delete。只有後端（`fetchSymbolMeta`、MCP 工具）以 Admin SDK 建立與 enrich，不受 rules 限制。MUST 以 rules 測試驗證上述允許／拒絕行為。

#### Scenario: 登入者可讀

- **WHEN** 已登入使用者讀取一筆 `symbols/{symbolId}`
- **THEN** 允許

#### Scenario: client 不可寫

- **WHEN** client 嘗試 create、update 或 delete `symbols/{symbolId}`
- **THEN** 拒絕
