# planning.md 同步清單（已退役 — 歷史存底）

> **此文件已退役（tombstone）。** 原本列的「待回填」設計決策，已於 `align-to-design-package` change（**ADR-0008**：設計包為產品最高權威）全數回填進 `docs/portfolio_tracker_planning.md` **§11 主導航結構**（含 §2 核心決策表、§13.2 / §13.5 ADR 註記、版本歷史 v2.4）。
>
> 回填涵蓋：
>
> - 底部 4 tab 改為 **持倉 / 交易 / 分析 / 設定**；**帳戶管理由獨立 tab 降為「設定」子頁**；新增「分析」tab。
> - 交易頁新增交易改 **FAB-only**（持倉頁保留 header ＋ 為唯一例外）。
> - **帳戶識別色回歸**（`color` 欄位啟用於帳戶列表圓標 + 帳戶詳情頁頂部光暈）。
> - **分析頁 TWD / USD 全頁可切換**（取代早期「統一換 USD」；demo 匯率 1 USD = 30.95 TWD）。
> - **AuthStack 定稿**：`SplashGate → SignIn ⇄ SignUp ⇄ ForgotPassword(→寄信成功)`；Email + 密碼 + Google 登入鈕；inline 驗證 + auth 錯誤橫幅 + 按鈕 loading + 登出 confirm；註冊成功建立 `users/{uid}`。
> - 多幣別 FX 模型（Model B）先前已同步進 planning §5/§6 + ADR-0005。
>
> 各畫面像素級細節仍以對應 `docs/design/<feature>/*-spec.md` 為準；整合原型見 `docs/design/app-prototype/`。本檔僅保留作為歷史脈絡，**不再是任何決策的事實來源**。
