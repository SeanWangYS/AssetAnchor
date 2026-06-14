# 📍 START HERE — 資料夾導覽（給人與 AI agent）

> AssetAnchor 設計交付包 `docs/design/`。最後更新：2026-06-14。
> **單看資料夾名稱容易混淆，請先讀這份。**

---

## ⭐ 最終、唯一要看的 mock app

```
app-prototype/
```

**這是目前唯一持續更新的「整合版」原型，包含全部已定稿畫面。**
要看 app 長怎樣、要接續設計 → 一律以這個資料夾為準。其他頁面資料夾都是歷史，內容已併入此處。

- **想直接看畫面**：雙擊 `app-prototype/AssetAnchor-app.standalone.html`（單檔、離線可開、無需伺服器）。啟動會落在登入頁。
- **想改原始碼**：進 `app-prototype/prototype/`，先讀該資料夾的 `README.md`（有完整的檔案載入順序與架構說明）。

涵蓋流程：Auth（登入/註冊/忘記密碼/Splash/登出）→ 持倉總覽 + 資產詳情 → 交易紀錄（時間軸）→ 分析頁 → 設定 → 帳戶管理。底部 4 tab：持倉 / 交易 / 分析 / 設定。

---

## 🗂 為什麼有那麼多資料夾？

每個「產品畫面」當初是**獨立設計、各自定稿**的（各有 spec + 自己的 standalone 原型），最後才**全部整合**進 `app-prototype/`。
所以：**單頁資料夾 = 該畫面的設計依據（spec）＋ 歷史獨立原型；`app-prototype/` = 它們合體後的成品。**

如果單頁原型和 `app-prototype/` 有出入，**以 `app-prototype/` 為準**。

---

## 📁 完整資料夾清單與用途

| 資料夾 / 檔案 | 用途 | 對之後的 agent |
|---|---|---|
| **`_READ-ME-FIRST.md`** | 👈 你正在看的這份導覽 | 最先讀 |
| **`README.md`** | 設計總覽：視覺系統、各畫面狀態表、導航摘要 | 讀完導覽接著讀這份拿全局 |
| **`_planning-sync-notes.md`** | 設計階段已定案、但 `portfolio_tracker_planning.md` 尚未回填的決策清單 | 回填規劃文件時用 |
| **`app-prototype/`** | ⭐ **最終整合版 app（唯一現行原型）** | **所有後續工作的起點** |
| &nbsp;&nbsp;`app-prototype/AssetAnchor-app.standalone.html` | 離線單檔，雙擊即看完整 app | 給人預覽 |
| &nbsp;&nbsp;`app-prototype/prototype/` | 可編輯原始碼（多個 `.jsx` + `index.html`），內含 `README.md` 架構說明 | 改 code 從這裡 |
| **`auth-flow/`** | Auth 流程**設計依據**：`auth-flow-spec.md`（畫面/狀態/驗證/Firebase 對照） | 改 auth 先讀 spec |
| &nbsp;&nbsp;`auth-flow/exploration/` | 早期「SignIn 3 視覺方向 + 3 款 logo」並排比較（已選 方向A＋款2） | 歷史，理解選型用 |
| **`holdings-overview/`** | 持倉總覽 + 資產詳情的 **spec + 獨立原型**（已併入 app-prototype） | 改持倉先讀 spec |
| **`analysis-page/`** | 分析頁的 **plan + spec + 獨立原型**（已併入 app-prototype） | 改分析先讀 spec |
| **`transactions-page/`** | 交易紀錄的 **spec + 版型探索**（已併入 app-prototype） | 改交易先讀 spec |
| **`accounts-management/`** | 帳戶管理的 **spec + 獨立原型**（已併入 app-prototype） | 改帳戶先讀 spec |

> 各單頁資料夾內的命名慣例：
> - `*-spec.md` ＝ 該畫面的設計規格（**權威設計依據**，要改畫面先讀它）
> - `*-plan.md` ＝ 設計前的規劃筆記（次要）
> - `prototype/` ＝ 該畫面當初的獨立可編輯原始碼（**歷史**，現以 app-prototype 為準）
> - `exploration/` ＝ 早期多方向比較 / 版型探索（**歷史**）
> - `*.standalone.html` ＝ 該畫面的離線單檔預覽

---

## 🎨 視覺系統速記（細節見 `README.md`）

Dark-first、藍紫主調 accent `#7C6CF0`、Nunito 圓潤數字（tabular-nums）+ Noto Sans TC、8px 網格。
漲跌＝綠漲 `#2FD37E` 紅跌 `#FF5E62`；買/賣各自漸層。帳戶識別色已啟用。
技術：單一 HTML + React 18.3.1 + Babel standalone，多個 `.jsx` 經 `window` 互通（載入順序見 `app-prototype/prototype/README.md`）。

---

## ✅ 已完成 / ⬜ 尚缺（截至 2026-06-14）

**已完成**：Auth · 持倉總覽 + 資產詳情 · 交易紀錄 + 交易詳情 · 帳戶管理（列表/詳情/新增/inline 現金）· 分析頁 · 設定入口骨架。

**尚缺的主畫面**（MVP 範圍）：
1. 顯示偏好頁（幣別 TWD/USD、主題）　2. 個人資料編輯頁　3. 關於頁　4. 該帳戶交易列表
5. 股票代號搜尋頁　6. 帳戶選擇 picker　7. 日期選擇器　8. 券商/類型選單
＋ 首次使用引導、Loading skeleton、離線/抓取失敗態。

（第二/三階段：報表 tab、CSV 匯入、配息交易類型 — 規劃明列為未來。）
