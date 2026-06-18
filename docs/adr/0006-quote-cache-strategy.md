# ADR-0006: 即時報價策略 — Yahoo Finance + Cloud Function 代理 + 雙層 cache（15min TTL）

- **狀態**：Accepted
- **日期**：2026-06-17
- **相關**：planning §3（股價資料：on-demand + 雙層 cache + 15min TTL）、§6 Collection 6 `quotes/{symbolId}`、§13.2 Sprint 5、ADR-0007 §5（報價來源政策：⑤a 選型屬本 ADR、⑤b 髒資料以邊界 zod + sanity 防）、ADR-0005（Money / 顯示時換算）

## Context

Sprint 5 需讓持倉顯示**現價**與**未實現損益**。報價有兩層風險（ADR-0007 §5）：⑤a 來源成本 / 可靠度（選型 / 架構），⑤b 髒資料導致全盤錯（NaN / 負數 / 0 / 過期時戳 / 離譜跳動）。MVP 為 solo「自用優先」，但設計仍要可替換來源、不把髒資料放進系統。

關鍵約束：Firebase **Spark（免費）方案禁止 Cloud Functions 對外（非 Google）發網路請求**；要由後端抓 Yahoo 必須升級 **Blaze（pay-as-you-go，含免費額度，單人 MVP 實際 ≈$0）**。owner 已開通 Blaze 並綁定帳單（2026-06-17 確認）。

## Decision

採 **planning 原設計（架構 A）：Cloud Function 代理 + 雙層 cache**。

1. **來源**：Yahoo Finance（`QuoteProvider` 介面化，`name="yahoo-finance"`）。未來可換源（Finnhub / 其他）只換 provider 實作，不動消費端。
2. **Cloud Function `fetchQuote`**（`apps/functions`，Admin SDK）：cache miss / 過期（>15min）時抓 Yahoo → **zod + sanity 驗證**（拒 NaN/≤0 價、過期時戳、離譜跳動）→ 以 `Money` 10 位小數 string 寫 `quotes/{symbolId}`（schema 見 planning §6 Collection 6，**不改 schema**）。沿用既有 exchange-rates function 的 pure-fn seam（parse / sanity 純函式先測）。
3. **雙層 cache**：① App 本機 **MMKV**（最快、離線可讀）；② Firestore `quotes/{symbolId}`（多裝置/未來多人共用、後端寫）。**TTL 15 分鐘**（對齊 Yahoo 延遲）。
4. **讀取流**：mobile `services/quotes` 先讀 MMKV（新鮮就用）→ 否則讀 Firestore `quotes/{symbolId}`（新鮮就用 + 回填 MMKV）→ 否則呼叫 `fetchQuote`（callable）觸發後端抓取 + 寫 cache → 再讀。**on-demand**（開持倉/詳情頁、pull-to-refresh 時），非排程。
5. **rules**：`quotes/{symbolId}` 維持「登入可讀、只有後端可寫」（既有 rules，無變更）。
6. **顯示**：現價/未實現損益一律 `Money`（ADR-0005）；跨幣別於顯示層換算。報價為「示意/延遲 15min」標註保留。

## Consequences

- 現價/未實現損益落地；持倉 Hero「總資產 / 今日損益」可由 demo 轉真值（後續工作）。
- 需 **Blaze**（已開通）；production `firebase deploy --only functions` 為 **部署 gate**（owner 授權 / 執行）。**dev 全程對 Functions 模擬器**（port 5001）開發測試，不需部署、不花錢。
- 多一個 Cloud Function + MMKV 依賴（mobile 新增 `react-native-mmkv`）。
- 髒資料風險以 provider 邊界 zod + sanity contract test（錄製 fixture、不打外網）守，對齊 ADR-0007 §5b。
- `quotes/{symbolId}` 為全域共用 cache：多使用者持有同 symbol 共享一份，省 API 額度。

## Alternatives Considered

- **架構 B：手機端直抓免費 API（免 Blaze）**：app 直接打 Yahoo 非官方端點 + 僅 MMKV cache，無 Cloud Function / 無 Firestore 共用 cache。最省（不綁卡）、最簡，單人 MVP 足夠。**否決理由**：owner 已開通 Blaze 並偏好 planning 正規設計；A 保留多裝置/多人共用 cache、後端把關髒資料、不暴露來源細節於 client。（B 仍記錄為「未開通 Blaze 時的退路」。）
- **moomoo / futu OpenAPI**：需在使用者電腦常駐 **OpenD gateway** + 登入券商帳號，走 socket、非雲端 REST，手機/serverless 無法直接呼叫。**否決**（架構不通）。
- **排程批次抓所有持有 symbol**：定時抓全部。**否決**：MVP on-demand 足夠、省額度，避免排程維運。
- **Alpha Vantage 免費層**（25 calls/天）：額度過低。**否決**為主來源（可列備援）。

## 增補（2026-06，change `add-quote-batch-discovery`）

架構 A 不變，於其上加兩個後端能力（仍 **on-demand / 事件驅動、非排程**，不違反上方「排程否決」）：

1. **批次讀 `fetchQuotes`（onRequest）**：mobile 開持倉頁時以**單次呼叫**取多檔（N→1），handler 重用 `getOrFetchQuote`（沿用 15min 新鮮度 + sanitize + 寫 `quotes/`），逐筆錯誤隔離。取代逐檔 `fetchQuote`（單檔端點保留）。降延遲與 function 調用數；成本不變（server 端 15min cache 仍去重，與使用者數無關）。
2. **事件驅動發現 `onSymbolCreatedFetchQuote`（`onDocumentCreated('symbols/{symbolId}')`）**：新標的首次進場（symbol 建立，多由 `fetchSymbolMeta` 寫入）即自動抓首筆報價寫 `quotes/`，使該持倉首次檢視即有現價；抓取失敗 fail-soft（log 不擲，避免重試風暴）。

**未變**：`quotes`/`symbols` schema 與 rules、報價來源（`QuoteProvider`/Yahoo）、`sanitizeQuote`、15min TTL、雙層 cache 讀取流（本機層 MMKV 仍延後，見 change `add-mmkv-quote-cache`）。**部署**：新增 function 經 `firebase deploy --only functions` 才在 production 生效＝部署 gate（owner）；dev 對 Functions 模擬器。

