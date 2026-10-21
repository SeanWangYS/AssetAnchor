## 1. 原生依賴先行驗證

- [x] 1.1 `npx expo install react-native-mmkv react-native-nitro-modules`；本機 prebuild / pod install，模擬器 build 成功並能啟動（失敗即暫停回報 owner）

## 2. shared：現金流帳戶篩選（TDD）

- [x] 2.1 `cashFlows.test.ts` 補測試：`accountIds` 篩選（單一帳戶、多帳戶集合、與 symbol 併用、空集合回空）→ 實作 `filter.accountIds`

## 3. mobile：純函式（TDD：先測試、再實作）

- [x] 3.1 `services/localPrefs`：`parseHoldingsSort` 測試（有效值、未知欄位、錯誤方向、壞 JSON、`undefined`）→ 實作 parse + MMKV read/write（parse 拆為不依賴 MMKV 的純函式檔，故不需 manual mock）
- [x] 3.2 抽出 `fxReadyFor` 共用 helper（自 `portfolioReturn.ts`），既有 `portfolioReturn` 測試維持全綠
- [x] 3.3 `holdingsTable.test.ts`：列指標（顯示幣別換算、報酬% 原幣別、今日漲跌% 僅新鮮、佔比用全組合、缺報價 pending / not_found）→ 實作 `buildHoldingRows`
- [x] 3.4 `holdingsTable.test.ts`：分組（持股無標題、帳戶依真實帳戶且未分類置底、類別依市場、組小計顯示幣別、依小計排序）→ 實作 `buildTableSections`
- [x] 3.5 `holdingsTable.test.ts`：排序（各欄降 / 升冪、代號首次升冪、null 置底、同值以代號）→ 實作 `sortRows`；加入 mobile coverage 名單

## 4. mobile：UI

- [x] 4.1 `HoldingsTable` 元件：凍結欄 + 單一水平 ScrollView、表頭（點擊排序 + `▼/▲`）、組標題列、資料列（按下態兩側同步、點擊進 AssetDetail）、無邊線、固定欄寬
- [x] 4.2 `useHoldingsSort` hook（MMKV 讀寫）與個股年化組裝（帳戶範圍 filter、`fxReadyFor`）
- [x] 4.3 screen 換上表格；移除 `HoldingRow`、`subtotalText`、舊 `buildSections`、`grandCost` 與「總成本」行；觸及註解改英文

## 5. 驗證（DoD）

- [x] 5.1 `pnpm -r typecheck`、`pnpm -r lint`、`pnpm exec prettier --check .`、shared / mobile `test:coverage` 全綠
- [x] 5.2 模擬器對圖（對照 mock，owner gate）：(a) 預設市值降冪 (b) 左右滑動代號固定 (c) 點標題排序與反向 (d) 重啟 App 排序沿用 (e) 帳戶分組小計與年化只算該帳戶 (f) 類別分組 (g) USD 顯示 (h) 查無代號列；截圖存 `docs/qa/holdings-table-evidence/`
- [x] 5.3 E2E `regression-quote-not-found` 斷言字樣仍存在（「查無代號」）

## 6. 收尾

- [x] 6.1 commit（英文）→ push → PR（帶 UI + 新原生依賴 → owner merge）
- [x] 6.2 CI 綠 → `/opsx:archive`（新 spec `holdings-table`；sync `holdings-derivation`、`currency-display`、`portfolio-returns`）
