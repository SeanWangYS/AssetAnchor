## Context

報價架構（ADR-0006）已落地：共用 `quotes/{symbolId}`（後端寫、跨使用者共讀）+ mobile 端 `quotesStore`（in-memory → Firestore → `fetchQuote`）。但消費端有三個韌性缺口（見 proposal）：載入只在 mount/清單變動/下拉時觸發、彙總 all-or-nothing、過期報價被丟棄導致刷新失敗即永久卡「報價載入中…」。

本 change 是「報價更新架構改進」三層 roadmap 的**層 1（純 mobile）**：

- 層 1（本 change）`resilient-quote-display`：消費端韌性。
- 層 2 `add-quote-batch-discovery`：批次 `fetchQuotes` + `onCreate symbols/{id}` 首抓（functions）。
- 層 3 `add-mmkv-quote-cache`：補本機 MMKV 持久層、完成 ADR-0006 三層 cache 終局（原生 build）。

約束：不動 Firestore schema（聖牛）、不動 `firestore.rules`、不動 `apps/functions`、不新增套件；金額一律 `Money`（ADR-0005）；UI 對齊 `docs/design/holdings-overview/holdings-overview-spec.md`。

## Goals / Non-Goals

**Goals:**

- 「每次打開」（focus / 回前景）都檢查報價新鮮度並取得當下可得的最新值，成本不隨使用者數 / 打開次數放大（靠 15min TTL + 共用 cache 去抖）。
- 持倉總覽永遠呈現**盡力而為**的彙總：有報價的先算、缺的標「更新中」，刷新失敗時退而顯示最後已知（過期）值 + 誠實標示新鮮度，而非整頁卡住。
- 把「總市值/未實現可容忍過期」與「今日漲跌須新鮮」兩種新鮮度需求分離，避免誤導。

**Non-Goals:**

- 不做批次端點 / 事件驅動發現（層 2）、不做 MMKV 持久層（層 3）、不做排程（ADR-0006 已否決）。
- 不改報價來源、sanity 驗證、`fetchQuote` 後端邏輯。
- 不處理分析頁 mock 資料（另案）。

## Decisions

### D1：過期報價「保留並標示」而非「丟棄重抓」

`quotesStore.loadFor` 現行邏輯：Firestore 報價過期即略過、改打 `fetchQuote`；若 `fetchQuote` 回 `null`（來源/函式失敗），該 symbol 在 store 中維持缺失。

改為：讀到 Firestore 報價無論新鮮與否都**回填 store**，`QuoteEntry` 既有 `fetchedAtMs` 即足以由消費端用 `isFresh(fetchedAtMs, now)` 判定 `stale`（**不需新增 schema 欄位、不需改 `QuoteEntry` 形狀以外的型別**；至多在 entry 上加一個衍生旗標或由消費端即時計算）。過期者仍觸發背景刷新，成功則覆蓋為新鮮值。

- **理由**：最小改動即解決「刷新失敗永久卡住」；過期值對「總市值」是可接受的近似，誠實標示即可。
- **替代**：① 引入 MMKV 作最後已知值來源——延後到層 3（不為此動原生 build）。② 維持丟棄、僅改 UI 文案——治標不治本，離線/失敗仍無值。

### D2：彙總改「部分渲染」——以 reducer 累加可得值、回報缺漏數

`hero` / `grandCost` 由「任一缺值即 `return null`」改為：對每個持倉嘗試計算，成功者累加、失敗（無報價 / 換算失敗）者計入 `pendingCount` 並跳過。回傳 `{ value, cost, unrealized, returnPct, pendingCount, anyStale, today, todayKnown }`。UI 在 `pendingCount > 0` 時於 Hero 旁標「N 檔更新中」；僅在 `納入數 === 0` 時顯示「報價載入中…」。

- **理由**：把「全有全無」反轉為「盡力而為 + 誠實揭露缺漏」，直接服務「打開就要看到損益」。
- **替代**：顯示佔位骨架直到全齊——等於現況的慢，違背需求。

### D3：今日損益的新鮮度邊界

總市值/未實現/報酬率允許納入過期報價；但今日漲跌（現價−前收）**僅當該持倉報價新鮮**才納入，否則該檔 `todayKnown=false`。彙總今日損益僅在所有納入持倉皆新鮮時呈現，否則「—」。沿用現有 `todayKnown` 機制擴充（再加「新鮮」這個條件）。

- **理由**：過期價算「今日」會把昨天當今天，誤導性高於總市值。
- **替代**：今日損益也吃過期值——owner 已否決（見 proposal）。

### D4：載入時機——`useFocusEffect` + `AppState`，非強制刷新

新增一個可重用的小 hook（如 `useRefreshQuotesOnFocus(targets)`）：`useFocusEffect` 內呼叫 `loadFor(targets)`（非 force）；並掛 `AppState` `change` 監聽，於 `active` 時同樣呼叫。持倉總覽與個股詳情共用。force 只保留給 pull-to-refresh。

- **理由**：bottom-tab 保持 mounted → 既有 `useEffect([depKey])` 不會在 re-focus 時重跑；focus/前景才是「打開」的真正訊號。非 force + TTL 去抖 → 同一檔過期後僅「全體第一個打開者」實際打 `fetchQuote`，其餘讀新鮮 Firestore，**成本 ≈ 不同 symbol 數 ×（開盤分鐘/15），與使用者數無關**。
- **替代**：每次 focus 都 force——會繞過共用 cache、放大外部抓取與額度，否決。

## Risks / Trade-offs

- **[過期值誤導]** 使用者把過期市值當即時 → Mitigation：明確「截至 HH:MM／延遲」標示 + 今日損益不吃過期值（D3）；保留既有「延遲 15 分鐘」註記。
- **[focus 觸發過於頻繁]** 快速切分頁可能短時間多次呼叫 `loadFor` → Mitigation：非 force + TTL，實際外呼被 cache 擋下；必要時 hook 內加最小間隔節流（in-memory 時戳判定即可）。
- **[部分渲染的數字「會動」]** 缺漏檔補齊後總額跳變，可能讓使用者疑惑 → Mitigation：以「N 檔更新中」明示尚未齊全，補齊即穩定。
- **[抽純函式範圍]** 若把彙總邏輯抽成純函式以利測試，需小心 `Money` 型別與顯示換算邊界 → Mitigation：純函式吃已換算後的數列或注入 `toDisplay`，對齊 ADR-0007 獎盃模型「資料流正確性」該測。
- **[AppState 監聽洩漏]** 未正確解除監聽造成重複訂閱 → Mitigation：在 hook cleanup 內 `subscription.remove()`。

## Migration Plan

純前端行為強化，無資料遷移、無 schema/rules 變更、無部署 gate（mobile 端）。逐檔改 `quotesStore` → `HoldingsOverviewScreen` → `AssetDetailScreen`，本機對 Firebase Emulator dogfood；收尾過 iOS Simulator 視覺對圖（owner gate）後即可開 PR。回退＝還原這三檔，無外部副作用。

## Open Questions

- 「N 檔更新中」的確切視覺呈現（位置 / 文案）以 `holdings-overview-spec.md` 視覺對圖時與 owner 確認；spec 僅約束行為。
- 彙總邏輯是否抽到 `packages/shared`（純函式、可測）或留 screen 內 `useMemo`：apply 階段視可測性與 ADR-0007 取捨決定，不影響本 change 行為契約。
