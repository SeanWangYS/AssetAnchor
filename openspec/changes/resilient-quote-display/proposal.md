## Why

持倉總覽「總資產」目前是 **all-or-nothing**：只要任一檔持倉的報價缺失或過期，整個 Hero/bento 就顯示「報價載入中…」/「—」，使用者看不到任何損益數字。加上報價更新只在冷啟動 / 持倉清單變動 / 下拉刷新時觸發（bottom-tab 保持 mounted，**切回分頁不會重抓**），且報價過期時程式碼會**丟掉**既有的 Firestore 報價、改打 `fetchQuote`——一旦外部來源 / 函式失敗，畫面就永久卡在「報價載入中…」。

這直接違背使用者的核心需求：**「每次打開 App 都能看到我所有資產的（盡力而為的）最新報價，即時算出 現價−成本 的總損益」**（planning §3 現價/損益顯示、§4 損益計算）。本 change 只修 mobile 端的「載入時機 + 消費/顯示邏輯」，**不動 schema / functions / rules**，風險低、可獨立 ship。

## What Changes

- **每次打開都檢查新鮮度（① 載入時機）**：持倉總覽 / 個股詳情於畫面 focus（React Navigation `useFocusEffect`）與 App 從背景回前景（`AppState 'active'`）時觸發報價載入。採非強制刷新——靠既有 15min TTL + 共用 `quotes/` cache 去抖，**成本與使用者數 / 打開次數無關**（同一檔過期後只有「全體第一個打開者」真的觸發抓取）。
- **彙總改部分渲染（④）**：Hero/bento 不再因單一檔缺報價就整頁空白。**有報價（新鮮或過期）的持倉先加總**進總市值 / 總未實現 / 總報酬率，缺報價的持倉標記「更新中」並從彙總排除；總成本（`grandCost`）亦不因單檔換算失敗回 `null`。
- **過期降級顯示（⑤）**：報價過期時**保留並顯示最後已知值**（讀 Firestore 那筆過期報價），標示「截至 HH:MM／延遲」並提供重試；背景照常嘗試刷新，成功就換上新鮮值。取代永久卡住的「報價載入中…」。
- **今日損益的誠實邊界**：總市值 / 未實現 / 報酬率可用過期值計算；但「今日損益（現價−前收）」**僅在有新鮮報價時顯示，否則「—」**（不以過期價算今日漲跌，避免誤導；沿用現有 `todayKnown` 雛形擴充）。

## Capabilities

### New Capabilities

（無——本 change 修改既有 `live-quotes` 的行為，不新增 capability。）

### Modified Capabilities

- `live-quotes`: 修改「雙層 cache 讀取與現價/損益顯示」需求——
  - **彙總改部分渲染**：原 scenario「彙總需全部持倉皆有報價」（缺一即顯示載入中/不顯示總額）反轉為「以手上已有報價部分加總、缺者標更新中」。
  - **過期降級**：原 scenario「報價未就緒降級」由「顯示『報價未就緒』提示」改為「顯示最後已知（過期）值 + asOf/延遲標示 + 重試」；`loadFor` 須回填過期報價而非丟棄。
  - **新增載入時機需求**：畫面 focus + App 回前景觸發報價載入（非強制、TTL 去抖）。
  - **新增今日損益新鮮度邊界**：今日漲跌僅於新鮮報價時呈現。

## Impact

- **程式碼（純 mobile）**：
  - `apps/mobile/src/services/quotes/quotesStore.ts`：`QuoteEntry` 加 stale 標示（沿用既有 `fetchedAtMs`）；`loadFor` 過期時回填既有報價（標 stale）而非丟棄；新增 focus/前景觸發的載入 hook。
  - `apps/mobile/src/features/holdings/screens/HoldingsOverviewScreen.tsx`：`hero` / `grandCost` 由 all-or-nothing 改部分渲染 + 過期/更新中標示；今日損益新鮮度邊界。
  - `apps/mobile/src/features/holdings/screens/AssetDetailScreen.tsx`：同步 focus 刷新 + 降級顯示。
- **不影響**：Firestore schema（聖牛，無變更）、`firestore.rules`（`quotes` 維持登入可讀/後端可寫）、`apps/functions`（`fetchQuote` 不動）、ADR-0006 架構（仍為 on-demand + 雙層 cache，本 change 只強化消費端韌性）。
- **依賴**：無新增套件（`useFocusEffect`、`AppState` 皆為既有 React Navigation / RN 能力）。
- **DoD**：帶 UI → 收尾須過 iOS Simulator 視覺對圖（owner gate，基準 `docs/design/holdings-overview/holdings-overview-spec.md`）；彙總/降級的純彙總邏輯若可抽純函式則加單元測試（ADR-0007 獎盃模型——資料流正確性屬該測）；focus/AppState 接線屬 plumbing 走手動 dogfood。

## Non-goals

- **批次報價端點（`fetchQuotes`）與事件驅動發現（`onCreate symbols/{id}` 首抓報價）**：屬後續 change 2 `add-quote-batch-discovery`（functions 變動），不在本 change。
- **本機 MMKV 持久層**：屬後續 change 3 `add-mmkv-quote-cache`（完成 ADR-0006 三層 cache 終局、動原生 build），不在本 change；本 change 的「最後已知值」來源為 Firestore 過期報價（需 online）。
- **排程批次刷新（cron）**：ADR-0006 已明確否決，本 change 與後續皆不採用。
- **分析頁接真實報價**：分析頁目前為 mock 資料（`analysisData.ts`），不在本 change 範圍。
- **真機 / Google 登入 runtime 驗證**：延後至 Apple Developer 通過後批次驗收（環境關鍵事實）。
