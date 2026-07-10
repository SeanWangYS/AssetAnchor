## 1. shared：跨帳戶分組推導純函式（TDD）

- [x] 1.1 先寫測試 `deriveHoldingsByAccount.test.ts`：多帳戶分流、orphan→「未分類」、跨帳戶同 symbol 兩群各成一列、skipped 隔離、空集合、群排序依傳入帳戶序且「未分類」殿後（6 案）
- [x] 1.2 實作 `deriveHoldingsByAccount(transactions, accounts)`：逐帳戶復用 `deriveHoldingsForAccountSafe`（抽共用核心 `safeHoldingsFromTxs`，不改既有 per-account 行為）；orphan 彙整「未分類」；只回傳非空群；全程 `Money`
- [x] 1.3 匯出 `AccountRef` / `AccountHoldingsGroup`；shared 測試全綠（含既有 per-account 10 案未破壞）

## 2. mobile：holdingsHero 抽出「本月已實現」純函式（TDD）

- [x] 2.1 測試 `realizedInMonth`：月邊界（6/30 vs 7/1）、跨年（12→1）、多幣別換算加總、負值、空集合（7 案）
- [x] 2.2 實作 `realizedInMonth(events, monthPrefix, rates, displayCcy)`：回 `{sum, count}`，行為與原 inline useMemo 等價

## 3. mobile：HoldingsOverviewScreen 分群接線

- [x] 3.1 增讀 `useAccountsStore`（沿用本檔既有跨 feature store 讀取慣例）
- [x] 3.2 「帳戶」模式改用 `deriveHoldingsByAccount(transactions, accounts)`：標題真實 `accountName` + 檔數 + 小計；無顏色圓點
- [x] 3.3 「持股」「類別」模式維持扁平 `positions` 不變
- [x] 3.4 「未分類」殿後；含 skipped 的群小計標「N 檔資料異常」
- [x] 3.5 移除 `accountOf` import 與呼叫

## 4. mobile：本月已實現損益 bento 空狀態

- [x] 4.1 bento 改用 `realizedInMonth`；`count === 0`（本月無賣出）顯示中性「—」（`bentoPending`，同今日損益），不渲染綠 `▲ NT$ 0`
- [x] 4.2 有事件才走 `Pnl`；文案沿用既有繁中字串慣例

## 5. mobile：AssetDetailScreen「帳戶分布」

- [x] 5.1 `accountOf(symbol)` → `deriveHoldingsByAccount` 解析實際持有此 `(market, symbol)` 的帳戶名（去重、多帳戶以「、」連接、無則「—」）；維持無色塊

## 6. 清 demo 債

- [x] 6.1 刪 `holdingsDemo.ts` 的 `DEMO_ACCOUNT` 與 `accountOf`（含富邦/IBKR 硬編）；全 repo 無其他 code 引用（僅註解提及）
- [x] 6.2 匯率 demo fallback（`toDisplay` 1 USD=30.95）不動（屬後續 `account-detail-market-value` change）

## 7. 驗證與收尾

- [x] 7.1 `pnpm --filter @assetanchor/shared test:coverage`（>90%）+ `pnpm -r typecheck` + `lint` 全綠；mobile 43 tests
- [ ] 7.2 本機 dogfood（Emulator 種子多帳戶）：「帳戶」模式每檔歸真實帳戶、無「富邦/IBKR」幽靈帳戶、orphan 進「未分類」；本月無賣出顯示中性「—」
- [ ] 7.3 Maestro E2E（`apps/mobile/.e2e/`）：登入 → 持倉 → 切「帳戶」→ 斷言真實帳戶名、無 demo 帳戶名
- [ ] 7.4 iOS Simulator 逐畫面視覺對圖（持倉「帳戶」分群 + AssetDetail 帳戶分布）對照 holdings-overview-spec §3.1/§3.2 —— **owner gate**
- [ ] 7.5 開 PR；（帶 UI）視覺對圖過後 archive、續做 `account-detail-market-value`；merge 延後 owner 批次
