## 1. shared — metadata 整形純函式（TDD）

- [x] 1.1 寫 `packages/shared/src/symbols/symbolMeta.test.ts`：擇優名稱（longName>shortName）、trim、長度上限、非字串→空字串、全空欄位不納入 patch（先寫測試，紅燈）
- [x] 1.2 實作 `normalizeSymbolMeta(raw): Partial<Pick<SymbolDocument,'name'|'name_zh'|'exchange'|'industry'|'sector'>>` 通過 1.1（綠燈）
- [x] 1.3 寫 `symbolDisplayName(doc, rawSymbol)` 測試 + 實作：name_zh > name > rawSymbol 解析（純函式）
- [x] 1.4 從 `packages/shared/src/symbols/index.ts` 匯出，掛上 `packages/shared/src/index.ts`；`pnpm --filter @assetanchor/shared test:coverage` 綠（100%，含 coverage gate）

## 2. functions — Yahoo metadata provider + endpoint（對 emulator）

- [x] 2.1 寫 `parseYahooSymbolMeta` 單元測試（quoteSummary 完整/退 quoteType/缺 result；chart-meta fallback）— 6 tests 綠
- [x] 2.2 實作 `yahooSymbolMetaProvider`：quoteSummary 為主、chart `meta` 退化 fallback；重用 `toYahooSymbol` 映射
- [x] 2.3 實作 `fetchSymbolMeta`（onRequest）+ `upsertSymbolMeta`（design D3：backend 單一寫入者，create 完整識別 / 既有 merge metadata）；查無→`found:false` 非錯誤。typecheck + build 綠
- [x] 2.4 對 emulator（`emulators:fn`）驗證：fresh US_NVDA → `created:true/found:true`（name="NVIDIA Corporation"、exchange="NasdaqGS"，chart-meta 退化 fallback 生效）；再呼叫 idempotent `created:false`；bad input 400

## 3. firebase — rules 驗證/測試

- [x] 3.1 檢視 `firestore.rules` 既有 `symbols/{symbolId}`：登入可讀/可 create、update/delete=false——既有規則已相容 backend-as-writer（Admin SDK 不受 rules 限），**無需改 rules**
- [x] 3.2 強化 rules 測試：登入可讀+建、client update/delete 被拒、未登入讀/建被拒；`test:rules` 17 tests 綠

## 4. mobile — services/symbols + 顯示接真值

- [x] 4.1 新增 `apps/mobile/src/services/symbols/`：`useSymbols`/`ensureSymbol`/`symbolNameOf`/`symbolEnglishOf`/`symbolTargetsFromTransactions`；讀 `symbols/{symbolId}`、缺 name→觸發 enrich 後回讀，module-level Set in-memory 去抖（design D3：client 不寫 symbols）
- [x] 4.2 接線 `fetchSymbolMeta` 呼叫（沿用 `functionsBaseUrl` emulator URL 切換，同 live-quotes）
- [x] 4.3 新增交易成功後對該代號呼叫 `ensureSymbol`（AddTransaction onSubmit，fire-and-forget）
- [x] 4.4 holdings overview（enrich+顯示）/ AssetDetail / AssetTransactions（唯讀顯示）名稱改吃 `symbols` + `symbolNameOf`；缺值 fallback ticker
- [x] 4.5 移除 `holdingsDemo.ts` 硬編 `SYMBOL_META` 名稱來源 → 改 `DEMO_ACCOUNT`/`accountOf`（帳戶屬對帳 change）；mock 報酬率 / avatarColor 等非本 change 範圍者保留

## 5. Definition of Done（過 gate 前）

- [x] 5.1 `pnpm -r typecheck`、`pnpm -r lint`、`pnpm format:check` 全綠；shared 203 + functions 18 + rules 17 tests 綠
- [x] 5.2 emulator 端到端（後端鏈）：`fetchSymbolMeta` create+enrich+idempotent 驗證如 2.4。🛑 全 app iOS Simulator 視覺對圖（持倉/詳情顯示真名）= owner gate
- [ ] 5.3 更新進度記憶（Sprint 6 起跑、本 change 狀態）
- [ ] 5.4 commit（Conventional Commits, scope: shared/functions/firebase/mobile）+ 開 PR；🛑 留 owner：iOS Simulator 視覺對圖（ADR-0008）+ production functions 部署（延後 gate）
