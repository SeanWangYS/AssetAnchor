## 1. shared：deriveHoldings 純函式（TDD）

- [ ] 1.1 寫 `packages/shared/src/portfolio/deriveHoldings.test.ts`（先紅）：§4 台積電 fixture（三筆 BUY → quantity=2500、totalCost=1376900、averageCost=550.76 的 10 位小數 string）、跨帳戶聚合（不同 account_id 同 symbol 合併）、多 symbol 各自成列、空陣列回空、零費稅券商、fee+tax 計入成本、除不盡時 ROUND_HALF_UP、deterministic 排序（market 升冪再 symbol）、混幣別丟 CurrencyMismatchError、txCount 正確
- [ ] 1.2 實作 `packages/shared/src/portfolio/deriveHoldings.ts`：`Position` 介面 + `deriveHoldings`（過濾 BUY、Map 聚合、Money 累加 total/fee/tax/quantity、averageCost=divide、排序），轉綠
- [ ] 1.3 `portfolio/index.ts` + 根 `index.ts` 匯出；`pnpm --filter @assetanchor/shared test:coverage` 維持 ≥90% 綠燈

## 2. mobile：HoldingsStack 導航

- [ ] 2.1 `core/navigation/types.ts` 新增 `HoldingsStackParamList`（`HoldingsOverview: undefined`、`AssetDetail: { market; symbol }`）與對應 ScreenProps 型別（比照 AccountsStackScreenProps）
- [ ] 2.2 新增 `features/holdings/HoldingsStack.tsx`（比照 AccountsStack）；`MainTabs` 的 Holdings tab 換成 HoldingsStack（`headerShown: false`）；刪除 Sprint 1 rail 殼 `HoldingsScreen.tsx`

## 3. mobile：useHoldings 推導 hook

- [ ] 3.1 `features/holdings/useHoldings.ts`：讀 `useTransactionsStore`，`useMemo(() => deriveHoldings(transactions), [transactions])` 回傳 `Position[]`（D3：不新增 listener）

## 4. mobile：HoldingsOverview 畫面

- [ ] 4.1 `screens/HoldingsOverviewScreen.tsx`：依 market 分組（TW 前）、組標頭顯示原幣別總成本小計、row 三段式（symbol／N 股 · 均價／總成本），`Money.toDisplayString()` 2 位小數
- [ ] 4.2 空持倉狀態（引導新增交易）；點 row 導向 `AssetDetail(market, symbol)`
- [ ] 4.3 i18n：`zh-TW.ts` 新增 `holdings` 區塊字串（標題、空狀態、欄位、找不到持倉）

## 5. mobile：AssetDetail + 對帳 timeline

- [ ] 5.1 `screens/AssetDetailScreen.tsx`：從 `useHoldings` 以 route params `(market, symbol)` 取 position，顯示摘要（總股數／加權均價／總成本／幣別）；找不到時顯示 notFound 空狀態
- [ ] 5.2 對帳 timeline：該 `(market, symbol)` 的交易（從 transactionsStore 過濾）依 `transaction_date` 升冪列出（日期／股數／單價／手續費）

## 6. 驗收與 demo

- [ ] 6.1 全工作區綠燈：`prettier --check .`、`pnpm -r typecheck`、`pnpm -r lint`、shared coverage（含新 portfolio 100%）、mobile coverage、rules
- [ ] 6.2 iOS Simulator 手動驗收（🎯 §13.2 Sprint 3 驗收標準）：輸入 §4 三筆台積電買入 → 持倉清單顯示 2,500 股、均價 550.76 → AssetDetail 摘要與 timeline 正確、新增一筆 BUY 即時反映
- [ ] 6.3 錄 30 秒 demo（§13.6）；更新 PR #4 標題與描述涵蓋 Change 2（Sprint 3 統一 merge）
