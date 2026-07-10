## 0. Owner gate（設計增修，先行）

- [x] 0.1 owner 確認 spec A5 增修草案（design.md）：帳戶市值 hero + 成本/未實現列 + 持股列市值/報酬%。核准後才寫入 `docs/design/accounts-management/accounts-management-spec.md`（A5 增修、A2 釐清）

## 1. services/valuation：估值純函式上移 + per-position helper（TDD）

- [x] 1.1 新建 `apps/mobile/src/services/valuation/`；將 `computeHoldingsHero` + `toDisplay`（維持 demo FX fallback 行為）由 `features/holdings` 移入；`features/holdings/holdingsHero.ts` 改 re-export 保相容
- [x] 1.2 先寫測試：新增 `positionValuation(position, quote, nowMs)` → `{ marketValue, cost, unrealized, returnPct, stale } | null`（缺報價 null；過期仍算；負報酬；均價 0 防禦）
- [x] 1.3 實作 `positionValuation`；全程 `Money`
- [x] 1.4 跑既有 `holdingsHero.test.ts` 確認上移後零行為變化；`realizedInMonth` 一併上移 services/valuation（import 相容經 shim）

## 2. AccountDetailScreen：hero 市值化 + B 案並列

- [x] 2.1 接線 `useQuotes` / `useRefreshQuotesOnFocus` / `useExchangeRatesStore` / `useQuotesStore.errors`
- [x] 2.2 hero：`computeHoldingsHero(positions,…,base)` → 帳戶市值 = 持股市值 + 現金（現金各幣別換算進基礎幣別）；拆分小字「持股市值 · 現金」
- [x] 2.3 新增「投入成本 · 未實現 ±%」列（`Pnl`）
- [x] 2.4 降級：部分渲染 + 揭露列（更新中／查無代號／最後已知 + 無法換算幣別現金 + 重試）；全缺時市值/未實現「報價載入中…」、現金照常

## 3. AccountDetail 持股列市值化

- [x] 3.1 每列右側改市值 + `Pnl 報酬%`（原幣別）；均價留 subtitle；缺報價「更新中…」、symbol_not_found「查無代號」；維持無色點

## 4. AccountListScreen row（A2 對齊）

- [x] 4.1 `valueText` 改市值（`positionValuation` 合計，多幣別各列）；缺報價「N 檔更新中」；為所有帳戶持股聯集載入報價

## 5. 驗證與收尾

- [x] 5.1 `pnpm -r typecheck` + `lint`（綠）+ mobile test（valuation 5 新測 + 既有全綠，48/48）
- [x] 5.2 本機 dogfood（Emulator 種子 + 補種 fresh quotes）：帳戶詳情 hero＝市值+現金、成本/未實現列正確、持股列市值+報酬%；列表 row 市值——**數字逐項核對精確**（Firstrade US$21,300.42 / 群益 NT$2,843,000）
- [x] 5.3 iOS Simulator 視覺對圖（AXe）：AccountDetail hero + 持股列（USD base + TWD base 各一）+ AccountList row 對照 A5/A2 —— PASS。**owner gate＝owner merge**
- [x] 5.3b e2e 迴歸（Maestro，`--exclude-tags=devbuild-flaky`）：login/add-account/add-transaction 3/3 綠（add-account 走改動後的 AccountList 導覽）
- [ ] 5.4 開 PR（stacked on fix/holdings-account-grouping）；視覺對圖過 → archive；merge 延後 owner 批次
