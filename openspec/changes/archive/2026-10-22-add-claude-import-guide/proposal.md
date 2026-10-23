## Why

MCP 截圖匯入（ADR-0011，change 1～3）上線後，使用者需要知道這個功能存在、以及如何在 claude.ai 加入 AssetAnchor connector。需求 Q9 定案在 App 設定頁新增說明頁（系列的 change 4）。

依據：planning §11（設定為 tab、子頁為原生 header stack）、設計包 ADR-0008（新畫面先補 spec：`docs/design/claude-import/claude-import-spec.md`）。

## What Changes

- 設定落地頁新增「工具」分組與一列「用 Claude 匯入交易」。
- 新增設定子頁 `ClaudeImport`：說明、connector 網址（可長按選取）、「分享網址」與「開啟 Claude 設定」按鈕、四個設定步驟、注意事項。
- 新增設計規格 `docs/design/claude-import/claude-import-spec.md`（草案，待 owner 對圖確認）。
- 不新增任何原生相依（分享與開啟連結用 React Native 內建 `Share`、`Linking`）。

## Capabilities

### New Capabilities

- `claude-import-guide`: App 內「用 Claude 匯入交易」說明頁與設定入口。

### Modified Capabilities

（無）

## Non-goals

- 在 App 內顯示連線狀態或中斷連線（決策 A4）。
- 剪貼簿一鍵複製（需新增原生模組；改以可選取文字與分享面板達成）。

## Impact

- `apps/mobile/src/features/settings/`（新子頁、落地頁入口）、`core/navigation/types.ts`（新路由）。
- UI change → owner 視覺對圖（ADR-0008）與 TestFlight 發版時生效。
- 無 schema、無後端變更。
