## Why

Sprint 5 下半（§13.2「賣出 + 報價」之報價部分）。持倉目前看不到**現價**與**未實現損益**（市值/今日損益仍為 demo 示意）。本 change 接上即時報價，讓 MVP 驗收標準「正確計算每隻股票/ETF 的現貨價值、成本、報酬率」成立。架構與來源已由 **ADR-0006** 拍板（Yahoo + Cloud Function 代理 + MMKV/Firestore 雙層 cache + 15min TTL；owner 已開通 Blaze）。

## What Changes

- **shared `quotes` 型別 + sanity 純函式**（TDD）：`QuoteDocument` 型別（對齊 §6 Collection 6）；報價邊界驗證純函式（zod + sanity：拒 NaN/≤0 價、過期時戳、離譜跳動），對齊 ADR-0007 §5b。
- **`apps/functions` `fetchQuote`（callable）**：cache miss/過期時抓 Yahoo → sanity → 以 `Money` 10 位小數 string 寫 `quotes/{symbolId}`（Admin SDK）。沿用既有 exchange-rates function 的 pure-fn seam（parse/sanity 先測、I/O 薄層）。`QuoteProvider` 介面 + Yahoo 實作（可替換來源）。
- **mobile `services/quotes`**：雙層 cache 讀取流（MMKV → Firestore `quotes` → 呼叫 `fetchQuote`）；on-demand（開持倉/詳情、pull-to-refresh）。新增 `react-native-mmkv`（**原生模組 → 需 prebuild**）。
- **mobile 連線**：firebase service 加 `connectFunctionsEmulator`（dev 連本地 functions 模擬器 5001）。
- **holdings/AssetDetail UI**：現價 + 未實現損益（金額/%）改真值（取代 mock）；持倉總覽 pull-to-refresh；Hero「總資產/今日損益」由報價真值組（其餘仍示意者標明）。

## Capabilities

### New Capabilities

- `live-quotes`: 即時報價的取得、驗證、雙層 cache 與消費——`fetchQuote` Cloud Function、`QuoteProvider` 介面、報價 sanity 驗證、`services/quotes` 雙層 cache 讀取流、現價/未實現損益顯示與 pull-to-refresh。

### Modified Capabilities

- `currency-display` / `holdings-derivation`：持倉現價/市值/未實現損益由 demo 改報價真值（消費 `live-quotes`）；持倉總覽新增 pull-to-refresh。（細節於 apply 階段補 delta；本提案先記架構。）

## Impact

- **程式碼**：`packages/shared`（quotes 型別 + sanity 純函式 + 測試）；`apps/functions`（`fetchQuote` + QuoteProvider + 測試）；`apps/mobile`（`services/quotes` + MMKV、firebase functions emulator 接線、holdings/AssetDetail 現價/未實現、pull-to-refresh）。
- **Firestore schema**：`quotes/{symbolId}` **依 §6 既有定義**實作（聖牛——但為既有定義，非新增/變更欄位；如需偏離須回 owner gate）。
- **Firestore rules**：`quotes` 維持「登入可讀、只有後端可寫」（既有，無變更）。
- **依賴**：新增 `react-native-mmkv`（原生）；`firebase-functions` / Admin SDK（functions 既有）。
- **gate**：🛑 production `firebase deploy --only functions` = **部署 gate**（owner 授權/執行）；dev 全程對 Functions 模擬器，不部署、不花錢。帶 UI → owner 視覺對圖。

## Non-goals

- 公司行動報價（配息/拆股調整）、盤中 streaming、Level 2 / 深度報價。
- 排程批次抓取（採 on-demand）。
- 加密貨幣報價（MVP 持倉為股/ETF；crypto 來源 CoinGecko 待第二階段）。
- production 部署本身（部署 gate，owner）；真機 / Google 登入驗收（已延後至 Apple 通過後）。
- 年化 / TWR / IRR（§4 第二階段）。
