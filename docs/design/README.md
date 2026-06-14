# Design — 設計定稿 / 原型

本資料夾收錄各畫面的高保真設計定稿與可操作原型，作為 React Native 實作的視覺/互動依據。

> 放置位置建議：`docs/design/`（與 `docs/adr`、`docs/tech_note` 同層）。

## 內容

| 項目                                  | 路徑                                         | 狀態       |
| ------------------------------------- | -------------------------------------------- | ---------- |
| 持倉總覽（首頁）+ 資產詳情 + 新增交易 | [`holdings-overview/`](./holdings-overview/) | ✅ v1 定稿 |

每個項目資料夾內含：

- `*-spec.md` — 設計交接文件（決策、版型、tokens、互動、與實作對應）
- `*.standalone.html` — 單檔離線原型（雙擊即開）
- `prototype/` — 可編輯原始碼（React + Babel）

## 設計方向摘要（持倉總覽 v1）

- Dark-first、藍紫主調（accent `#7C6CF0`）、Nunito 圓潤數字 + Noto Sans TC。
- 首頁採「數據優先」儀表板版型：大數字 → 2×2 摘要卡 → 走勢圖卡 → 持股清單。
- 買入/賣出用主題漸層（紫洋紅 / 藍青），不用傳統紅綠；漲跌仍綠漲紅跌。
- 帳戶不用顏色圓點區分。

詳見 [`holdings-overview/holdings-overview-spec.md`](./holdings-overview/holdings-overview-spec.md)。
