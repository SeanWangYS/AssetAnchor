# Analysis Prototype — 原始碼

v2 prototype：持倉總覽流程 + **分析頁** + 新導航（持倉/交易/分析/設定，帳戶併入設定）。

## 如何開啟

- 直接雙擊 `index.html`（需網路，React/Babel/字體自 CDN 載入）。
- 離線版請用上層的 `AssetAnchor-analysis-page.standalone.html`（單檔、免網路）。

## 檔案

| 檔案 | 內容 |
|---|---|
| `index.html` | 進入點：字體、phone 外框與 sheet/toast 等 CSS、script 載入順序 |
| `aa-core.jsx` | 設計 tokens（`T`）、mock 資料（`HOLD`/`ACCT`/`SUM`）、共用構件（Card/Segmented/Chart/Avatar/Pnl/Icon…）— 與 holdings-overview 共用 |
| `aa-analysis-charts.jsx` | 分析衍生資料（`AHOLD`/`ATOT`/`ACLS`，TWD 基準）+ 圖表構件（ADonut/ABarsVC/ARetBars/APnlBars/AShareBars）+ `aNice` 刻度函式 |
| `aa-analysis-page.jsx` | 分析頁畫面（hero count-up、TWD/USD 切換、五張圖卡）+ 分析 tab icon |
| `aa-screens-v2.jsx` | App 主體：新 TabBar、首頁、資產詳情、新增交易 sheet、設定頁 mock、Tweaks |
| `tweaks-panel.jsx` | Tweaks 面板基礎建設（強調色/donut/光暈/漲跌色開關） |

## 修改注意

- 載入順序：`tweaks-panel → aa-core → aa-analysis-charts → aa-analysis-page → aa-screens-v2`（後者依賴前者掛在 `window` 上的匯出）。
- 金額一律以 TWD 為內部基準，顯示時經 `aCv()/fA()` 換算（demo 匯率 30.95）。
- mock 微調：00878 市值改 20,800（小幅虧損示範），其餘與 holdings v1 一致。
