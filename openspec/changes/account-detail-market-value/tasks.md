## 0. Owner gate（設計增修，先行）

- [ ] 0.1 owner 確認 spec A5 增修草案（design.md）：帳戶市值 hero + 成本/未實現列 + 持股列市值/報酬%。核准後才寫入 `docs/design/accounts-management/accounts-management-spec.md`（A5 增修、A2 釐清）

## 1. services/valuation：估值純函式上移 + per-position helper（TDD）

- [ ] 1.1 新建 `apps/mobile/src/services/valuation/`；將 `computeHoldingsHero` + `toDisplay`（維持 demo FX fallback 行為）由 `features/holdings` 移入；`features/holdings/holdingsHero.ts` 改 re-export 保相容
- [ ] 1.2 先寫測試：新增 `positionValuation(position, quote, rates, displayCcy)` → `{ marketValue, unrealized, returnPct } | null`（缺報價 null；過期仍算；跨幣別換算；負報酬）
- [ ] 1.3 實作 `positionValuation`；全程 `Money`
- [ ] 1.4 跑既有 `holdingsHero.test.ts` 確認上移後零行為變化；`realizedInMonth` 留在 holdings 或一併上移（擇一，保持 import 相容）

## 2. AccountDetailScreen：hero 市值化 + B 案並列

- [ ] 2.1 接線 `useQuotes` / `useRefreshQuotesOnFocus` / `useExchangeRatesStore`
- [ ] 2.2 hero：`computeHoldingsHero(positions,…)` → 帳戶市值 + 現金為「帳戶市值」；拆分小字「持股市值 · 現金」
- [ ] 2.3 新增「投入成本 · 未實現損益 ±%」列（`Pnl`）
- [ ] 2.4 降級：部分渲染 + 揭露列（更新中／查無代號／最後已知 + 重試）；全缺時市值/未實現「報價載入中…」、現金照常

## 3. AccountDetail 持股列市值化

- [ ] 3.1 每列右側改市值 + `Pnl 報酬%`（原幣別）；均價留 subtitle；缺報價「更新中…」、symbol_not_found「查無代號」；維持無色點

## 4. AccountListScreen row（A2 對齊）

- [ ] 4.1 `valueText` 改市值（`positionValuation` 合計，多幣別各列）；缺報價降級

## 5. 驗證與收尾

- [ ] 5.1 `pnpm -r typecheck` + `lint` + shared coverage（不動 shared 應維持）+ mobile test（valuation 新測 + 既有 holdingsHero 綠）
- [ ] 5.2 本機 dogfood（Emulator 種子）：帳戶詳情 hero＝市值+現金、成本/未實現列正確、持股列市值+報酬%；報價缺失時降級不以成本冒充；列表 row 市值
- [ ] 5.3 iOS Simulator 視覺對圖（AXe）：AccountDetail hero + 持股列 + AccountList row 對照核准後的 A5/A2 + 原型 —— **owner gate**
- [ ] 5.4 開 PR（stacked on fix/holdings-account-grouping）；視覺對圖過 → archive；merge 延後 owner 批次
