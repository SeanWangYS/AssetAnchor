## 1. shared：跨帳戶分組推導純函式（TDD）

- [ ] 1.1 先寫測試 `deriveHoldingsByAccount.test.ts`：多帳戶分流（各帳戶只含自己交易的持倉）、orphan `account_id` 歸「未分類」群、跨帳戶同 symbol 於兩群各成一列（各自股數/均價）、skipped 髒 symbol 隔離不整組失敗、空交易/空帳戶 → 空集合、群排序依傳入帳戶序且「未分類」殿後
- [ ] 1.2 實作 `deriveHoldingsByAccount(transactions, accounts)`：逐帳戶復用既有 `deriveHoldingsForAccountSafe`；orphan 彙整為 `{ accountId: '', accountName: '未分類' }`；只回傳 positions 非空的群；全程 `Money`、無 IO
- [ ] 1.3 由 `packages/shared` 匯出型別 `AccountHoldingsGroup`；`pnpm --filter @assetanchor/shared test:coverage` 維持 >90%

## 2. mobile：holdingsHero 抽出「本月已實現」純函式（TDD）

- [ ] 2.1 先寫測試：`realizedInMonth(events, monthPrefix, rates, displayCcy)` — 月邊界（`2026-06-30` vs `2026-07-01`）、跨年（12→1 月）、多幣別事件換算加總、負值加總、空集合回 `Money.zero`
- [ ] 2.2 實作 `realizedInMonth` 置於 `holdingsHero.ts`；行為與現 inline useMemo 等價（本地時間 monthPrefix、`startsWith` 過濾、`toDisplay` 換算）

## 3. mobile：HoldingsOverviewScreen 分群接線

- [ ] 3.1 增讀 `useAccountsStore`（features/accounts）取帳戶清單（沿用本檔既有跨 feature store 讀取慣例）
- [ ] 3.2 「帳戶」模式改用 `deriveHoldingsByAccount(transactions, accounts)` 產生 sections：標題 = `accountName` + 檔數 + 原幣別小計（沿用既有 `subtotalText`，套該群 positions）；無顏色圓點（spec D3）
- [ ] 3.3 「持股」「類別」模式維持用扁平 `positions` 不變
- [ ] 3.4 「未分類」群顯示於最後；若該群含 skipped，標題揭露「N 檔資料異常」（比照 AccountDetail）
- [ ] 3.5 移除 `accountOf` 的 import 與呼叫

## 4. mobile：本月已實現損益 bento 空狀態

- [ ] 4.1 bento 改用 `realizedInMonth`；當該月 events 過濾後為空 → 顯示中性空狀態（灰「—」或「本月無賣出」，比照今日損益 pending 樣式），不渲染綠 `▲ NT$ 0`
- [ ] 4.2 有事件（含加總恰為 0）才走 `Pnl`；文案沿用既有繁中字串慣例（screen 內，無新 i18n 鍵）

## 5. mobile：AssetDetailScreen「帳戶分布」

- [ ] 5.1 `accountOf(symbol)` → 從交易篩該 `(market, symbol)` 的 `account_id` 對應 `account_name`（去重、多帳戶以「、」連接、找不到 → 「未分類」）；維持無色塊

## 6. 清 demo 債

- [ ] 6.1 刪 `holdingsDemo.ts` 的 `DEMO_ACCOUNT` 與 `accountOf`（含富邦/IBKR 硬編）；確認全 repo 無其他引用（grep）
- [ ] 6.2 匯率 demo fallback（`toDisplay` 1 USD=30.95）**不動**（屬後續 `account-detail-market-value` change）

## 7. 驗證與收尾

- [ ] 7.1 `pnpm --filter @assetanchor/shared test:coverage`（>90%）+ `pnpm -r typecheck` + `pnpm -r lint` 全綠
- [ ] 7.2 本機 dogfood（Emulator，可用種子多帳戶）：「帳戶」模式每檔歸到真實帳戶、無「富邦/IBKR」幽靈帳戶、orphan 進「未分類」；「本月已實現損益」無賣出時顯示中性而非綠▲0
- [ ] 7.3 Maestro E2E（`apps/mobile/.e2e/`）：登入 → 持倉 → 切「帳戶」→ 斷言真實帳戶名出現、無 demo 帳戶名（視需要新增 flow）
- [ ] 7.4 iOS Simulator 逐畫面視覺對圖（持倉「帳戶」分群 + AssetDetail 帳戶分布）對照 `docs/design/holdings-overview/holdings-overview-spec.md` §3.1/§3.2 —— **owner gate**
- [ ] 7.5 Conventional Commits 分批 commit（scope: mobile / shared）；開 PR；（帶 UI）archive 後續做下一個 change，merge 延後由 owner 批次執行
