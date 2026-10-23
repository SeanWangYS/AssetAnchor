# 用 Claude 匯入交易（設定子頁）設計規格

> 狀態：已確認（2026-10-23 起草；同日 owner 於 iOS Simulator 視覺對圖確認，不加 Claude Code 說明）。
> 依據：MCP 截圖匯入系列需求 Q9（App 設定頁加說明頁）、ADR-0011。
> 視覺系統沿用 `docs/design/README.md` 與既有設定子頁（`AboutScreen`、`ProfileScreen`）：dark-first、accent `#7C6CF0`、Noto Sans TC + Nunito、8px 網格。

## 1. 目的

讓使用者知道可以把券商的交易截圖交給 Claude 匯入，並照步驟在 claude.ai 加入 AssetAnchor connector。頁面純說明，不讀寫任何資料。

## 2. 入口

設定落地頁（SettingsHome）新增分組 **「工具」**，位於「帳號」與「其他」之間，內含一列：

| 元素 | 規格 |
|---|---|
| 列標題 | `用 Claude 匯入交易` |
| 列尾 | chevron（同其他可導航列） |
| 點擊 | push 子頁 `ClaudeImport`，原生 header 標題 `用 Claude 匯入交易` |

## 3. 版面（由上到下，ScrollView，頁面 padding = `spacing.page`，區塊間距 `spacing.xl`）

### 3.1 Intro

- 標題（`fontSize.title`、bold、主文字色）：`把截圖交給 Claude，交易自動入帳`
- 內文（footnote、次文字色、行高 22）：`在 Claude 上傳券商 App 或對帳單的交易截圖，Claude 會整理成交易清單，經你逐筆確認後寫入 AssetAnchor。`

### 3.2 Connector 網址卡（Card）

- 區塊標題：`Connector 網址`
- 網址：`https://assetanchor-832df.web.app/mcp`，數字字體 medium、主文字色、可長按選取複製（`selectable`）、背景為 surface 圓角框（radius md、padding md）。
- 兩個全寬按鈕上下排列（間距 sm；並排時「開啟 Claude 設定」會折成兩行，故改直排）：
  - `開啟 Claude 設定`（primary，在上）：以系統瀏覽器開啟 `https://claude.ai/settings/connectors`。
  - `分享網址`（secondary）：開啟系統分享面板（內含「拷貝」）。

### 3.3 設定步驟卡（Card）

區塊標題 `設定步驟`，四步，每步左側為 accent 圓形序號（24px、accent 底、白色 Nunito 粗體數字），右側文字（footnote、次文字色）：

1. `在 claude.ai 開啟「設定 → Connectors」，選擇新增自訂 connector。`
2. `名稱填「AssetAnchor」，網址貼上上方的 connector 網址。`
3. `按「連線」，用你的 AssetAnchor 帳號登入並允許存取。`
4. `在對話中上傳交易截圖，告訴 Claude 要匯入哪個帳戶。`

### 3.4 你需要知道的事（Card）

區塊標題 `你需要知道的事`，每點左側 `check` icon（accent、16px）：

- `匯入前 Claude 會逐筆列出交易，你確認後才會寫入。`
- `目前只支援買入與賣出，股利等其他類型會略過。`
- `也可以請 Claude 修改或刪除交易，同樣會先讓你確認；刪除後無法復原。`
- `要中斷連線，到 Claude 的 connector 設定移除 AssetAnchor 即可。`

### 3.5 頁尾

footnote 弱色置中：`需要 Claude 帳號；讀取截圖的費用由你的 Claude 方案負擔。`

## 4. 狀態

純靜態，無 loading／empty／error。外部連結開啟失敗時以 Toast 顯示 `無法開啟連結，請手動前往 claude.ai`。

## 5. 無障礙

- 按鈕有可讀標籤（同按鈕文字）。
- 序號圓圈對螢幕閱讀器隱藏，步驟文字以「第 1 步，…」朗讀。

## 6. 不做

- 不在 App 內顯示連線狀態或中斷連線（決策 A4）。
- 不偵測使用者是否已安裝 Claude App。
