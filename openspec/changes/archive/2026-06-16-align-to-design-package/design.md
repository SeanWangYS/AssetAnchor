# Design — align-to-design-package

> 設計權威來源：`docs/design/`（衝突時以整合原型 `app-prototype/` 為準，`_READ-ME-FIRST.md:29`）。
> 本文件是本 change 的**單一工作契約**：把設計稿收斂成可實作參照並記錄關鍵決策。各畫面像素級細節仍以對應 `docs/design/<feature>/*-spec.md` 為準；本文件給的是跨畫面、各 sub-agent 都需要的共用真理。

## 0. 關鍵決策

| #   | 決策                                 | 說明                                                                                                                                                         |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | **設計包＝產品最高權威（ADR-0008）** | 衝突時設計贏；planning / ADR / code 全部對齊。唯一但書：金額儲存精度交給 `Money`/decimal.js（設計稿自陳數字僅顯示層示意，`holdings-overview-spec.md:181`）。 |
| D2  | 舊 sprint 計劃**直接刪除**           | sprint-0/1 plan + sprint-1 design spec（已被取代、無 live 引用）；git 留底。owner 拍板。                                                                     |
| D3  | 買/賣色**以 spec 為準**              | prototype `aa-core.jsx:18-19` token 寫「買紅賣綠」為誤；spec（holdings §2.2 / txn T2 / README）＝**買 紫→洋紅、賣 藍→青**。                                  |
| D4  | **theme 重寫是所有畫面的前置閘門**   | 現 `core/theme` 是 light-mode 佔位；WP-0 最先做、單獨做，否則畫面全錯。                                                                                      |
| D5  | 圖表**用 `react-native-svg` 自繪**   | 不引第三方圖表庫；對齊 prototype 的 Donut / DualBar / HBar 簽章。                                                                                            |

## 1. 權威導航樹（capability `navigation`）

底部 tab **恰好 4 個：`持倉 / 交易 / 分析 / 設定`**（`README.md:22`、`analysis-page-spec.md:70` D9）。

- **持倉 Holdings**（落地 tab）：HoldingsOverview（B 儀表板）→ push AssetDetail（全屏）→ push 個股完整交易歷史。新增交易入口 = **header ＋**（持倉是唯一保留 header ＋ 的 tab）。
- **交易 Transactions**：TransactionList（時間軸）→ push TransactionDetail（檢視/編輯/刪除）。新增交易入口 = **FAB only，無 header ＋**（`transactions-page-spec.md:38` T4）。
- **分析 Analysis**：單頁垂直捲動，hero + 5 圖表卡，refresh 圓鈕→toast，靜態無 drill-down。
- **設定 Settings**：分組清單「帳戶（帳戶管理/現金）／偏好（顯示偏好/個人資料）／其他（關於）」+ 我的帳號 card + 破壞性「登出」。

**帳戶不是 tab**：帳戶管理降為設定子頁（設定 → 帳戶管理）。AccountList → AccountDetail（帳戶色光暈）→〔AccountTransactions＝缺〕。新增帳戶 = **FAB**。

**Auth（tab 外）**：`SplashGate → SignIn ⇄ SignUp ⇄ ForgotPassword(→寄信成功)`；登入/註冊成功 → MainTabs（落地持倉）；設定登出 → confirm → SignIn（`auth-flow-spec.md:20-28`）。SignIn 有 demo「略過登入」捷徑（正式版移除）。

**Modal / bottom sheet**：AddTransaction sheet（持倉 header ＋ / AssetDetail「為此標的新增交易」帶入 symbol+account+均價 / 交易 FAB）；EditTransaction = 同 sheet 帶值、標題改「編輯交易」；AddAccount/EditAccount 共用表單 sheet；期間篩選 sheet（全部/本月/近三月/今年 + 自訂）；ConfirmDialog（置中、破壞性紅）。

## 2. 畫面清單

**已在原型（retrofit 對象）**：SplashGate, SignIn, SignUp, ForgotPassword(+寄信成功), HoldingsOverview, AssetDetail, AddTransaction(sheet), EditTransaction, TransactionList, TransactionDetail, 個股完整交易歷史, 期間篩選 sheet, AnalysisOverview, Settings(骨架), AccountList(+停用區), AccountDetail, Add/EditAccount(sheet), ConfirmDialog, EmptyState。

**缺（本 change 要補）**：① 顯示偏好(幣別TWD/USD+主題) ② 個人資料編輯 ③ 關於 ④ 該帳戶交易列表 ⑤ 股票代號搜尋 ⑥ 帳戶選擇 picker ⑦ 日期選擇器 ⑧ 券商/類型選單 ＋ 首次引導、Loading skeleton、離線/抓取失敗態。

## 3. Design Tokens（`core/theme` 要編碼；值必須精確）

**底色 / 文字 / 線**（`holdings-overview-spec.md:41-52`）：頁底 `#0A0C10`、畫面底 `#0E1117`（頂部極淡 accent 光暈）；文字主 `rgba(255,255,255,.95)`／次 `.62`／弱 `.42`／極弱 `.26`；分隔線/卡邊 `rgba(255,255,255,.09)`。

**Accent（預設 `#7C6CF0`）**，Tweaks 可選 `#4C6FE8` / `#6C6CF0` / `#7C6CF0` / `#A368F0`。

**色系 1 — 漲跌（語意盈虧；用於 ▲▼ 數字、圖表正負）**：漲綠 `#2FD37E`、跌紅 `#FF5E62`（驗證錯誤色也用 `#FF5E62`）。

**色系 2 — 買/賣漸層（與色系 1 獨立；非台股紅綠）**：買 `linear-gradient(135deg,#7C5CE6,#C24FD6)`（紫→洋紅）、賣 `linear-gradient(135deg,#2E74E6,#35C6EA)`（藍→青）。交易列表膠囊同此。

**圖表類別色**：個股 = accent `#7C6CF0`、ETF = `#35C6EA`。

**字型**：數字/拉丁 = **Nunito**（500–900，全部 `tabular-nums`，以 `.num`/`--num-font` 套用）；中文 = **Noto Sans TC**（400–800）。UI 字串純繁中、不做 i18n。

**間距 8px 網格**：頁面左右 padding 20、卡內 13–16。**圓角**：手機畫面 42 / 卡片 16–18 / sheet 頂 26 / 圓鈕 50% / 膠囊 100。

**fintech 層次（克制、Tweaks 可關光暈）**：卡片 = `linear-gradient(160deg,rgba(255,255,255,.055),rgba(255,255,255,.022))` + 1px 邊 + 柔外陰影 + 頂部 1px 內高光；強調卡（總報酬率/計算預覽/donut）帶 accent 光暈。

## 4. 元件清單（`core/ui` 要提供）

現有 4 個：`Button`（補 gradient variant + loading）、`Input`、`ListItem`（`List.tsx`，有 colorDot/dimmed）、`Sheet`。

**要新增**：`Card`(glow variant)、`Segmented`（持股/帳戶/類別、TWD/USD、買/賣）、`TimeTabs`（持倉 1M/3M/YTD/1Y/ALL；AssetDetail 1D/1W/1M/3M/1Y/ALL）、`Avatar`/代號圓標（漸層底 + 帳戶識別色）、`Pnl`（▲▼ + 值，漲跌色）、`Fab`、`ConfirmDialog`（破壞性）、`EmptyState`、`Toast`、品牌組件 `AALogoMark`/`AAWordmark`/`AABrandLockup`（圓環錨點，accent 隨主題）、`CashBalanceCard`（inline 編輯、雙幣別欄、快照時間）、色票 ×6（帳戶識別色選擇）、`core/ui/charts/{Chart(sparkline),Donut,DualBar,HBar}`（react-native-svg）。

**純函式**：`aNice()`（nice-number 軸刻度）→ 放 `packages/shared`，可單元測試（`analysis-page-spec.md:102`）。

## 5. 跨領域顯示規則

- **多幣別 = Model B / ADR-0005**：交易只記市場原幣別（台股 TWD、美股 USD）；不在輸入時換算、不存對稱 amounts map、不追蹤匯率損益。跨幣別合計只在顯示時以最新匯率即時換算（持倉「總成本(TWD)」、分析頁、AssetDetail 切換），不落地。
- **demo 匯率 1 USD = 30.95 TWD**（mock 寫死處）；實際換算讀最新 `exchange_rates`。
- **數字格式**：正 ▲ / 負 ▼；前綴 `NT$`(TWD) / `US$`(USD)；百分比帶正負號（`+7.66%`）；全部 `tabular-nums`。
- **報酬率公式** `(市值 − 成本) / 成本`，不含已實現/配息（對齊 MVP）。
- **Money 精度交給 decimal.js**：原型數字僅示意，實作一律 `Money`，禁 native float。
- **密碼 ≥ 6 字**（Firebase）；email regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`。

## 6. 設計包內部矛盾修正清單（Phase 2 要修，file:line）

1. `holdings-overview-spec.md:105`（§3.1 item 8）底部 tab 仍寫舊「持倉/交易/帳戶/設定」→ 改 分析。**（最關鍵）**
2. `holdings-overview-spec.md` §3.2/§4 未交叉引用 FAB-only 決策（持倉 header ＋ 正確，但讀者孤讀會誤會交易/帳戶也是 header ＋）→ 補註。
3. `analysis-page-plan.md:11,64` 寫「統一換算 USD」→ 已被 spec D2（TWD/USD 切換）取代；標 superseded。
4. `analysis-page-plan.md:50` 年化報酬率列為核心圖 → 已被 spec D4（延後）取代；標 superseded。
5. `analysis-page-plan.md:36` 圓餅＝每標的佔比 → 已被 spec D3（圓餅＝資產類別）取代；標 superseded。
6. `README.md:18` vs `_READ-ME-FIRST.md:14` 對 `analysis-page/prototype/` 描述措辭不一致 → 統一為 app-prototype 為準。
7. `holdings-overview-spec.md:11,17,160`（D3「移除帳戶顏色圓點」）→ 帳戶識別色已回歸（accounts A1 / sync-notes）；註明此 D3 僅適用持倉清單本身，帳戶處已反轉。
8. `README.md:11` 狀態表標「✅ v1 定稿」但未標 ~11 缺畫面 → 補缺畫面註記。

## 7. RN 落點 / Phase 切割（capability 對應 `apps/mobile`）

對齊 planning §12 feature-based（`features/* → core/* | services/* | packages/shared`；features 之間不互 import）。

- **WP-0 design-system 基底（序列、最先、單獨）**：`core/theme` dark-first 重寫 + §3 tokens；`core/ui` 補 §4 元件 + `charts/`；`packages/shared` `aNice()`（TDD）；`expo-font` 載入 Nunito/Noto。**阻擋全部後續。**
- **WP-NAV（序列、第二）**：改 `MainTabs.tsx`（4 tab：持倉/交易/分析/設定 + tabBarIcon 1.8 stroke）、`types.ts`（新 `MainTabsParamList` + `AnalysisStackParamList` + `SettingsStackParamList`、移除 Accounts tab）、`RootStack.tsx`、`RootNavigator.tsx`（SplashGate）；新建 `features/analysis/AnalysisStack`、`features/settings/SettingsStack`（掛入 AccountsStack 子頁）、`features/transactions/TransactionsStack`；交易/帳戶移除 header ＋ 改 FAB。**觸碰共用 nav 檔，須序列化。**
- **WP-A~F（畫面，worktree 隔離平行；各動自己 `features/<x>/` + 消費 `core/`）**：
  - WP-A holdings：Overview(L) + AssetDetail(L) + AssetTransactions(M)
  - WP-B transactions：List(L) + Detail(M) + Add/Edit 表單(M) + 期間篩選 sheet(M)
  - WP-C analysis（全新）：AnalysisOverview(L) + charts（與 WP-0 協調，charts 歸 WP-0）
  - WP-D accounts：List(M) + Detail+CashCard(M) + Add/Edit(S)
  - WP-E settings：分組清單(M) + 顯示偏好/個資/關於(S×3)〔依賴 WP-NAV + WP-D 共用 AccountsStack〕
  - WP-F auth：SignIn(L) + SignUp(M) + ForgotPassword(S) + SplashGate〔SplashGate 動 RootNavigator，歸 WP-NAV〕

**相依**：WP-0 → WP-NAV → {WP-A, WP-B, WP-D, WP-F} 平行；WP-C 不可與 WP-0 搶 `core/ui/charts`；WP-E 依 WP-D + WP-NAV。
