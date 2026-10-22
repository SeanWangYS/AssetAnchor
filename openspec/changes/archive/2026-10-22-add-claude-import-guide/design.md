## Context

純 App UI change。設定子頁沿用既有模式（`AboutScreen`：ScrollView + Card、原生 stack header）。設計包沒有此畫面，依憲法 #1 先補 `docs/design/claude-import/claude-import-spec.md`。

## Goals / Non-Goals

**Goals:** 使用者能在 App 內找到這個功能並照步驟完成連線。
**Non-Goals:** 連線狀態、App 內中斷連線、剪貼簿原生模組。

## Decisions

- **入口放新分組「工具」**：與帳戶、帳號、其他的語意都不同；日後其他整合（例如 ChatGPT）也放這裡。
- **不加 `expo-clipboard`**：新增原生模組需要重新 native build；以 `Text selectable` + `Share.share`（分享面板含拷貝）達成，零新相依。
- **網址常數**：`features/settings/claudeImport.ts` 匯出 `CLAUDE_CONNECTOR_URL`（預設正式網址，可用 `EXPO_PUBLIC_MCP_CONNECTOR_URL` 覆寫，供本機 emulator 測試）與 `CLAUDE_CONNECTORS_SETTINGS_URL`。
- **測試**：ADR-0007 不為純畫面寫 RNTL；以 iOS Simulator 截圖對圖驗收。

## Risks / Trade-offs

- [claude.ai 設定頁網址變動] → 只影響「開啟 Claude 設定」按鈕，步驟文字仍可引導；集中於一個常數。

## Migration Plan

隨下一個 TestFlight build 發佈。無資料變更。
