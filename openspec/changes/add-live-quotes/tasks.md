## 1. shared：quotes 型別 + sanity 純函式（TDD）

- [x] 1.1 測試 + 實作 `sanitizeQuote`：拒 0/負/NaN/Infinity 價、缺欄位；合法→Money string（15 tests）
- [x] 1.2 測試 + 實作 `isFresh(fetchedAt, now, ttl=15)`：邊界（=15min、>15min、未來）
- [x] 1.3 復用既有 `QuoteDocument`（types/quote.ts）；index 匯出；shared coverage gate 綠

## 2. functions：fetchQuote + QuoteProvider（pure-fn seam）

- [x] 2.1 `parseYahooChart`（純函式 + fixture 測試）+ `toYahooSymbol`；`yahooProvider`（v8 chart keyless）
- [x] 2.2 `fetchQuote`：miss/過期 → provider → `sanitizeQuote` → Admin SDK 寫 `quotes/{symbolId}`
      （**採 onRequest HTTP 而非 onCall**，免 mobile RNFirebase functions 原生模組；對齊 seedUsdRate）
- [x] 2.3 functions typecheck/lint/test 綠（12 tests）

## 3. mobile：services/quotes 雙層 cache + 連線

- [x] 3.1 ~~react-native-mmkv~~ → **本輪用 in-memory + Firestore cache**（MMKV 原生模組需 prebuild，
      列為後續 native-build 增強；重啟由 Firestore cache 在 TTL 內回填，行為近似）
- [x] 3.2 firebase service 加 `functionsBaseUrl`（dev→模擬器 5001 / prod→雲端）；以 `fetch` 觸發
- [x] 3.3 `services/quotes`：`loadFor`（in-memory→Firestore→fetchQuote）+ `useQuotes` hook + `quoteFor`

## 4. mobile UI：現價 + 未實現損益

- [x] 4.1 AssetDetail 現價/市值/未實現損益/報酬% 改報價真值；報價未就緒降級「報價未就緒」
- [x] 4.2 持倉總覽 pull-to-refresh（RefreshControl → loadFor force）+ 列 row 市值/報酬% 讀報價
- [ ] 4.3 持倉 Hero「總資產 / 今日損益」報價真值彙總 + AssetDetail 今日%（需 prevClose plumbing）→ **後續**（暫 demo 示意）

## 5. Definition-of-Done

- [x] 5.1 `pnpm -r typecheck` / `lint` / `format:check` 全綠；shared/functions/mobile 測試綠
- [x] 5.2 rules 未動（`quotes` 既有「登入可讀、後端可寫」，`firebase/` 僅加 `emulators:fn` script，rules 零 diff）
- [ ] 5.3 owner：`pnpm --filter @assetanchor/functions build` → `pnpm --filter @assetanchor/firebase emulators:fn`（含 functions 5001）+ Simulator 開持倉 → 現價/未實現顯示、pull-to-refresh（owner 視覺對圖）
- [ ] 5.4 commit + PR（堆疊在 5a 上）；帶 UI → owner 視覺對圖；🛑 production `firebase deploy --only functions` = 部署 gate（owner 授權/執行）
