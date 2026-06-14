# 持倉總覽 Prototype — 如何開啟與修改

可點擊操作的高保真原型，三個畫面：持倉總覽（首頁）→ 個別資產詳情 → 新增交易。

## 開啟方式

### A. 線上版（這個資料夾，可編輯）

`index.html` 透過 CDN 載入 React / ReactDOM / Babel，並用瀏覽器端 Babel 即時轉譯 `.jsx`。

- **需要網路連線**（要抓 CDN 與 Google Fonts）。
- 因為瀏覽器安全限制，直接雙擊 `index.html` 可能無法載入 `.jsx`（`file://` 限制）。建議用本機靜態伺服器：
  ```bash
  cd prototype
  npx serve .        # 或 python3 -m http.server
  # 開瀏覽器到提示的網址
  ```

### B. 單檔離線版（上一層資料夾）

`../AssetAnchor-holdings-overview.standalone.html` 已把字體、函式庫、所有程式碼內嵌成單一檔。

- **雙擊即可開**，免伺服器、可離線。檔案較大（內含 Babel）。
- 適合保存、分享、丟給家人朋友看。**不適合拿來改**（請改線上版原始碼後重新打包）。

## 檔案角色

| 檔案               | 內容                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`       | HTML 殼、字體、樣式（`.aa-*` class）、掛載點、script 載入順序                                                                         |
| `aa-core.jsx`      | 設計 tokens、假資料（HOLD/ACCT/SUM/SERIES）、共用構件（Chart / Card / Segmented / TimeTabs / Avatar / TabBar / 圓鈕 / count-up hook） |
| `aa-screens.jsx`   | 三個畫面（Home / AssetDetail / AddTransaction）+ App 導航 + Tweaks 面板                                                               |
| `tweaks-panel.jsx` | Tweaks 面板框架與控制元件                                                                                                             |

> script 載入順序固定：React → ReactDOM → Babel → tweaks-panel → aa-core → aa-screens。
> 跨檔共用是透過 `Object.assign(window, {...})` 掛到 `window`，因為每個 `type="text/babel"` 各自有獨立 scope。

## 改東西的常見入口

- **改假資料**：`aa-core.jsx` 的 `HOLD` / `ACCT` / `SUM` / `SERIES`。
- **改顏色 / 字體 / 間距**：`aa-core.jsx` 的 `T` 物件、`index.html` 的 `--num-font`。
- **改買入/賣出按鈕色**：`aa-screens.jsx` 的 `AddTransaction` 內 `grad` 陣列。
- **改版面**：`aa-screens.jsx` 的 `Home` / `AssetDetail` / `AddTransaction`。

## Tweaks

右上角開啟 Tweaks 面板可即時調整：強調色（藍↔紫 4 色）、卡片/圖表光暈、漲跌是否用紅綠色。

## 提醒

這是**設計原型**，資料為寫死 mock，沒有後端。實作請依 `docs/portfolio_tracker_planning.md` 的架構（RN + Expo + Firebase + decimal.js）重寫，本原型只定義「長相與互動」。
