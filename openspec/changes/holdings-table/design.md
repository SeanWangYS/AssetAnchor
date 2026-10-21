## Context

`HoldingsOverviewScreen` 的清單目前由 `buildSections`（持股 / 帳戶 / 類別）+ `HoldingRow`（兩段式 row）+ `subtotalText`（原幣別小計）組成，上方有 `grandCost`「總成本」行。設計定案為凍結代號欄的橫捲表格（design spec D10 + `holdings-redesign-mock.html`），owner 2026-10-21 另決定：排序以 **MMKV 本機**記憶、「帳戶」分組年化**只算該帳戶**。

可重用：`deriveHoldings` / `deriveHoldingsByAccount`、`quoteMoneyIn` 與 `toDisplay`（valuation / holdingsDemo）、`isFresh`、`buildCashFlows` + `summarizePerformance`（change ⑤）、`historyStore` 的 FX 日線、`computePortfolioReturn` 的 FX 年份齊備判定。

`apps/mobile/ios/` 為 gitignore（本機 prebuild、EAS 雲端 prebuild）；App 使用 `expo-build-properties` 的 `useFrameworks: 'static'`。E2E `regression-quote-not-found.yaml` 斷言畫面出現「查無代號」。

## Goals / Non-Goals

**Goals:**

- 與 mock 視覺一致的表格；凍結欄與捲動區列高嚴格對齊。
- 排序、列指標、分組為純函式並有測試；screen 只負責組裝。
- 個股 / 帳戶範圍年化正確，零新增 Firestore 讀取。

**Non-Goals:** 欄位自訂、列操作、MMKV 報價快取、帳戶詳情頁改表格。

## Decisions

### D1：版面結構——單一水平 ScrollView + 固定列高

```
<View row>
  <View frozen width=76>    表頭格 / 組標題格 / 列格 …（固定高 34 / 34 / 46）
  <ScrollView horizontal>   表頭列 / 組標題列 / 資料列 …（同順序、同高度）
```

左右兩側由同一份「表格列模型」（D2）依序渲染，以**固定高度**對齊，不靠量測。整個表格位於頁面的垂直 `ScrollView` 內（RN 支援巢狀不同方向捲動）。點擊：兩側皆為 `Pressable`，以 `pressedKey` state 讓兩側同列同時呈現按下態，`onPress` 皆導向 `AssetDetail`。

- 替代方案：每列各自一個水平 ScrollView 再同步 offset → 多個捲動容器、同步抖動，捨棄。
- 替代方案：`FlatList` 虛擬化 → 持股數十檔以內無需虛擬化，且與巢狀橫捲同步較複雜，捨棄。

### D2：純函式表格模型 `features/holdings/holdingsTable.ts`

- `buildHoldingRows({ positions, quotes, quoteErrors, rates, displayCurrency, nowMs, totalValue, performanceOf })` → `HoldingRow[]`，每列含：key、market/symbol、各欄數值（`Money | null` 或 `number | null`，供排序）與已格式化字串（供顯示）、`status: 'ok' | 'pending' | 'not_found'`。
  - 現價：`quoteMoneyIn(price, quote, position.currency, rates)` → `toDisplay(…, displayCurrency)`；均價、成本同樣換到顯示幣別。
  - 報酬%：以**原幣別**（現價 − 均價）÷ 均價（換匯兩邊同率會約掉，直接在原幣別算避免多一次捨入）。
  - 今日漲跌%：`isFresh` 且有 `prevClose` 才算。
  - 佔比：該列市值 ÷ `totalValue`（hero 的 `valueMoney`，整個組合）。
- `buildTableSections(mode, …)` → `[{ key, label, count, subtotal, skippedCount, rows }]`；組依小計降冪、「未分類」置底；「類別」標題＝`marketLabel(market)`。
- `sortRows(rows, sort)`：比較子依欄位取數值；`null` 一律排最後；相同值以代號升冪。
- 皆有 jest 測試，加入 mobile coverage 名單。

### D3：個股年化

- `buildCashFlows` 的 `filter` 擴充為 `{ market; symbol; accountIds?: readonly string[] }`（shared，TDD 補測試）。
- 「持股 / 類別」：filter 只帶 symbol；「帳戶」：帶該帳戶 id；「未分類」：帶「不在現存帳戶清單中的 account_id 集合」。
- 期末值＝該列市值 `Money`；以 `summarizePerformance` 判定 annualized / cumulative。FX 就緒判定沿用 `computePortfolioReturn` 的年份齊備邏輯（抽成共用 helper `fxReadyFor(transactions, chunks, backfilling, displayCurrency, today)`，避免兩處分岔）。
- `useMemo` 依（transactions、chunks、quotes、rates、displayCurrency、分組模式）重算；不呼叫 `loadFor`。

### D4：MMKV 本機偏好 service

- 依賴：`react-native-mmkv`（v4，Nitro）+ `react-native-nitro-modules`，以 `npx expo install` 安裝取得 SDK 54 相容版本；本機 `expo prebuild` / `pod install` 後重 build 模擬器。
- `services/localPrefs/`：`createMMKV({ id: 'assetanchor.local-prefs' })`；提供 `readHoldingsSort()` / `writeHoldingsSort()`。值以 JSON 存，讀取經 `parseHoldingsSort`（純函式、白名單驗證欄位與方向），無效即回預設 `{ key: 'mv', dir: 'desc' }`。
- jest：`react-native-mmkv` 以 manual mock（in-memory Map）替代；`parseHoldingsSort` 有獨立測試。
- 只存本機、不寫 Firestore（無 schema 變更）。

### D5：欄寬與格式

固定欄寬（px）：市值 104、報酬% 96、未實現 104、今日漲跌% 96、現價 96、股數 76、均價 96、成本 104、佔比 64、年化 96（數值超寬時 autofit 縮字至 70%）；數值 `numberOfLines={1}` + 等寬數字（`numericStyle`）。金額：TWD 0 位、USD 2 位；現價 / 均價 2 位；股數沿用 `fmtShares`；佔比 1 位。正負色：報酬%、未實現、今日漲跌%、年化。年化 cumulative 加淡色 `*`。

### D6：移除

`HoldingRow`、`subtotalText`、舊 `buildSections`、`grandCost` memo 與「總成本」行及其 styles。`holdingsDemo` 中若有僅供舊 row 使用的 helper 一併清理。

## Risks / Trade-offs

- [Nitro / MMKV 與 `useFrameworks: 'static'` 的 iOS build 相容性] → apply 第一個任務即安裝並 build 模擬器驗證；若失敗，暫停回報 owner（退路：先以記憶體保存、MMKV 另案）。
- [巢狀橫捲與頁面下拉刷新 / 垂直捲動手勢衝突] → 模擬器實測斜向滑動；必要時設 `directionalLockEnabled`。
- [左右兩側列高不一致導致錯位] → 全部固定高度、文字單行；測試以列模型順序一致保證。
- [每列 XIRR 運算成本] → 持股數十檔 × 毫秒級，`useMemo` 僅在資料變動時重算。
- [移除總成本與原幣別小計] → owner 決定；成本資訊仍在表格「成本」欄。

## Migration Plan

App 端 + shared 純函式 + 新原生依賴；無 schema / rules / functions 變更。開發者需重新 `pnpm install` 並 `pnpm --filter @assetanchor/mobile ios`（重 build）；下次 TestFlight 為新原生 build。回滾＝revert PR（並移除依賴）。

## Open Questions

（無；排序儲存與帳戶年化口徑已於 2026-10-21 由 owner 拍板。）
