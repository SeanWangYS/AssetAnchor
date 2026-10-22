# claude-import-guide Specification

## Purpose

The in-app guide that tells users how to connect Claude to AssetAnchor for screenshot imports (ADR-0011, docs/design/claude-import/claude-import-spec.md).

## Requirements

### Requirement: 設定頁提供 Claude 匯入說明入口

設定落地頁 SHALL 在「帳號」與「其他」分組之間顯示「工具」分組，內含「用 Claude 匯入交易」列（列尾 chevron）；點擊 SHALL 進入 `ClaudeImport` 子頁，原生 header 標題為「用 Claude 匯入交易」。

#### Scenario: 從設定進入說明頁

- **WHEN** 使用者在設定頁點「用 Claude 匯入交易」
- **THEN** 進入說明頁，header 顯示「用 Claude 匯入交易」並有返回鍵

### Requirement: 說明頁提供 connector 網址與設定步驟

說明頁 SHALL 依 `docs/design/claude-import/claude-import-spec.md` 顯示：說明文字、connector 網址（`https://assetanchor-832df.web.app/mcp`，可長按選取）、「分享網址」與「開啟 Claude 設定」按鈕、四個設定步驟、注意事項（逐筆確認、只支援買賣、修改刪除需確認且刪除不可復原、如何中斷連線）。「分享網址」SHALL 開啟系統分享面板並帶入網址；「開啟 Claude 設定」SHALL 以系統瀏覽器開啟 `https://claude.ai/settings/connectors`，失敗時 SHALL 顯示「無法開啟連結，請手動前往 claude.ai」。頁面 SHALL NOT 讀寫任何資料。

#### Scenario: 分享 connector 網址

- **WHEN** 使用者點「分享網址」
- **THEN** 系統分享面板出現，內容為 connector 網址

#### Scenario: 開啟 Claude 設定

- **WHEN** 使用者點「開啟 Claude 設定」
- **THEN** 系統瀏覽器開啟 `https://claude.ai/settings/connectors`
