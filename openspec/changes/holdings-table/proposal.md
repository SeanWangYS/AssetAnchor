## Why

持倉總覽的持股清單是兩段式 row（代號/名稱 + 「N 股 · 均價 X」+ 市值/報酬%），owner 回饋「太雜亂、無法一眼辨別是什麼意思」：數字沒有欄名、混幣別、無法比較。owner 2026-10-21 拍板改為**凍結代號欄 + 整表同步橫向捲動、可排序的表格**（design spec D10，互動原型 `holdings-redesign-mock.html`），並同時移除清單上方的「總成本」行。這是 B 階段 UI 改版的最後一項，並重用 change ⑤ 的 `returns` 模組提供個股年化。

## What Changes

- **持股清單改為表格**：凍結首欄只放代號；其餘欄 `市值 │ 報酬% │ 未實現 │ 今日漲跌% │ 現價 │ 股數 │ 均價 │ 成本 │ 佔比 │ 年化` 與表頭所有列同步左右捲動；每檔一行；無邊線；不加可滑動提示；點任一列仍進 AssetDetail。
- **全部金額欄（含現價、均價）跟顯示幣別**（TWD/USD，最新匯率換算）；「佔比」分母為整個組合；「今日漲跌%」僅新鮮報價顯示；缺報價列顯示「更新中…」/「查無代號」。
- **個股年化**：沿用 `buildCashFlows` + `summarizePerformance`；「帳戶」分組時**只算該帳戶的交易**（owner 2026-10-21）；AYI < 1 年顯示累積報酬並加淡色 `*`。`buildCashFlows` 的篩選擴充為可指定帳戶。
- **排序**：點欄位標題排序（首次降冪、代號欄升冪、再點反向，表頭 accent `▼/▲`），預設市值高→低；三種分組共用、組內各自排序；無值者固定排最後。
- **排序記憶（本機）**：新增原生依賴 `react-native-mmkv`（+ `react-native-nitro-modules`），以本機 key-value 保存排序選擇（owner 2026-10-21 選定；ADR-0006 原本就規劃 MMKV 為本機層）。
- **分組保留**（持股 / 帳戶 / 類別）：組標題列凍結欄放組名，「市值」欄對齊組小計（**顯示幣別市值**，取代原幣別小計），下一欄 `N 檔`；組依小計高→低（帳戶模式「未分類」仍置底）。「類別」標題改為市場名（金額已統一顯示幣別，不再附原幣別）。
- **BREAKING（UI）**：移除清單上方「總成本（{幣別}）」grand total 行與各組原幣別小計。

## Capabilities

### New Capabilities

- `holdings-table`：持倉總覽持股表格——欄位與格式、凍結欄與同步橫捲、分組列、排序與本機記憶、降級顯示。

### Modified Capabilities

- `holdings-derivation`：「持倉清單檢視（HoldingsOverview）」改為表格與顯示幣別；「持倉清單『帳戶』分群依真實帳戶」的組標題小計改為顯示幣別市值。
- `currency-display`：「持倉總覽跨幣別總成本合計」移除 grand total 與原幣別小計（切換鈕＝偏好控制不變）。
- `portfolio-returns`：「現金流建構」新增依帳戶篩選（個股年化欄的呈現規則定義於 `holdings-table`）。

## Impact

- **程式碼**：`apps/mobile/src/features/holdings/`（新表格元件、排序純函式、row 指標純函式、screen 清單區）；`apps/mobile/src/services/`（新 MMKV 本機偏好 service）；`packages/shared/src/returns/cashFlows.ts`（帳戶篩選）。
- **依賴**：`react-native-mmkv`、`react-native-nitro-modules`（原生模組 → 需重新 prebuild / pod install；模擬器重 build；下次 TestFlight 需新 build）。
- **不動**：Firestore schema / rules、Cloud Functions、`deriveHoldings` 推導邏輯、AssetDetail。
- **依據**：`docs/design/holdings-overview/holdings-overview-spec.md` D10 + mock；planning §3（持倉總覽為核心畫面）、§5（顯示時換算，ADR-0005）、§11（導航：點列進 AssetDetail）、§13.4（純函式 TDD）。
- **Gate**：帶 UI → owner merge + 模擬器對圖；新增原生依賴屬跨 change 技術決策（owner 已拍板 MMKV）。

## Non-goals

- 欄位自訂顯示/隱藏、拖曳調整欄寬或欄序。
- 表格內直接編輯、滑動刪除等列操作。
- 以 MMKV 做報價本機快取（ADR-0006 的 `add-mmkv-quote-cache` 另案；本 change 只建立本機偏好 service）。
- 帳戶詳情頁持股列改表格（維持現狀）。
