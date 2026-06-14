# 設計靈感歸納筆記

> 為「個人投資組合追蹤 App（個股 + ETF / 跨多券商 / 跨幣別 USD↔TWD）」蒐集的參考圖與設計重點。
> 圖片實際看過後挑選最有啟發價值者，按專案的畫面類別分類存放。

---

## A. 2026 財經 App 共通設計趨勢（綜合搜尋結果）

1. **Dark-first**：OLED 螢幕已是主流，深色模式被視為主畫面而非反色版本；省電且降低盯盤眼壓。
2. **大數字 + 弱輔助**：核心資產數字佔螢幕視覺 30%+，輔助資訊（變動金額/%）刻意縮小。
3. **單色情緒**：漲跌只用一組色（綠/紅 或 藍/橘），避免多色雜訊；正負號用 ▲▼ 加強。
4. **Bottom sheet 取代 modal 全屏**：新增/編輯交易等次要動作用可下滑的底部抽屜，焦點仍在主畫面 context。
5. **Time tabs 標配**：1D / 1W / 1M / 3M / YTD / 1Y / ALL 已是業界慣例，**不要重新發明**。
6. **個股列表 row 結構**：左 logo / 中（名稱 + 持股數·均價）/ 右（市值 + 漲跌%），三段式幾乎是共識。
7. **快速動作 pill 按鈕**：圓角全填色按鈕（+ Invest、+ Add money、Trade）放在卡片內，色塊比卡片淺。
8. **Bento 卡片網格**：第二層資訊（MyPay / Savings / 各帳戶餘額）用 2×N 方塊網格，省螢幕高度。
9. **微互動回饋**：下拉刷新、按鈕按壓、數字 tween 動畫，建立「即時感」與「信任感」。
10. **AI 個人化板型（2026 新）**：依使用者實際開啟頻率自動調整 dashboard 排序，未必我們 MVP 要做，但版面要預留。

---

## B. 各參考圖的具體啟發

### B.1 `portfolio_dashboard/`

#### 🏆 05_robinhood_portfolio_stock_detail.webp（最高參考價值）
- **左圖（持倉總覽）**：標題 `Investing` + 總資產 `$8,153.31` + 一行變動（▲ $922.47 / 12.76% / All time），下面一張單線圖、底下時間 tabs，再下面 `Buying power` 行、訊息卡片、bottom tab。
- **中圖（個股詳情）**：返回箭頭 / 標題 `AAPL` `Apple` / 現價 + 今日變動 + 「24 Hour Market」標籤、線圖、時間 tabs、底部 `Trade` 主按鈕。
- **對我們的啟發**：
  - 我們的 **HoldingsOverview** 幾乎可以直接套這個版型：把「Investing」改成「持倉總覽」、總資產數字下方放 `▲ NT$X (X.XX%) 全期`。
  - 「Buying power」這一行對應到我們的 **現金餘額**（cash_balances 跨帳戶加總）。
  - 個股詳情頁的時間 tabs 我們可以**只先做 1D / 1M / 1Y / ALL**（4 個），等第二階段加 TWR 後再補齊。

#### 🏆 04_revolut_home_wealth_holdings.webp
- **右圖（Wealth）**：頂部 `Stocks / Crypto / Comodities / Vaults` segmented control → 適合做我們的 **「按資產類型篩選」**（MVP 只有 STOCK/ETF，但 schema 已預留 CRYPTO/BOND）。
- 每檔股票 row：**左 logo 圓形** / **中：名稱 + 持股數·均價（淺灰小字）** / **右：市值 + 變動%**。三段式排版可直接抄。
- **對我們的啟發**：因為 React Native 不容易拿到 logo，我們可以用**單字圓形彩塊**（例：「2330」→ 綠底白字 `2330`、「AAPL」→ 黑底白字 `A`）作為 placeholder，視覺仍乾淨。

#### 06_chime_balance_card.webp
- 整片**單色綠**佔上半螢幕、白色超大字 `Available $1,246.91`，底下兩個白卡 `MyPay $350` `Savings $821.45`。
- **對我們的啟發**：**帳戶詳情頁 (AccountDetail)** 可以用「該帳戶的品牌色（accounts.color 欄位）」當整片背景，下半貼兩塊白卡：`USD 現金` / `TWD 現金`（對應 cash_balances map）。這直接呼應你 schema 第 374 行的 `color: "#1E88E5"` 設計。

#### 01_concept_dark_dashboard_chart.png / 02_concept_dark_dashboard_cards.png
- 深色 + 紫藍漸層（圓環圖、進度條）。
- **對我們的啟發**：純概念圖、視覺風格參考用。我們的 MVP **不要做圓環圖**（資產配置在第三階段），但**深色底 + 漸層強調色**的調性可採用。

#### 03_smart_notifications.png
- 鎖屏推播樣式。**MVP 不會做 push**，第二階段以後參考用。

---

### B.2 `transaction_list/`

#### 🏆 01_payup_transaction_list.webp
- 四連畫面，最相關是**第 1 張**：
  - 頂部一張紫色信用卡圖（我們的版本可改成「該帳戶 cash_balances 摘要卡」）
  - 下方 `RECENT TRANSACTIONS` 標題 + 一條一條 row：左是描述、右是金額（紅 = 支出 / 藍 = 收入）。
  - **對我們的啟發**：交易列表的 row 設計：**左（symbol 大字 + 日期/帳戶小字）/ 右（買入↑紅 或 賣出↓綠 + 金額 + 股數小字）**。台股慣例「買入紅、賣出綠」要記得跟美式相反！
- 第 2 張的「invoice 列表（PAID / APPROVED / SUBMITTED 分組）」可參考做**「依日期分組」**：今天 / 昨天 / 本週 / 本月以前。

---

### B.3 `charts_visualization/`

#### 04_dark_mode_crypto_app_tabs.png
- 4 連畫面：splash → login → dashboard（quick actions 4 個 icon）→ chart 詳情頁（柱狀圖）
- **對我們的啟發**：
  - 中央 FAB 按鈕浮在 bottom tabs 上方 → 我們**有在規劃文件 §11.3 列為「不採用」**，但這張圖示範了實作起來其實 OK；可作為未來新增交易高頻入口的備案。
  - 不過 MVP 還是建議照規劃用「Header 右上 `+`」+ 列表底部 FAB 雙入口即可。

---

## C. 套用到我們專案的版面總結

### HoldingsOverview（首頁，最重要）
```
┌─────────────────────────────┐
│  持倉總覽         🔍 🔔     │  ← Header
│                             │
│  NT$ 1,238,540              │  ← 大字總資產
│  ▲ NT$ 88,200 (7.66%) 全期   │  ← 綠色細字
│                             │
│  ╭───────────────────────╮  │
│  │   line chart          │  │  ← 走勢圖（MVP 可先不做，留位置）
│  ╰───────────────────────╯  │
│   1D  1W  1M  3M  YTD  1Y   │  ← time tabs
│                             │
│  ─ 持股 ──── 帳戶 ── 類別 ─  │  ← segmented filter
│                             │
│  [2330] 台積電              │
│   100 股 · 均價 550   ▲ 5.2% │  ← 三段式 row
│   NT$ 65,800                │
│                             │
│  [AAPL] Apple               │
│   ...                       │
│                             │
└──📊─📝─🏦─⚙️─────────────────┘  ← Bottom Tab × 4
```

### AssetDetail
照搬 Robinhood 中圖 + 我們的多幣別 toggle（USD / TWD 切換）。

### TransactionList
PayUp 第 1 張 row 結構，依日期分組 header。

### AccountDetail
Chime 風格：上半 = accounts.color 大色塊 + 帳戶名 + 該帳戶總市值，下半 = 兩張白卡（USD 現金 / TWD 現金）+ 該帳戶持股列表。

### AddTransaction（Bottom Sheet）
不用 modal full-screen，改用底部抽屜（iOS 15+ UISheetPresentationController；RN 用 `@gorhom/bottom-sheet`），用 react-hook-form + zod 驗證。

---

## D. 來源網站

| 來源 | URL |
|---|---|
| Eleken — Fintech UX Best Practices 2026 | https://www.eleken.co/blog-posts/fintech-ux-best-practices |
| ProCreator — Finance App Design Strategies 2026 | https://procreator.design/blog/finance-app-design-best-practices/ |
| Muz.li — Mobile App UI Patterns 2026 | https://muz.li/blog/whats-changing-in-mobile-app-design-ui-patterns-that-matter-in-2026/ |
| Dribbble — Portfolio Tracker 標籤頁 | https://dribbble.com/tags/portfolio-tracker |
| Mobbin — iOS Finance Apps | https://mobbin.com/browse/ios/apps?filter.appCategoryIds=finance |

> Mobbin 是看「上架 App 真實畫面 + 完整 user flow」最強的站，**強烈建議** Sean 個人去申請看 Robinhood / Revolut / Schwab / Public.com 的完整 flow，比這份歸納更深入。
