# Design — 設計定稿 / 原型

本資料夾收錄各畫面的高保真設計定稿與可操作原型，作為 React Native 實作的視覺/互動依據。

> 放置位置建議：`docs/design/`（與 `docs/adr`、`docs/tech_note` 同層）。

## 內容

| 項目 | 路徑 | 狀態 |
|---|---|---|
| 持倉總覽（首頁）+ 資產詳情 + 新增交易 | [`holdings-overview/`](./holdings-overview/) | ✅ v1 定稿 |
| 分析頁（配置 donut + 多維度比較圖）+ 導航變更 | [`analysis-page/`](./analysis-page/) | ✅ v1 定稿 |
| 交易紀錄（時間軸列表 + 詳情 + 日期篩選） | [`transactions-page/`](./transactions-page/) | ✅ v1 定稿 |
| 帳戶管理（列表 + 詳情 + 現金 inline 編輯 + 表單） | [`accounts-management/`](./accounts-management/) | ✅ v1 定稿 |
| **Auth 登入 / 註冊 / 忘記密碼流程** | [`auth-flow/`](./auth-flow/) | ✅ 2026-06-14（整合進 app-prototype） |
| **整合版 App prototype（最新，含以上全部流程）** | [`app-prototype/`](./app-prototype/) | ✅ 2026-06-14 |

> `app-prototype/` 是**唯一持續更新**的整合原型；各頁面資料夾保留 spec 與探索記錄（`exploration/`）。`analysis-page/prototype/` 為當時定稿快照，已被 app-prototype 取代。

## 導航（已落實於 prototype）

底部 Tab：**`持倉 / 交易 / 分析 / 設定`**。帳戶管理併入設定；新增「分析」亮點頁。planning.md §11 需同步更新；另 §11.3 交易頁改 **FAB-only**（無 header ＋）。

**Auth（新）**：app 啟動 = Splash gate → SignIn；登入成功進 MainTabs（落地持倉），設定頁可登出回 SignIn。對應 planning §11 AuthStack。視覺定稿＝方向 A「錨定置中」＋ 款 2「圓環錨點」標誌。

## 設計方向摘要

- Dark-first、藍紫主調（accent `#7C6CF0`）、Nunito 圓潤數字 + Noto Sans TC、8px 網格、克制的 fintech 光暈層次。
- 漲跌＝綠漲紅跌；**買/賣＝主題漸層**（買 紫→洋紅、賣 藍→青），兩套色彩系統獨立。
- 分析頁：垂直捲動卡片；TWD/USD 全頁切換；圓餅維度＝資產類別（個股 accent / ETF `#35C6EA`）。
- 交易紀錄：時間軸版型（左側日期欄、按月分組）；篩選只做日期區間。
- 帳戶：識別色回歸（列表圓標＋詳情光暈，修訂 D3）；現金餘額＝卡片 inline 編輯。
- 新增入口慣例：**FAB**（交易、帳戶管理）。
- **多幣別＝單幣別事件 + 顯示時換算（model B / [ADR-0005](../adr/0005-single-currency-events-display-fx.md)）**：交易只記市場原幣別（不在輸入時換算、不存 amounts map）；跨幣別合計只在持倉/分析頁以**最新匯率**即時換算；AssetDetail / 分析頁的 TWD/USD 切換為顯示層換算。

詳見各資料夾 `*-spec.md`。

## 最新 prototype 入口

- **整合版（推薦）**：`app-prototype/AssetAnchor-app.standalone.html`（雙擊即開，免網路）
- 可編輯原始碼：`app-prototype/prototype/`（README 內有檔案說明與載入順序）
