# planning.md 同步清單（待回填）

> 設計階段已定案、但 `docs/portfolio_tracker_planning.md` 尚未反映的決策。
> 建議逐條更新對應章節。產出日期：2026-06-14。

## A. 本次新增（Auth）

### §11 AuthStack — 已設計定稿
- 畫面：`SplashGate → SignIn ⇄ SignUp ⇄ ForgotPassword(→寄信成功)`；登入/註冊成功 → `MainTabs`；登出 → 回 `SignIn`。
- 欄位：Email + 密碼（最精簡）；註冊＝登入同欄位。Google 登入按鈕（SignIn/SignUp 皆有）。
- 狀態：inline 驗證、auth 錯誤橫幅、按鈕 loading、忘記密碼寄信成功、Splash gate（擋 auth 閃現）、登出 confirm。
- 視覺：方向 A「錨定置中」＋ 款 2「圓環錨點」標誌（accent 跟隨主題色，全 app 共用）。
- 實作對照：見 `docs/design/auth-flow/auth-flow-spec.md` §7。
- 註冊成功建立 `users/{uid}`。錯誤碼對照沿用 §14.3 規劃。

## B. 先前已定、仍待回填的決策

### §11 導航樹
- 底部 4 tab 改為 **持倉 / 交易 / 分析 / 設定**。
- **帳戶管理** 從獨立 tab **降為「設定」子頁**。
- **新增「分析」tab**（取代原帳戶 tab 位置）。

### §11.3 交易頁
- 新增交易入口改 **FAB-only**，**移除 header ＋** 的雙入口設計。
- （持倉頁仍維持 header ＋ 作為新增入口。）

### 帳戶識別色回歸
- schema 的 `color` 欄位**保留並啟用於 UI**：帳戶列表圓標 + 帳戶詳情頁頂部光暈。
- 修訂 holdings 早期「不用帳戶色」的 D3 決策。

### 分析頁幣別
- 改 **TWD / USD 全頁可切換**（非早期「統一換 USD」）。
- 內部以 TWD 為基準，經換算顯示；demo 匯率 1 USD = 30.95 TWD。

## C. 多幣別 FX 模型（model B，已同步進 planning §5/§6 + ADR-0005）

> Sprint 4 翻案：交易改為**單幣別事件**、匯率抽離為每日表、只在顯示時換算。planning §5/§6 與 ADR-0005 已落地，本設計包文字亦已對齊（移除「交易輸入時換算 USD」「逐筆多幣別換算卡」）。

- 交易只記市場原幣別（台股 TWD、美股 USD）；**不**在新增交易時換算、**不**存對稱 amounts map。
- 跨幣別合計只在持倉總覽「總成本(TWD)」、分析頁、AssetDetail 切換時以**最新匯率**即時換算（顯示層、不落地）。
- 不追蹤匯率損益、不存每筆交易的歷史台幣值。
- 設計檔對應修訂：holdings-overview-spec §3.3（移除下方換算 USD）、transactions-page-spec T6（移除多幣別換算卡）、`aa-screens.jsx` / `aa-v2-txn.jsx` 原型同步。

---

最新整合原型：`docs/design/app-prototype/`（standalone 雙擊即開）。
