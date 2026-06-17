## 1. shared：quotes 型別 + sanity 純函式（TDD）

- [ ] 1.1 先寫測試 `sanitizeQuote`：拒 0/負/NaN/Infinity 價、缺欄位、未來/離譜過期時戳；合法→Money string
- [ ] 1.2 先寫測試 `isFresh(fetchedAt, now, ttlMin=15)`：邊界（剛好 15min、>15min、未來）
- [ ] 1.3 實作 `QuoteDocument` 型別（§6）+ `sanitizeQuote` + `isFresh`；index 匯出；shared coverage gate 綠

## 2. functions：fetchQuote + QuoteProvider（pure-fn seam）

- [ ] 2.1 `QuoteProvider` 介面 + Yahoo 實作（parse 純函式先測，錄 fixture、不打外網）
- [ ] 2.2 callable `fetchQuote`：miss/過期 → provider 抓 → `sanitizeQuote` → Admin SDK 寫 `quotes/{symbolId}`
- [ ] 2.3 functions 測試（parse/sanity 純函式）；`pnpm --filter @assetanchor/functions test` 綠

## 3. mobile：services/quotes 雙層 cache + 連線

- [ ] 3.1 新增 `react-native-mmkv`（**原生 → expo prebuild + run:ios 重建**）；MMKV cache 封裝
- [ ] 3.2 firebase service 加 `connectFunctionsEmulator`（dev 5001）
- [ ] 3.3 `services/quotes.getQuote/refresh`：MMKV→Firestore→fetchQuote 讀取流（isFresh 判定）

## 4. mobile UI：現價 + 未實現損益

- [ ] 4.1 持倉 / AssetDetail 現價 + 未實現損益（金額 + %）改報價真值（取代 mock）；報價未就緒降級
- [ ] 4.2 持倉總覽 pull-to-refresh → refresh()
- [ ] 4.3 Hero「總資產 / 今日損益」以報價真值組（其餘仍示意者標明）

## 5. Definition-of-Done

- [ ] 5.1 `pnpm -r typecheck` / `lint` / `format:check` 全綠；shared/functions 測試綠
- [ ] 5.2 rules 測試綠（quotes 讀寫隔離；未動 rules 則確認零 diff）
- [ ] 5.3 起 emulator（auth/firestore/**functions**）+ Simulator（原生 build 含 MMKV）：開持倉 → 現價/未實現顯示、pull-to-refresh 生效（截圖）
- [ ] 5.4 commit + PR；帶 UI → owner 視覺對圖；🛑 production `firebase deploy --only functions` = 部署 gate（owner 授權/執行）；依延後 merge：對圖過即 archive、續做
