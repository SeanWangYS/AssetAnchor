# App Prototype — 整合版原始碼（2026-06-14）

涵蓋：**Auth 流程（登入/註冊/忘記密碼）**＋ 持倉總覽流程（v1 定稿）＋ 分析頁 ＋ 交易紀錄（時間軸 B，含個股完整交易歷史）＋ 設定 → 帳戶管理（含 inline 現金編輯、重新啟用）＋ confirm dialog 與空狀態 ＋ 新導航（持倉/交易/分析/設定）。

啟動流程：**Splash gate（擋 auth 閃現）→ SignIn → 登入成功進 MainTabs（落地持倉）→ 設定頁登出回 SignIn**。

## 如何開啟

- 雙擊 `index.html`（需網路：React/Babel/字體自 CDN）。
- 離線單檔版：上層 `AssetAnchor-app.standalone.html`。

## 檔案與載入順序（後者依賴前者的 window 匯出）

| 順序 | 檔案 | 內容 |
|---|---|---|
| 1 | `tweaks-panel.jsx` | Tweaks 面板基礎建設 |
| 2 | `aa-core.jsx` | tokens（`T`）、持股/帳戶 mock（`HOLD`/`ACCT`/`SUM`）、共用構件 |
| 3 | `aa-ui-bits.jsx` | ConfirmDialog（含單鈕提示型）、EmptyState |
| 4 | `aa-auth.jsx` | **Auth：款 2 圓環錨點標誌（`AALogoMark`/`AAWordmark`/`AABrandLockup`）、表單小件、SplashGate、SignIn/SignUp/ForgotPassword、`AuthFlow`** |
| 5 | `aa-analysis-charts.jsx` | 分析衍生資料 + 圖表構件（donut/雙柱/橫條）+ `aNice` |
| 6 | `aa-analysis-page.jsx` | 分析頁畫面 |
| 7 | `aa-txn-data.jsx` | 交易 mock（`TXNS`/`TX_MONTHS`）、買賣膠囊、FAB |
| 8 | `aa-accounts-screens.jsx` | 帳戶資料衍生（`ACC_LIST`）、monogram/Kv/row（canvas 與整合版共用） |
| 9 | `aa-v2-txn.jsx` | 交易 tab：時間軸列表、交易詳情、日期篩選 sheet、個股交易歷史 |
| 10 | `aa-v2-accounts.jsx` | 帳戶列表/詳情（inline 現金編輯、停用/刪除/重新啟用）/新增帳戶 sheet |
| 11 | `aa-screens-v2.jsx` | App 主體：**auth 閘門（booting/authed/userEmail）**、TabBar、首頁、資產詳情、新增/編輯交易 sheet、設定頁（含帳號卡＋登出）、confirm/狀態接線、Tweaks |

## Auth 流程（Sprint 1 / planning §11 AuthStack）

- **視覺定稿**：方向 A「錨定置中」＋ 款 2「圓環錨點」標誌（accent 跟隨 Tweaks 強調色）。
- **欄位**：Email + 密碼（最精簡）；註冊 = 登入相同欄位。Google 按鈕在 SignIn/SignUp 皆有。
- **狀態**：inline 欄位驗證（email 格式、密碼 ≥6）、表單層級 auth 錯誤橫幅、按鈕 loading spinner、忘記密碼寄信成功畫面、啟動 Splash gate、登出 confirm → 回 SignIn。
- **共用標誌**：Splash / SignIn / 設定「我的帳號」卡片皆用 `AALogoMark`；外框 app 標頭亦改用標誌（取代舊 ⚓ emoji）。
- **可跳過登入**：SignIn 底部「略過登入，直接看 Demo →」直接進 MainTabs（demo 用）。

### Demo 觸發（純前端模擬，無真後端 — 真實版接 Firebase Auth）

| 操作 | 觸發條件 | 結果 |
|---|---|---|
| 登入 | email 含 `wrong`（如 `wrong@demo.com`） | 顯示「電子郵件或密碼錯誤」 |
| 註冊 | email 含 `taken`（如 `taken@demo.com`） | 顯示「此電子郵件已被註冊」 |
| 其餘有效輸入 | — | ~1.1s 按鈕 loading 後成功 |

> 真實實作：以上錯誤對照 Firebase `auth/wrong-password`・`auth/user-not-found`・`auth/email-already-in-use`；planning §14.3 提到「`auth.ts` 錯誤訊息對照表可抄」。

## 重要慣例

- 金額：分析頁以 TWD 為內部基準經 `aCv()/fA()` 換算；交易/帳戶顯示原幣別。demo 匯率 30.95。
- 買/賣漸層：買 `#7C5CE6→#C24FD6`、賣 `#2E74E6→#35C6EA`（`TX_GRAD`）。
- 新增入口：FAB（交易、帳戶管理頁）；持倉頁維持 header ＋。
- Tweaks：強調色／甜甜圈⇄圓餅／光暈／帳戶色／漲跌紅綠。
- mock 微調：00878 市值 20,800（虧損示範）；交易 12 筆含 3 筆賣出。
