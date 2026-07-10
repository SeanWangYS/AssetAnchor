# Design：持倉「帳戶」分群接真實資料

## 問題本質

`deriveHoldings(transactions)` 的聚合粒度是 `(market, symbol)` **跨帳戶合併**（holdings-derivation 既有需求），回傳的 `Position` **不帶 `account_id`**——帳戶資訊在聚合時就丟失了。所以持倉總覽拿到的 `positions` 陣列**無法**再按帳戶分組。現行 code 為了硬湊「帳戶」分群，才用 `accountOf(symbol)` demo 表偽造，完全不碰真實 `account_id`。

正解：「帳戶」模式**不要**在 `positions` 上分組，而是**改走 per-account 推導**——對每個帳戶各自 filter 交易再 `deriveHoldings`。此路徑已有現成、已測的 shared 函式 `deriveHoldingsForAccountSafe`。

## 方案

### 1. shared：跨帳戶分組推導純函式

在 `packages/shared/src/portfolio/` 新增：

```
deriveHoldingsByAccount(transactions, accounts): AccountHoldingsGroup[]
  // AccountHoldingsGroup = { accountId: string; accountName: string; positions: Position[]; skipped: SkippedSymbol[] }
```

- 對 `accounts`（傳入的帳戶清單，plain data）逐一呼叫既有 `deriveHoldingsForAccountSafe(transactions, accountId)`，得該帳戶 positions（safe 版逐 symbol 容錯、跳過髒資料 symbol 收進 `skipped`，不整組 throw）。
- `account_id` 對不到任何帳戶的交易（orphan）：彙整成一個 `accountId: ''`、`accountName: '未分類'` 的群（fail-soft，讓資料異常可見而非消失）。
- 只回傳「有持倉（positions 非空）」的群，維持與「持股」模式一致的「零股不列」語意。
- 排序：依傳入 `accounts` 的順序（呼叫端以 accountsStore 既有排序傳入）；「未分類」殿後。
- 純函式、無 IO、全程 `Money`；TDD + 測試（多帳戶分流、orphan 歸未分類、跨帳戶同 symbol 兩群各列、skipped 隔離、空集合）。

> 為何不「從交易掃 symbol→account 對照表」再套用到既有 `positions`：跨帳戶持有**同一** symbol 時該表只能歸一個帳戶，語意錯誤。per-account 各自推導才正確（同 symbol 會在兩個帳戶群各出一列，各自的股數/均價——正確行為）。

### 2. mobile：HoldingsOverviewScreen 分群接線

- 「帳戶」模式：改用 `deriveHoldingsByAccount(transactions, accounts)` 產生 sections（`transactions` 來自既有 `useTransactionsStore`；`accounts` 增讀 `useAccountsStore`——與本檔已存在的 transactionsStore 讀取同型）。每組標題 = `accountName` + 檔數 + 原幣別小計（沿用既有 `subtotalText` 計算，套用該群 positions；成本 vs 市值語意**維持現況**，B 案屬後續 change）。
- 「持股」「類別」模式：**不變**，仍用扁平 `positions`。
- 帳戶分組標題**無顏色圓點**（holdings-overview-spec D3：持倉清單本身的帳戶分組保持無色塊）。
- 移除對 `accountOf` 的 import 與呼叫。

### 3. mobile：holdingsDemo.ts 清 demo 債

- 刪 `DEMO_ACCOUNT` 與 `accountOf`（含 owner 不存在的富邦/IBKR 硬編）。
- 檢查同檔其他 demo（如硬編匯率 `1 USD = 30.95` 的 `toDisplay` fallback）是否僅此二函式相依；匯率 fallback 的清理屬後續 `account-detail-market-value` change（估值上移時處理），本 change **只**移除帳戶 demo，不動匯率 demo，避免擴大範圍。

### 4. mobile：AssetDetailScreen「帳戶分布」

- `accountOf(symbol)` → 從 `transactions` 篩出該 `(market, symbol)` 的交易，取其 `account_id` 對應的 `account_name`（去重；可能多帳戶，以「、」連接）。找不到對應帳戶 → 「未分類」。維持無色塊。

### 5. mobile：本月已實現損益空狀態 + 純函式抽出

- 將 `HoldingsOverviewScreen` inline 的「本月」過濾 + 換算加總（現 useMemo）抽成純函式 `realizedInMonth(events, monthPrefix, rates, displayCcy)` 置於 `holdingsHero.ts`（與既有 `computeHoldingsHero` 同層、同測試檔慣例）。
- bento：當「本月無任何 SELL 事件」（該月 `events` 過濾後為空）時，顯示中性空狀態（灰色「—」或「本月無賣出」，比照今日損益 pending 樣式），**不**渲染綠色 `▲ NT$ 0`；有事件（含加總恰為 0）才走 `Pnl`。
- 測試：`realizedInMonth` 補月邊界（6/30 vs 7/1）、跨年（12→1 月）、多幣別加總、負值、空集合。

## 邊角與風險（apply 時務必處理）

- **已刪帳戶**：交易 `account_id` 指向已刪帳戶 → `deriveHoldingsByAccount` 歸「未分類」（同 orphan 處理）。
- **同 symbol 跨帳戶出兩列**：正確行為，但「帳戶」模式總檔數會 > 「持股」模式（後者合併）——視覺對圖時預先知悉，非 bug。
- **skipped（髒資料 symbol）**：safe 版會跳過；是否在群標題揭露「N 檔資料異常」比照 AccountDetail 的「資料異常」列——apply 時決定，傾向揭露以免靜默。
- **報價相關小計**：owner 有 `symbol_not_found` 持股，帳戶群小計會顯示「N 檔更新中」——屬既有報價行為，修分群後仍在，**非本 change 弄壞**。
- **依賴方向**：讀 `accountsStore` 屬跨 feature store 讀取（本檔已對 transactionsStore 為之）；`eslint.config.mjs` 未 enforce，沿用既有慣例。若未來要嚴格化，估值/推導上移 `services/` 是更乾淨方向（屬 `account-detail-market-value` change 一併評估）。

## 不做（本 change 邊界）

見 proposal Non-goals：類別髒資料、B 案市值、zod 讀取驗證、RealizedEvent 加 account_id、Pnl 全域 0 中性。
