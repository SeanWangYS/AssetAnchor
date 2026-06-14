# 個人投資組合追蹤 App — 開發規劃文件

> **文件用途**：本文件記錄開發前的完整規劃決策，作為後續 AI 協作的 context 交接文件。
> 新的 chat session 開始時，請將本文件附上，AI 即可接手開發討論而無需從頭講起。
>
> **文件版本**：v2.3.1
> **最後更新**：2026-05-23
> **規劃狀態**：
> - 議題 1–7 全部收斂，進入實作階段
> - Sprint 路線圖見 §13，舊專案資產複用策略見 §14
> - 開發過程中需追加處理的 schema 細項見 §9（Q11–Q13）
> - **專案命名**：v2.3.1 起新專案正式定名為 `AssetAnchor`（取代舊代號 `finance_app`），舊專案資料夾改名為 `AssetAnchor_old`

---

## 目錄

1. [專案願景與定位](#1-專案願景與定位)
2. [核心決策摘要](#2-核心決策摘要)
3. [MVP 功能範圍與路線圖](#3-mvp-功能範圍與路線圖)
4. [報酬計算邏輯](#4-報酬計算邏輯)
5. [多幣別處理](#5-多幣別處理)
6. [Firestore Schema 完整設計](#6-firestore-schema-完整設計)
7. [Security Rules](#7-security-rules)
8. [Composite Indexes](#8-composite-indexes)
9. [待確認議題清單](#9-待確認議題清單)
10. [規劃完成度](#10-規劃完成度)
11. [主導航結構（議題 4 收斂）](#11-主導航結構議題-4-收斂)
12. [專案骨架（議題 6 收斂）](#12-專案骨架議題-6-收斂)
13. [Sprint 路線圖（議題 7 收斂）](#13-sprint-路線圖議題-7-收斂)
14. [舊專案資產複用策略](#14-舊專案資產複用策略)

---

## 1. 專案願景與定位

### 願景
**整合個人投資者落在不同地方的資產**，提供統一的投資組合追蹤與分析工具。

### 開發者背景
- 開發者本身為**數據工程師**，業餘時間獨立開發
- 沒有 iOS 開發經驗，但有軟體開發背景
- 工作熟悉 AWS（Kinesis, Lambda, S3, Glue, Athena, RDS, Airflow, Redash）

### 開發目標
1. **首要目標**：解決自己生活上的需求（自用）
2. **次要目標**：給朋友/家人小範圍使用
3. **長期目標**：若產品好用則開源分享、上架至 iOS App Store

### 使用者情境（User Profile）
- 小資族 ETF + 個股投資者
- 跨多個券商（Firstrade、Interactive Brokers、moomoo、群益證券等）
- 同時有台股和美股部位
- 都是零股交易（小額、定期定額）

### 沒有上架時間壓力
可以慢慢做、把架構做乾淨、可學習、可開源。

---

## 2. 核心決策摘要

| 項目 | 決策 |
|---|---|
| **平台** | iOS + Android 跨平台 |
| **前端框架** | React Native + Expo |
| **後端** | Firebase（Firestore + Auth + Cloud Functions） |
| **市場範圍** | 台股 + 美股（未來可擴充加密貨幣等） |
| **資產類型** | STOCK / ETF（MVP），CRYPTO/BOND/MUTUAL_FUND 預留 |
| **使用者隔離** | Firestore subcollection 模式（每個 user 獨立樹） |
| **數值精度** | decimal.js + Firestore string 儲存（小數第 10 位精度，顯示第 2 位） |
| **多幣別策略** | 每筆交易記錄多幣別換算（用 JSON map 結構） |
| **匯率資料** | 自建 Cloud Function + Firestore 快取，主源台銀 |
| **券商欄位** | 升級為獨立 `accounts` collection，broker 為 enum |
| **現金追蹤** | MVP 用 account 層級 snapshot 欄位（cash_balances） |
| **持倉計算** | MVP 不存 holdings 表，從 transactions 動態計算 |
| **資料模型** | event sourcing 模式（transactions 為事件流） |
| **報價資料源** | Yahoo Finance（透過 `yahoo-finance2` npm + QuoteProvider plug-in 介面） |
| **報價抓取模式** | On-demand + 雙層 cache (15min TTL, MMKV + Firestore) |
| **匯率策略** | Lazy + Permanent Date Cache（無 cron、被動觸發、永久 cache） |
| **MVP 幣別範圍** | 只 USD ↔ TWD（schema 預留多幣別） |
| **Symbol 補完** | 動態建立 + 從 Yahoo `quoteSummary` 補 metadata |
| **跨平台框架** | Expo Dev Build + EAS Build |
| **Firestore SDK** | @react-native-firebase（native module） |
| **狀態管理** | Zustand |
| **表單** | react-hook-form + zod 驗證 |
| **TypeScript** | strict + noUncheckedIndexedAccess |
| **decimal.js 整合** | Money wrapper class（型別安全、不同幣別不能直接相加） |
| **i18n** | MVP 不做、純繁中 hard-code（字串集中於 i18n/zh-TW.ts，未來易轉） |
| **導航** | React Navigation v7：Root Stack（Auth ↔ MainTabs ↔ Modals）+ Bottom Tabs × 4（持倉/交易/帳戶/設定）+ 每 tab 內 native-stack |
| **Repo 結構** | Monorepo（pnpm workspaces）：`apps/mobile`、`apps/functions`、`packages/shared`、`firebase/`、`docs/` |
| **模組劃分** | apps/mobile 採 feature-based：`features/*` + `core/*` + `services/*` + `i18n/` |
| **License** | MIT |
| **Commit 規範** | Conventional Commits + commitlint（commit-msg hook 強制） |
| **CI** | GitHub Actions：PR 觸發 lint + typecheck + test（MVP 不做 CD） |
| **Branch 策略** | Trunk-based：main 受保護、`feature/*` PR-only merge |
| **程式碼品質工具** | ESLint + Prettier + Husky + lint-staged + Jest |

---

## 3. MVP 功能範圍與路線圖

### 🟢 MVP（第一階段）— 必備功能

**MVP 驗收標準**：能夠正確計算每隻股票/ETF 的現貨價值、成本、報酬率。

#### 交易紀錄管理
- 新增買入交易（含手續費、交易稅，零股支援）
- 新增賣出交易（自動計算已實現損益）
- 編輯 / 刪除交易
- 交易列表（依日期排序、依股票分組）

#### 持倉檢視
- 目前持有資產清單（股票 + ETF）
- 每檔顯示：持有股數、平均成本、現價、未實現損益（金額 + %）
- 個別資產詳情頁（可切換顯示幣別）
- 各帳戶（broker）的部位檢視

#### 帳戶管理
- 新增 / 編輯券商帳戶（Firstrade、IB、moomoo、群益等）
- 帳戶層級的現金餘額手動輸入
- 帳戶啟用/停用、顏色標記、排序

#### 股價資料
- **On-demand 抓取**：使用者打開「持倉總覽頁」或「個別資產詳情頁」時觸發
- **雙層 cache**：App 本機 (MMKV) + Firestore `quotes/{symbol}`（多使用者共用）
- **Cache TTL**：15 分鐘（對齊 Yahoo Finance 延遲）
- **手動下拉刷新**：總覽頁 + 詳情頁皆有，強制突破 TTL
- 抓取範圍：**只抓目前有持倉的股票**（從 transactions 動態推導）
- Pre-market / After-hours：**不支援**，只取 regular hours
- 不啟用 cron 主動抓取

#### 多幣別顯示
- 台股部位（TWD）/ 美股部位（USD）分開顯示
- 每筆交易自動換算另一幣別並儲存（用交易日匯率）
- 個別資產表格可切換幣別檢視
- **MVP 不做**：統一換算總資產

#### 帳號系統
- Firebase Auth：Email + 密碼
- 多裝置雲端同步

#### 智慧化輔助
- 股票代號自動補完（從使用者歷史 + symbols collection）
- 「複製上一筆」快捷
- MVP 階段先 seed 開發者自己會用到的股票清單

### 🟡 第二階段 — 核心功能完整化

- **配息紀錄**：現金股利、股票股利
- **股票分割 / 反分割 / 減資**處理
- **總報酬率、年化報酬率**（個股 / ETF / 整體）
- **TWR（時間加權報酬率）**
- **單一資產的歷史完整視圖**（從第一筆買入到現在的全週期）
- **CSV 匯入**：從券商匯入歷史交易（優先 Firstrade、IB、群益、moomoo）
- **匯率多來源 fallback**（exchangerate.host、Yahoo 備援）
- **每日資產走勢圖**（需建立 daily_snapshots collection）

### 🔵 第三階段 — 進階分析

- **跟大盤比較**（vs 0050、vs S&P 500）
- **資產配置圖**（圓餅圖、產業分布、跨資產類型百分比）
- **IRR / 金錢加權報酬**
- **稅務報告**（已實現損益年度匯總）
- **加密貨幣支援**（schema 已預留）
- **券商 API 直接整合**（IBKR API、moomoo OpenAPI 等）
- **Apple Sign-In**（要上架時必備）
- **iOS Widget**（首頁小工具看資產）
- **OCR 拍對帳單**

---

## 4. 報酬計算邏輯

### MVP 階段算法

#### 未實現損益（持有中）
```
未實現損益金額 = (現價 - 平均成本) × 持有股數
未實現損益 % = (現價 - 平均成本) / 平均成本 × 100%
```

#### 已實現損益（賣出時）
```
已實現損益 = (賣出單價 - 平均成本) × 賣出股數 - 賣出手續費 - 賣出交易稅
```

### 平均成本：加權平均法（Weighted Average Cost）

#### 計算範例
```
分三次買進台積電：
  第1次：買 1000 股 @ 500 元，手續費 700
  第2次：買 1000 股 @ 600 元，手續費 800
  第3次：買  500 股 @ 550 元，手續費 400

總成本 = 1000×500 + 1000×600 + 500×550 + 700 + 800 + 400 = 1,376,900
總股數 = 2,500
平均成本 = 1,376,900 / 2,500 = 550.76 元/股
```

**重要原則：手續費算進成本基礎**。

#### 賣出時的處理
- 賣出時**平均成本不變**（加權平均法特性）
- 剩餘股數 = 原股數 − 賣出股數
- 已實現損益依公式計算

#### Firstrade 等零手續費券商
公式天然支援 fee = 0 的情境，不需特殊處理。
注意美股賣出有極小的 SEC fee 和 TAF fee，仍要記錄。

### 賣出歸零後重買：視為新持有週期

```
Day 1：買 1000 股 @ 500
Day 2：全部賣出 1000 股 @ 600 → 已實現損益入帳，持倉歸零
Day 3：又買 500 股 @ 550 → 平均成本重新計算 = 550（不累加歷史）
```

未來計算「個股年化報酬率」時，此原則會影響「持有週期」的定義 — schema 已預留 lot_id 與相關設計空間。

### 數值精度處理

- **必須使用 decimal.js**，不使用 native float
- Firestore 用 **string** 型別儲存所有金額/數量/匯率
- 資料庫精度：小數第 10 位
- 顯示精度：依使用者偏好，預設第 2 位

#### 浮點誤差範例（為什麼必須用 decimal.js）
```javascript
0.1 + 0.2  // → 0.30000000000000004（不是 0.3）

let totalFee = 0;
for (let i = 0; i < 1000; i++) totalFee += 0.1;
// → 99.99999999999859（應該是 100，誤差累積）
```

對帳時跟券商對不起來會抓狂，務必避免。

### MVP 不算的（第二階段才做）
- 年化報酬率
- TWR（時間加權報酬率）
- IRR（內部報酬率 / 金錢加權報酬）
- 含配息的總報酬
- 跟大盤比較

---

## 5. 多幣別處理

> **模型已於 Sprint 4 翻案為 model B（單幣別事件 + 顯示時換算），見 [ADR-0005](adr/0005-single-currency-events-display-fx.md)。** 本節描述的即為 model B；早期「每筆交易同時記錄多幣別」的 model A 已廢除。

### MVP 多幣別策略（model B：單幣別事件 + 顯示時換算）

- **交易只記市場原幣別**：台股記 TWD、美股記 USD。交易事件**不**做 FX 換算、不存對稱多幣別 amounts map。
- **不追蹤匯率損益**、不存每筆交易的歷史台幣值（owner 拍板的範圍決定；持有期間匯率波動不歸因）。
- **匯率抽離為獨立的每日表** `exchange_rates/{牌告日}`，由後端 Cloud Function 寫、client 唯讀。
- **跨幣別合計只在顯示／分析時即時換算**：用「最新匯率」把各原幣別資產換算成顯示幣別（MVP 預設 TWD）的 as-of-today 快照，不落地。
- MVP 幣別範圍：**只 USD ↔ TWD**（enum / schema 已預留更多幣別）。
- UI：持倉總覽各市場原幣別小計 + 跨幣別「總成本（TWD）」合計；AssetDetail 可切換 TWD / USD 顯示。

### 匯率資料來源

#### 主來源：台灣銀行牌告匯率（已實測）
```
https://rate.bot.com.tw/xrt/flcsv/0/L6M/USD  # USD 近半年逐日（含「資料日期」欄）
```
- 抓 CSV、parse、存 Firestore（UTF-8 BOM + CRLF；spot_sell = 「本行賣出 / 即期」欄）。
- ⚠️ 實測修正：`/xrt/flcsv/0/L6M`（無幣別）回「找不到資料」、`/xrt/flcsv/0/day` 無日期欄。故採 `/L6M/{幣別}`，取最上面一行 = 最新牌告（含實際牌告日）。
- 匯率類型：**即期賣出**（spot_sell）作為唯一換算基準；MVP 不細分買賣方向（第二階段再考慮）。
- 無官方 API，需自寫抓取邏輯。

#### 備援來源（第二階段以後）
- exchangerate.host、Yahoo Finance — MVP 不啟用。

### 匯率抓取策略：每日排程寫表，顯示讀最新

**核心觀察**：本 App 不追蹤匯率損益，跨幣別合計只需「現在」的匯率快照——不需逐交易日的歷史匯率、也不需交易時抓匯率。

**機制**：
```
每日排程 Cloud Function（onSchedule, Asia/Taipei 16:30 牌告固定後）
  ↓ 抓 /L6M/USD 取最新一行 → parse spot_sell + 牌告日
  ↓ Admin SDK upsert exchange_rates/{牌告日}（雙向 USD_TWD / TWD_USD，idempotent）

顯示層（mobile）：讀 exchange_rates 最新一筆（orderBy date desc limit 1）
  ↓ convertMoney（packages/shared 純函式）即時換算跨幣別合計 / 幣別切換
```

**關鍵特性**：
- 與交易寫入**完全解耦**；mobile 零新 Firebase 依賴（只用既有 Firestore 讀，不呼叫 Cloud Function）。
- 表向前累積歷史（保留未來報稅佐證重建的可能），但顯示只用最新一筆。
- API call 量 = 每日 1 次，與使用者數無關（廢除 v1.0 的 cron 兩階段寫入與 model A 的逐交易抓取）。

### Edge case / 假日
- 無最新匯率（函式還沒跑過）時 UI 優雅降級：總覽合計顯示「匯率未就緒」、AssetDetail 切換維持原幣別，不 crash。
- 假日 / 早於 16:30：排程取到的是最近一個工作日牌告，以**實際牌告日**為 doc id（週末重跑 idempotent、`is_estimated` 恆 false）；顯示用最新一筆，對「今天還沒牌告」天然容忍。

---

## 6. Firestore Schema 完整設計

### 整體結構

```
firestore/
├── users/{userId}                          # 使用者根節點
│   ├── (user document fields)
│   ├── accounts/{accountId}                # 券商/持有位置帳戶
│   └── transactions/{transactionId}        # 所有交易事件
│
├── exchange_rates/{date}                   # 全域：匯率資料（每日排程 Cloud Function 寫，顯示層讀最新）
│
├── quotes/{symbolId}                       # 全域：報價快取（Cloud Function 寫，App 讀，TTL 15min）
│
└── symbols/{symbolId}                      # 全域：股票/資產代號清單
```

### Collection 1：`users/{userId}`

```javascript
{
  uid: "abc123",                       // 與 Firebase Auth uid 一致
  email: "user@example.com",
  display_name: "Sean",
  preferred_display_currency: "TWD",   // UI 預設顯示幣別
  preferred_locale: "zh-TW",
  created_at: timestamp,
  updated_at: timestamp,

  // 預留設定
  settings: {
    theme: "light" | "dark" | "auto",
    default_account_id: "acc_xxx"      // 新增交易時預設帳戶
  }
}
```

### Collection 2：`users/{userId}/accounts/{accountId}`

```javascript
{
  account_id: "acc_xxx",
  account_name: "我的 Firstrade 主帳戶",
  broker: "FIRSTRADE",                     // enum
  account_type: "BROKERAGE",               // enum
  base_currency: "USD",                    // 該帳戶基礎幣別
  market: "US",                            // 主要市場（資訊用）

  // MVP 現金追蹤
  cash_balances: {
    "USD": "5000.0000000000",
    "TWD": "0.0000000000"
  },
  cash_balances_updated_at: timestamp,

  is_active: true,                         // 軟刪除用
  display_order: 1,                        // UI 顯示排序
  color: "#1E88E5",                        // 帳戶識別色
  notes: "用於長期持有",

  created_at: timestamp,
  updated_at: timestamp
}
```

#### Broker enum
```typescript
const BROKERS = [
  // 美股 / 國際
  'FIRSTRADE', 'INTERACTIVE_BROKERS', 'MOOMOO', 'SCHWAB',
  'FIDELITY', 'ROBINHOOD', 'TD_AMERITRADE',

  // 台股
  'CAPITAL_SECURITIES',  // 群益
  'SINOPAC',             // 永豐金證券
  'FUBON',               // 富邦證券
  'YUANTA',              // 元大證券
  'CATHAY',              // 國泰證券
  'CTBC',                // 中信證券
  'MASTERLINK',          // 元富證券
  'KGI',                 // 凱基證券
  'MEGA',                // 兆豐證券

  // 加密貨幣（未來預留）
  'BINANCE', 'COINBASE', 'KRAKEN',
  'MAX', 'BITOPRO',      // 台灣交易所

  'OTHER'
] as const;
```

> **設計原則**：所有 broker 在系統中地位相等，不分主要/次要支援。

#### Account Type enum
```typescript
const ACCOUNT_TYPES = [
  'BROKERAGE',           // 一般證券帳戶
  'IRA',                 // 美國退休帳戶
  'MARGIN',              // 融資帳戶
  'CASH',                // 現金帳戶
  'CRYPTO_EXCHANGE',     // 加密貨幣交易所
  'CRYPTO_WALLET',       // 加密貨幣錢包
  'OTHER'
] as const;
```

### Collection 3：`users/{userId}/transactions/{transactionId}` — 核心 Event Sourcing 表

```javascript
{
  transaction_id: "txn_xxx",
  account_id: "acc_xxx",                   // 引用 accounts collection

  // 資產識別
  asset_type: "STOCK",                     // STOCK | ETF | CRYPTO | ...
  symbol: "AAPL",
  market: "US",                            // TW | US | BINANCE | ...

  // 事件類型（event sourcing 核心）
  transaction_type: "BUY",

  // 時間欄位
  transaction_date: "2024-01-15",          // YYYY-MM-DD
  ex_date: null,                           // 除權息日（配息事件用，MVP 留空）

  // 數量（與幣別無關）
  quantity: "10.0000000000",               // string，支援小數（零股 / 碎股）

  // 市場原幣別 + flat 金額（單幣別事件，ADR-0005；不再存對稱多幣別 amounts map）
  currency: "USD",                         // 台股 TWD、美股 USD
  price:  "180.5000000000",                // 單價
  total:  "1805.0000000000",               // = price × quantity（不含 fee/tax）
  fee:    "0.0000000000",
  tax:    "0.0000000000",

  // 預留欄位（MVP 不用，schema 已存在）
  related_transaction_id: null,      // 賣出對應到買入批次
  lot_id: null,                      // FIFO / 指定批次用

  notes: "",
  created_at: timestamp,
  updated_at: timestamp
}
```

#### Transaction Type enum
```typescript
const TRANSACTION_TYPES = [
  // MVP
  'BUY',                  // 買入
  'SELL',                 // 賣出

  // 第二階段
  'DIVIDEND_CASH',        // 現金股利
  'DIVIDEND_STOCK',       // 股票股利
  'SPLIT',                // 股票分割
  'REVERSE_SPLIT',        // 反分割 / 減資

  // 第三階段
  'SPINOFF',              // 分割上市
  'MERGER',               // 併購換股

  // 加密貨幣（未來）
  'STAKING_REWARD',       // 質押收益
  'AIRDROP',              // 空投
  'TRANSFER_IN',          // 鏈上轉入
  'TRANSFER_OUT',         // 鏈上轉出
] as const;
```

#### Asset Type enum
```typescript
const ASSET_TYPES = [
  'STOCK',                // 個股（MVP）
  'ETF',                  // ETF（MVP）
  'CRYPTO',               // 加密貨幣（未來）
  'BOND',                 // 債券（未來）
  'MUTUAL_FUND',          // 共同基金（未來）
  'OTHER'
] as const;
```

### Collection 4：`exchange_rates/{date}` — 全域共用

```javascript
// Document ID: 實際牌告日 "2024-01-15"

{
  date: "2024-01-15",                      // = 牌告日（document id）
  source: "BOT",                           // BOT | EXCHANGERATE_HOST | YAHOO
  rate_type: "spot_sell",                  // 即期賣出（MVP 唯一基準）
  rates: {
    "USD_TWD": "31.6800000000",            // 1 USD = 31.68 TWD
    "TWD_USD": "0.0315656566"              // 反向預先存好，省顯示層計算
    // 第二階段再加 _buy / _cash_sell variant 與更多幣別對
  },
  fetched_at: timestamp,
  is_estimated: false                      // 本模型以實際牌告日為 key，恆 false
}
```

寫入時機：每日排程 Cloud Function（Admin SDK 寫，見 §5）；表向前累積歷史。使用者只能讀，顯示層讀「最新一筆」。

### Collection 6：`quotes/{symbolId}` — 全域共用 quote cache

```javascript
// Document ID: 與 symbols collection 一致，"TW_2330"、"US_AAPL"
{
  symbol_id: "TW_2330",
  symbol: "2330",
  market: "TW",
  currency: "TWD",

  price: "1234.5000000000",                // string，配合 decimal.js
  fetched_at: timestamp,                   // Cloud Function 寫入時間
  source: "yahoo-finance",                 // QuoteProvider.name
  source_timestamp: timestamp,             // Yahoo 回傳的資料時戳
  is_delayed: true,
  delay_minutes: 15,

  open: "1230.0000000000",
  high: "1240.0000000000",
  low:  "1220.0000000000",
  prev_close: "1228.0000000000",
  volume: "12345678"
}
```

由 Cloud Function `fetchQuote` 在 cache miss/過期時寫入（TTL 15 min）。多使用者持有同一 symbol → cache 共享。使用者只能讀。

### Collection 5：`symbols/{symbolId}` — 全域共用

```javascript
// Document ID: "{market}_{symbol}" 例如 "TW_2330", "US_AAPL", "CRYPTO_BTC"

{
  symbol_id: "TW_2330",
  symbol: "2330",
  market: "TW",
  asset_type: "STOCK",
  name: "Taiwan Semiconductor",
  name_zh: "台積電",
  currency: "TWD",
  is_active: true,

  // 元資料（MVP 可選填）
  exchange: "TWSE",
  industry: "Semiconductors",
  sector: "Technology",

  created_at: timestamp,
  updated_at: timestamp
}
```

**MVP 採用策略**：
- 預先 seed 開發者自己會用到的股票清單
- 使用者新增交易時若 symbol 不在 collection 裡，動態建立一筆
- 長期可做 cron job 從外部資料源 enrich

### 重要設計決定

#### 為什麼不存 holdings collection？
- 持倉是衍生資料：`持倉股數 = SUM(BUY) − SUM(SELL)`
- MVP 階段交易筆數小，動態計算速度沒問題
- 不存 → 不會有資料不一致風險

#### 何時需要存 holdings 或 daily_snapshots？
- 交易筆數 > 千筆
- 要做每日資產走勢圖（第二/三階段）
- 要做即時推播

---

## 7. Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 使用者只能讀寫自己的所有資料
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }

    // 匯率：登入使用者皆可讀，只有後端 (Admin SDK) 可寫
    match /exchange_rates/{date} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // 股票代號：登入使用者皆可讀，可建立（MVP 動態新增），不可改不可刪
    match /symbols/{symbolId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }

    // 報價快取：登入使用者皆可讀，只有後端 (Cloud Function) 可寫
    match /quotes/{symbolId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

Subcollection 模式的最大好處：security rules 簡潔到只有四條。

---

## 8. Composite Indexes

### 必要的複合索引

Collection: `users/{userId}/transactions`
- `account_id ASC, transaction_date DESC` — 列出某帳戶交易
- `asset_type ASC, transaction_date DESC` — 列出某類型資產
- `symbol ASC, transaction_date ASC` — 某檔股票完整歷史（計算成本用）
- `transaction_type ASC, transaction_date DESC` — 篩選買/賣

Collection: `users/{userId}/accounts`
- `is_active ASC, display_order ASC` — 主畫面顯示啟用帳戶

定義在 `firestore.indexes.json`，提交後幾分鐘建好。

---

## 9. 待確認議題清單

開發過程中需確認的議題（已收斂議題不再列出，論證細節見 `/Users/sean.wang/.claude/plans/plan-mode-q6-snoopy-ripple.md`）：

| # | 議題 | 優先級 | 預計處理時機 |
|---|---|---|---|
| Q1 | Firstrade API 取得交易紀錄可行性，非官方爬蟲方案的風險評估 | 中 | 第二階段 |
| Q2 | Interactive Brokers (IBKR) API 整合可行性 | 中 | 第二階段 |
| Q4 | 群益證券 API（可能透過群益策略大師等程式交易 API） | 中 | 第二階段 |
| Q9 | 現金流事件追蹤模型（跨資產報酬率分析需要） | 低 | 第二階段以後（與 Q11 緊密相關） |
| Q10 | 每日資產走勢圖（需 daily_snapshots 設計） | 中 | 第二或第三階段 |
| Q11 | 入金 / 出金 / 換匯事件 schema（`DEPOSIT` / `WITHDRAWAL` / `FX_CONVERT` transaction type） | 中 | **MVP 預留 enum 即可、第二階段實作**。影響：對帳、cash_balances reconcile、IRR 計算 |
| Q12 | 公司行動成本計算邏輯（`SPLIT` / `REVERSE_SPLIT` / `DIVIDEND_STOCK` 後平均成本與股數如何調整） | 中 | 第二階段（配息功能前）。schema 已有 enum，但**算法尚未明定** |
| Q13 | 配息稅務欄位（美股股利 30% 預扣稅、台股 ETF 二代健保補充保費） | 中 | **MVP 預留 `withholding_tax` 欄位於 amounts map 內、第二階段實作配息時啟用** |

---

## 10. 規劃完成度

所有 MVP 主要規劃議題已收斂，對應章節：

| 議題 | 主題 | 收斂位置 |
|---|---|---|
| 議題 1–3 | 願景、核心決策、MVP scope | §1 / §2 / §3 |
| 議題 4 | 技術選型細節（8/8） | §2 核心決策表 + §11 主導航結構 |
| 議題 5 | 股價資料來源策略 | 合併到 Q6 / Q7（§9 引用之 plan file） |
| 議題 6 | 專案骨架 | §12 |
| 議題 7 | 開發流程 / Sprint / 測試策略 | §13 |

→ 規劃階段結束，進入 §13 Sprint 0 開工。後續若有新議題浮現，加進 §9。

---

## 11. 主導航結構（議題 4 收斂）

### 11.1 整體導航樹

```
RootNavigator (native-stack)
│
├── AuthStack（未登入時，conditional render）
│   ├── SignIn
│   ├── SignUp
│   └── ForgotPassword
│
├── MainTabs（已登入時）= Bottom Tabs × 4
│   │
│   ├── 📊 持倉 (HoldingsStack)
│   │     ├── HoldingsOverview        ← App 預設落地頁
│   │     ├── AssetDetail             ← 個別資產詳情（可切換幣別）
│   │     └── AssetTransactionHistory ← 該 symbol 的完整交易歷史
│   │
│   ├── 📝 交易 (TransactionsStack)
│   │     ├── TransactionList         ← 全交易流水，可篩選
│   │     └── TransactionDetail       ← 檢視/編輯/刪除單筆
│   │
│   ├── 🏦 帳戶 (AccountsStack)
│   │     ├── AccountList
│   │     ├── AccountDetail           ← 含 cash_balances 編輯
│   │     └── AccountTransactions     ← 該帳戶之交易
│   │
│   └── ⚙️ 設定 (SettingsStack)
│         ├── Settings
│         ├── ProfileEdit
│         ├── DisplayPreferences      ← preferred_display_currency / theme
│         └── About
│
└── Modal Group (presentation: 'modal')
    ├── AddTransaction                ← 跨多 tab 共用，route params 預填
    ├── EditTransaction
    └── AddAccount
```

### 11.2 為什麼選 Bottom Tabs × 4

| 替代方案 | 為什麼不採 |
|---|---|
| 3 tabs（持倉/交易/設定，帳戶併入設定） | 帳戶 CRUD 是 MVP 高頻動作，藏進設定不合理 |
| 5 tabs（多一個「報表」） | MVP 沒有報表分析功能（屬第二/三階段） |
| Central FAB Tab（iOS Mail / IG 風格） | React Navigation 實作偏 hacky，且 header `+` + FAB 已足夠 |
| Drawer（漢堡選單） | 偏 Android 風格，iOS 偏好 tab bar |

### 11.3 「新增交易」的多入口策略

新增交易是最高頻操作，需要在多處可觸發、且能 **預填 context**：

| 觸發位置 | 觸發方式 | 預填欄位 |
|---|---|---|
| 持倉 tab | Header 右上 `+` | （無） |
| 交易 tab | Header 右上 `+` ＋ 列表底部 FAB | （無） |
| 帳戶詳情頁 | Header 右上 `+` | account_id |
| 個別資產詳情頁 | Header 右上 `+` | account_id, symbol, market |

→ 全部 push 同一個 `AddTransaction` modal，透過 route params 傳遞預填資料。modal 設計確保 UX 焦點集中、可隨時下滑/取消返回原本 context。

### 11.4 預設落地頁

- **未登入** → SignIn
- **已登入** → MainTabs / HoldingsStack / HoldingsOverview

理由：開 app 時最常見的需求是「看一下我目前部位狀況」，不是「我要新增交易」。

### 11.5 技術細節

- **React Navigation v7**
  - `@react-navigation/native` + `@react-navigation/native-stack`（效能優於 JS stack、動畫原生）
  - `@react-navigation/bottom-tabs`
- **Type-safe routes**：透過 TypeScript declaration merging 給 `RootParamList` / 每個 stack 的 `ParamList` 強型別，避免 runtime 找不到 screen
- **Deep linking 預留**：每個 screen 定義 `path`，雖然 MVP 沒有 push 通知/分享連結，但未來開啟「點通知直接跳到該交易」等場景不需重構
- **Auth state 切換**：用 conditional render（`{user ? <MainTabs /> : <AuthStack />}`），不要用 `navigate('MainTabs')`，避免 navigation history 殘留與 unauthorized 畫面 flash

### 11.6 第二/三階段擴充預留

| 未來功能 | 導航位置 |
|---|---|
| 報表 / 年化報酬率 / TWR / IRR | 新增「📈 報表」tab → 變 5 tab，或併「設定」入 profile icon |
| 跟大盤比較、資產配置圓餅圖 | 進「報表」tab 的 stack |
| CSV 匯入 | 設定 tab → ImportData screen |
| 配息紀錄 | 沿用 `AddTransaction` modal，新增 transaction_type 選項即可（schema 已預留） |

---

## 12. 專案骨架（議題 6 收斂）

### 12.1 Repo 結構：Monorepo（pnpm workspaces）

```
AssetAnchor/
├── apps/
│   ├── mobile/                 # Expo React Native app
│   │   ├── src/                # 見 §12.2 模組劃分
│   │   ├── app.config.ts
│   │   ├── eas.json
│   │   └── package.json
│   │
│   └── functions/              # Firebase Cloud Functions
│       ├── src/
│       │   ├── exchangeRates/  # 台銀匯率抓取（Lazy + Permanent Date Cache）
│       │   └── quotes/         # Yahoo Finance quote proxy（多使用者共享 cache）
│       └── package.json
│
├── packages/
│   └── shared/                 # 跨 mobile / functions 共用
│       ├── src/
│       │   ├── types/          # Firestore document types (Transaction, Account, ...)
│       │   ├── enums/          # BROKERS, TRANSACTION_TYPES, ASSET_TYPES, ...
│       │   ├── schemas/        # zod schemas（同時給 form 驗證與 functions 入口驗證用）
│       │   ├── money/          # Money wrapper class
│       │   └── currencies/     # Currency enum + 換算 helper
│       └── package.json
│
├── firebase/
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   └── firebase.json
│
├── docs/
│   ├── portfolio_tracker_planning.md    # 本檔
│   └── adr/                              # Architecture Decision Records
│       ├── 0001-monorepo-with-pnpm.md
│       ├── 0002-navigation-structure.md
│       └── ...
│
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   └── feature_request.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
│       └── ci.yml
│
├── .husky/                     # husky hooks
├── pnpm-workspace.yaml
├── package.json                # workspace root
├── tsconfig.base.json
├── eslint.config.mjs
├── .prettierrc
├── .commitlintrc.cjs
├── .gitignore
├── LICENSE                     # MIT
└── README.md
```

**為什麼選 Monorepo（pnpm workspaces）**：
- mobile 與 functions 共用 Firestore schema 型別、enum、Money class，避免 copy-paste
- pnpm workspaces 是 zero-config 最簡解（不需 Turborepo / Nx）
- `pnpm -r <script>` 內建跑 cross-package script

**為什麼不分兩 repo**：型別同步成本（npm publish + 版本管理）過高，solo dev 不值得。

### 12.2 模組劃分（`apps/mobile/src`）— Feature-based

```
src/
├── features/                   # 業務領域，每個 feature 自包含
│   ├── auth/        (screens/ components/ hooks/ store.ts)
│   ├── holdings/
│   ├── transactions/
│   ├── accounts/
│   └── settings/
│
├── core/                       # 跨 feature 的基礎建設
│   ├── money/                  # Money wrapper（包 decimal.js）— 注意 packages/shared 也有 Money，這裡是 re-export
│   ├── firestore/              # @react-native-firebase 初始化、collection refs、helpers
│   ├── auth/                   # Firebase Auth client + useAuthUser hook
│   ├── navigation/             # RootNavigator + ParamList types
│   ├── theme/                  # color tokens、spacing、typography
│   └── ui/                     # 通用元件（Button、Input、Sheet、List 等）
│
├── services/                   # 外部資料源
│   ├── quotes/                 # QuoteProvider 介面 + YahooQuoteProvider + MMKV cache
│   └── exchange-rates/         # 匯率 client（call Cloud Function）
│
├── i18n/
│   └── zh-TW.ts                # 集中所有顯示字串
│
├── App.tsx
└── index.ts
```

**依賴方向規則**（避免循環依賴）：
```
features/* ─┬─→ core/*
            ├─→ services/*
            └─→ packages/shared
core/*    ──→ packages/shared
services/* ─→ packages/shared
```

- `features/*` 不互相 import（要共用則上移到 `core/` 或 `packages/shared`）
- `core/ui/` 只是 design system，**無業務邏輯**
- 業務純函式（成本計算、Money 運算、報酬率公式）放 `packages/shared`，方便寫純單元測試、且 functions 也能用

### 12.3 開源規範

| 項目 | 決策 | 備註 |
|---|---|---|
| **License** | MIT | 最寬容，符合「若好用則開源分享」目標 |
| README.md | 必要 | 含：專案介紹、技術棧、setup、目前狀態 |
| CONTRIBUTING.md | MVP 暫緩 | 等真有外部貢獻意願再寫 |
| CODE_OF_CONDUCT.md | MVP 暫緩 | 同上 |
| `.github/PULL_REQUEST_TEMPLATE.md` | 建立 | 自我約束 checklist（測試、文件、ADR） |
| `.github/ISSUE_TEMPLATE/` | 建立 | bug_report.yml + feature_request.yml |
| ADR | 建立 `docs/adr/` | 每次重大決策一份 md，編號 + 日期；planning doc 為 ADR-001 |

### 12.4 Commit Message：Conventional Commits

格式：
```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

**types**：`feat`、`fix`、`chore`、`docs`、`refactor`、`test`、`style`、`perf`、`ci`、`build`
**scopes**：`mobile`、`functions`、`shared`、`infra`、`docs`、`firebase`

範例：
```
feat(mobile): add holdings overview screen
fix(functions): handle BOT CSV missing rows on Sunday
refactor(shared): extract Money class fee calculation
docs(adr): add ADR-003 navigation structure decision
```

**強制工具**：commitlint + husky `commit-msg` hook，違規 commit 直接 reject。

### 12.5 程式碼品質工具鏈

| 工具 | 用途 | 觸發點 |
|---|---|---|
| ESLint | lint（Expo preset + `@typescript-eslint/strict`） | pre-commit + CI |
| Prettier | format | pre-commit + CI |
| TypeScript `--noEmit` | typecheck | pre-commit + CI |
| Jest（apps/mobile + packages/shared） | 單元測試 | CI |
| Husky + lint-staged | pre-commit hook，只跑 staged 檔案 | git commit |
| commitlint | commit message 規範 | commit-msg hook |

> **為什麼 solo dev 還裝 husky / commitlint**：未來開源後第一個 PR 進來，規範已內建、不需重新教育；自己也少做 inconsistent commit。

### 12.6 Branch & Release 策略：Trunk-based

- 主分支：`main`（受保護，必須過 CI 才能 merge）
- 工作分支命名：`feature/*`、`fix/*`、`hotfix/*`、`docs/*`、`chore/*`
- 全部走 PR，自我 review、CI 綠燈才 merge（solo dev 也維持紀律）
- 版本 tag：semver — MVP 期間 `v0.x.x`，上架後 `v1.0.0`
- **無 release branch**（solo dev 不需要）

> **重要**：依 global 規則，永遠不直接 push `main`，永遠開 PR、merge 按鈕由使用者本人按。

### 12.7 CI 規劃（MVP 階段）

`.github/workflows/ci.yml`，PR 觸發：

```yaml
jobs:
  lint:        # eslint + prettier --check
  typecheck:   # tsc --noEmit on apps/mobile, apps/functions, packages/shared
  test:        # jest（先只跑 packages/shared，mobile 視測試進度加）
```

**CD 暫不做（MVP）**：
- EAS Build：手動 `eas build` 即可
- Firebase Functions deploy：手動 `firebase deploy --only functions`
- App Store 自動上架：第三階段才考慮

第二階段考慮加：
- EAS preview build on PR（用於 preview internal testing）
- Functions auto-deploy on `main` push

---

## 13. Sprint 路線圖（議題 7 收斂）

### 13.1 拆分原則（業餘 solo dev，每週 6–10 小時投入）

| 原則 | 為什麼 |
|---|---|
| 每 sprint 1–2 週 | 太長失焦、太短沒成就感；業餘節奏每週估約 1 個半 sprint 容量 |
| 每 sprint 是 vertical slice、demoable | 結尾能跑出可看的東西，不要「整 sprint 只做底層」 |
| 風險高的早做 | EAS Dev Build + native module 設定（Sprint 1）卡關早知早處理 |
| schema / 型別先行 | packages/shared 的 types 在功能 sprint 開始前定，sprint 中可調但不能等到開工才設計 |
| 測試 infra 嵌入 Sprint 0–1 | 後補等於永遠補不完 |

### 13.2 Sprint 路線圖（7 個 sprint，共 11.5–17 週，預計 3–4 個月）

| Sprint | 主題 | 重點工作 | 驗收標準（demoable） | 週數 |
|---|---|---|---|---|
| **0** | Foundation | • pnpm monorepo 骨架（`apps/mobile`、`apps/functions`、`packages/shared`、`firebase/`）<br>• ESLint + Prettier + Husky + commitlint + lint-staged<br>• GitHub Actions CI skeleton（lint + typecheck + test）<br>• `packages/shared`：types / enums / Money class（含單元測試）<br>• Firebase 沿用 `assetanchor-832df` + 清空 Firestore + 部署新 rules / indexes（見 §14）<br>• ADR-000（planning doc 即為 ADR-000）+ ADR-001 monorepo decision | `pnpm install` 完成、CI 綠燈、Money class 100% 單元測試通過 | 1–1.5 |
| **1** | Auth + Hello Firebase Rail | • `apps/mobile` Expo TS init<br>• EAS Dev Build 設定（**最大風險點**）<br>• `@react-native-firebase` 整合 + native config（複用舊 `GoogleService-Info.plist`）<br>• Firebase Auth（Email/Password + Google）<br>• Conditional render auth navigator<br>• 空 MainTabs scaffold（4 個 tab 都是空殼）<br>• Root Stack ParamList 型別<br>• Firestore rules 單元測試（emulator） | 真機 build → 註冊 / 登入 / 登出 work、切到 MainTabs | 2–3 |
| **2** | 帳戶管理（Accounts） | • `core/ui` 基礎元件（Button / Input / Sheet / List）<br>• theme（colors / spacing / typography tokens）<br>• AccountsStack（List / Detail）+ AddAccount modal<br>• Zustand `accountsStore`<br>• Firestore CRUD for `accounts`<br>• cash_balances 手動編輯 UI<br>• ADR-003 navigation structure | 能新增 / 編輯 / 停用券商帳戶、顯示帳戶顏色、cash_balance 可改 | 2 |
| **3** | 交易（BUY）+ 持倉動態計算 | • AddTransaction modal（先做 BUY、先做單幣別）<br>• react-hook-form + zod schema for transaction<br>• Money 整合進 form（精度處理）<br>• Firestore CRUD for `transactions`<br>• HoldingsOverview：從 transactions 動態算出持倉<br>• AssetDetail（無報價、無多幣別）<br>• 對帳 timeline（個股交易順序）<br>• ADR-004 event sourcing schema + 動態 holdings | 能輸入買入 → 看到加權平均成本正確的持倉清單 | 2–3 |
| **4** | 多幣別 + 匯率 | • `apps/functions`：台銀 BOT CSV 抓取 Cloud Function<br>• Lazy + Permanent Date Cache（`exchange_rates`）<br>• Edge case：今日 16:00 前 placeholder<br>• 交易輸入時觸發匯率取得、寫入 amounts map<br>• AssetDetail 切換顯示幣別<br>• ADR-005 lazy exchange rate cache | USD 交易自動換算 TWD、edge case 處理乾淨 | 1.5–2 |
| **5** | 賣出 + 報價 | • SELL transaction + 已實現損益<br>• `apps/functions`：Yahoo Finance quote proxy（QuoteProvider 介面）<br>• MMKV + Firestore 雙層 cache（15min TTL）<br>• `services/quotes` client<br>• 持倉現價 + 未實現損益<br>• Pull-to-refresh on overview + detail<br>• ADR-006 quote cache strategy | 完整買賣 + 即時報酬率顯示、刷新行為對 | 2–3 |
| **6** | MVP Polish | • Symbol 動態建立 + Yahoo `quoteSummary` 補 metadata<br>• Empty / Loading / Error states<br>• Settings：preferred_display_currency / theme<br>• 損益顏色策略 implement<br>• 對帳功能完善（個股 timeline + 帳戶 cash 對比）<br>• Crash reporting 接 Sentry<br>• 真機 dogfood 一輪、列 punch list | MVP 驗收標準達成（每隻股票/ETF 的現貨價值、成本、報酬率正確） | 2 |

### 13.3 關鍵里程碑

| 里程碑 | Sprint | 重要性 |
|---|---|---|
| 🚦 EAS Dev Build 跑起來 | Sprint 1 中段 | 是否繼續用 `@react-native-firebase` 的 go/no-go 點。若卡超過一週，啟動 Plan B（暫退回 Firebase JS SDK，技術選型重訪） |
| 🚦 第一筆 transaction 寫入 Firestore | Sprint 3 早期 | 驗證整條 mobile ↔ Firestore ↔ packages/shared types 鏈路 |
| 🚦 第一個 Cloud Function 部署 | Sprint 4 | 驗證 functions deployment pipeline + emulator 工作流 |
| 🎉 MVP demo to family | Sprint 6 完成 | 第一輪外部回饋 |

### 13.4 測試策略

> **權威來源見 ADR-0007（`docs/adr/0007-testing-strategy.md`）**——風險導向「獎盃」模型 + 分層 CI 強制（純邏輯 TDD≥90%、資料層 transform 契約測試、rules 進 CI、關鍵 flow 1–2 條、UI 外觀手動 dogfood）。下表為早期摘要，與 ADR-0007 衝突時以 ADR 為準。

| 層級 | 工具 | 範圍 / 紀律 | 開始時機 |
|---|---|---|---|
| `packages/shared` 純函式 | Jest | **>90% coverage** — Money 運算、成本計算、報酬率公式、匯率換算 | Sprint 0 |
| `apps/functions` | Jest + Firebase emulator | 匯率抓取、報價 proxy、cache 邏輯 | Sprint 4–5 |
| Firestore rules | `@firebase/rules-unit-testing` + emulator | 確認 user A 不能讀 user B 資料 | **Sprint 1 結束前必備** |
| `apps/mobile` 元件 | React Native Testing Library | 不追求 coverage，只測複雜邏輯 + 關鍵 user flow（登入、新增交易、計算結果顯示） | Sprint 2 起 |
| E2E（Maestro） | — | MVP 暫不做，上架前 smoke test 再考慮 | 不在 MVP |
| 手動 dogfood | 真機 | 每 sprint 結束跑一輪、列 punch list | Sprint 1 起每 sprint |

**測試紀律**：
- 純函式 + Firestore rules 是「會 break 才知道」的高風險區，**必須測**
- UI 測試成本高、ROI 低 → solo dev 不過度投入
- **新增 transaction_type / asset_type / broker enum 時必須加對應測試**（schema 變更最容易 regression）

### 13.5 ADR（Architecture Decision Records）寫入時機

每個重大決策一份 markdown 到 `docs/adr/`，寫法：**Context → Decision → Consequences → Alternatives Considered**，每份 1 頁以內。

| 編號 | 主題 | Sprint |
|---|---|---|
| ADR-000 | Planning doc 本身（本檔即為 ADR-000） | Sprint 0 |
| ADR-001 | Monorepo + pnpm workspaces | Sprint 0 |
| ADR-002 | Firebase SDK：@react-native-firebase over Firebase JS SDK | Sprint 1 |
| ADR-003 | Navigation structure（Bottom Tabs × 4 + Modal） | Sprint 2 結尾 |
| ADR-004 | Event sourcing schema + 動態 holdings 計算 | Sprint 3 |
| ADR-005 | Lazy + Permanent Date Cache for exchange rates | Sprint 4 |
| ADR-006 | Yahoo Finance + 雙層 cache + 15min TTL | Sprint 5 |
| ADR-007 | 測試策略（風險導向分層 / 獎盃模型 + CI 強制） | Sprint 3 前 |

### 13.6 業餘節奏管理

| 建議 | 為什麼 |
|---|---|
| 每週固定 1–2 個工作晚 + 週末半天，不要彈性化 | 沒節奏 = 沒進度 |
| Sprint 結尾 demo 給自己看（即使空蕩蕩也錄 30 秒影片） | 累積成就感、自我問責 |
| GitHub Project board / Linear 管 sprint backlog | 不要靠記憶 |
| Sprint 結尾必寫 retrospective（3 行：what worked / what didn't / next） | 業餘 dev 容易循環同樣錯誤 |
| 沒進度也照常開 sprint、承認 carry over | 比假裝完成健康 |
| 絕對不要在 Sprint 1 EAS Dev Build 卡關時引入新工具 | 解一個問題就好，不要積債 |

---

## 14. 舊專案資產複用策略

### 14.1 舊專案位置

`/Users/sean.wang/Documents/Sean/project/AssetAnchor_old/`（已停止開發）

### 14.2 可複用資產（直接撿）

| 項目 | 狀態 | 複用方式 |
|---|---|---|
| Firebase 專案 `assetanchor-832df` | 已建立、Auth + Firestore 啟用 | **直接沿用**，省 console 設定。Sprint 0 清空 Firestore、部署新 rules / indexes |
| Google OAuth Client ID（Web + iOS） | 已設定 | 直接沿用，省 Google Cloud Console 設定 |
| iOS Bundle ID `com.seanwangys.assetanchor` | 已註冊於 Apple Developer | **直接沿用**（新專案延用 AssetAnchor 名稱，Bundle ID 天然相容）；若未來改 app 名再重新註冊新 bundle id |
| `GoogleService-Info.plist` | 存在 | `@react-native-firebase` iOS 必要檔，Sprint 1 直接複製到 `apps/mobile/ios/` |
| 舊 `.env` Firebase config | 存在 | Sprint 0 抄到 `apps/mobile/.env`，僅留 Firebase config（OAuth 改由 `@react-native-firebase` 處理，不再走 `expo-auth-session`） |

### 14.3 不複用（重寫）

| 項目 | 為什麼 |
|---|---|
| Firebase SDK 整合（舊用 `firebase` JS SDK） | 新計畫用 `@react-native-firebase`（native module），API 不同 |
| Schema 與 Service 層 | 舊 schema 簡陋（無 accounts、無多幣別、無 event sourcing），完全重新設計 |
| 整個專案結構（單 repo + flat `src/`） | 新採 monorepo + feature-based |
| Victory Native 圖表元件 | MVP 不需圖表（第二/三階段才用） |
| `auth.ts` 完整邏輯 | 邏輯結構可參考，但 SDK 不同需重寫；錯誤訊息對照表可抄 |

### 14.4 不直接 fork、另起新目錄的原因

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/` 直接 init monorepo，**不要 fork** AssetAnchor_old。差異太大、fork 後反而要先清乾淨，不如直接新建後從舊專案手動撿要的檔案（plist、.env 值、錯誤訊息表）。

### 14.5 Sprint 0 撿檔 checklist

- [ ] 從 AssetAnchor_old `.env` 複製 6 個 Firebase config 環境變數
- [ ] 從 AssetAnchor_old 根目錄複製 `GoogleService-Info.plist`（暫放，待 Sprint 1 iOS native config 用）
- [ ] 登入 Firebase Console 確認 `assetanchor-832df` 仍存在、Auth provider 仍啟用
- [ ] 清空 Firestore 舊資料（Console → Firestore → 刪除集合）
- [ ] 部署本檔 §7 security rules + §8 indexes

---

## 附錄：給接手 AI 的指引

如果你是新接手這個專案的 AI，請注意：

1. **使用者背景**：數據工程師、有軟體開發經驗、無 iOS 經驗、業餘時間開發
2. **討論風格**：使用者習慣每個議題深入討論、列出選項、做 trade-off 分析後再決定
3. **語言**：繁體中文討論，技術術語可中英混用
4. **決策已定的不要重啟**：本文件第 2–8 章的決策已拍板，除非使用者主動提出修改
5. **未討論的議題**：第 10 章列出，按順序逐一討論，每次只進一個議題
6. **schema 是聖牛**：第 6 章 Firestore schema 是後續所有開發的基礎，修改前須仔細評估影響
7. **完整論證 reference**：v2.0 階段（Q3, Q5, Q6, Q7, Q8, 議題 4）的決策推導與實作細節寫在 `/Users/sean.wang/.claude/plans/plan-mode-q6-snoopy-ripple.md`

### 下一步建議

所有 MVP 規劃議題已收斂（議題 1–7）。下一步是 **Sprint 0：Foundation**（見 §13.2）：

1. pnpm monorepo 骨架建立（`apps/mobile`、`apps/functions`、`packages/shared`、`firebase/`）
2. `packages/shared` 的 types / enums / Money class + 單元測試（>90% coverage）
3. ESLint + Prettier + Husky + commitlint + GitHub Actions CI
4. Firebase 沿用 `assetanchor-832df` + 清空 Firestore + 部署新 rules / indexes（見 §14）
5. 寫 ADR-000（planning doc 即為 ADR-000）+ ADR-001（monorepo decision）

Sprint 0 完成後進入 Sprint 1：Auth + Hello Firebase Rail（最大風險點：EAS Dev Build + `@react-native-firebase` native module 設定）。

---

## 版本歷史

- **v1.0**（2026-05-10 初版）：完成議題 1–3 的願景、核心決策、MVP scope，列出待確認議題清單與未討論議題。
- **v2.0**（2026-05-10 同日更新）：收斂 Q3 / Q5 / Q6 / Q7 / Q8 + 議題 4（7/8）的決策，新增 quotes collection 與 lazy exchange rate cache 設計，更新 §2 / §3 / §5 / §6 / §7 / §9 / §10。
- **v2.1**（2026-05-16）：收斂議題 4 最後一項「主導航結構」，新增 §11 完整導航設計（Bottom Tabs × 4 + 共用 Modal），更新 §2 核心決策表與 §10 議題 4 子題表。
- **v2.2**（2026-05-16）：收斂議題 6 專案骨架（monorepo + pnpm workspaces、feature-based 模組劃分、MIT、Conventional Commits、trunk-based、GitHub Actions CI），新增 §12，更新 §2 / §10 / 下一步建議。
- **v2.3**（2026-05-17）：收斂議題 7（Sprint 拆分 7 個 sprint / 測試策略 / ADR 寫入時機 / 業餘節奏管理），新增 §13 Sprint 路線圖；確認舊專案 AssetAnchor_old 的 Firebase 資產複用策略，新增 §14；新增 Q11–Q13（cash flow events / 公司行動成本算法 / 配息稅務欄位）；清理 §9 已決議項目、§10 改為「規劃完成度」摘要。
- **v2.3.1**（2026-05-23）：專案正式定名 `AssetAnchor`（取代開發代號 `finance_app`），原 `AssetAnchor` 舊專案資料夾改名為 `AssetAnchor_old`。npm scope 採 `@assetanchor`、GitHub repo 名 `AssetAnchor`、Bundle ID `com.seanwangys.assetanchor` 直接沿用。文件內 `finance_app` 路徑與 package name 全面替換；無架構決策變更。
