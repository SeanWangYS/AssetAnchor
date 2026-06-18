## Context

`symbols/{symbolId}`（planning §6 Collection 5）的 metadata 欄位（`name`/`name_zh`/`exchange`/`industry`/`sector`）早在 schema 與 `packages/shared/src/types/symbol.ts` 定義，但 mobile 從未讀寫該 collection；持倉/交易/詳情畫面的名稱來自硬編 demo map（`apps/mobile/src/features/holdings/holdingsDemo.ts` 的 `SYMBOL_META`，僅 7 檔 + raw-ticker fallback）。Sprint 5b 已建立一條可運作的「Yahoo → Cloud Function（onRequest）→ Firestore cache → mobile service」資料鏈（live-quotes，ADR-0006），本 change 沿用同一架構把 metadata 補上。schema 欄位已齊，**不動聖牛**。

約束：@react-native-firebase v24 modular；functions 用 onRequest（避開 RNFirebase Functions 原生模組，同 live-quotes）；依賴方向 features→services→shared；production deploy 為延後 gate（owner），dev 對 emulator。

## Goals / Non-Goals

**Goals:**

- 任一已輸入代號都能顯示權威公司名（`name`/`name_zh`），缺資料時優雅 fallback 成 raw ticker。
- `symbols/{symbolId}` 開始有真實生命週期：未知代號動態建立 + 後端按需 enrich。
- 移除 `holdingsDemo.ts` 的硬編名稱來源。
- shared 整形純函式達 coverage gate；rules 測試覆蓋 symbols 讀/建允許、改/刪拒絕。

**Non-Goals:**

- 代號自動補完 / 搜尋 picker（第二階段）。
- 定時 cron 批次 enrich（後續；本 change 為 on-demand）。
- `name_zh` 的完整中文化保證（Yahoo 對台股中文名不穩，best-effort，缺則降級）。
- holdings row 的「帳戶」真值化（屬 `complete-reconciliation`）。

## Decisions

### D1：外部資料源 = Yahoo `quoteSummary`，退化 fallback = chart `meta`

取 `https://query1.finance.yahoo.com/v10/finance/quoteSummary/{ySymbol}?modules=price,assetProfile,quoteType`（含 `longName`/`shortName`/`exchange`/`industry`/`sector`）。Yahoo 近期對 quoteSummary 加了 crumb/cookie 門檻——若取不到，退化用 live-quotes 已在用的 chart endpoint `meta`（含 `shortName`/`longName`/`exchangeName`/`currency`，**無** industry/sector）。metadata 為「可選填」，退化僅少 industry/sector，可接受。

- _Alternative_：只用 chart meta（最穩但缺 industry/sector）。否決——先試富集源、退化保底，兼顧豐富度與穩定。

### D2：代號 → Yahoo ticker 映射沿用 live-quotes

重用/抽出 Sprint 5b functions 既有的 `(market, symbol) → Yahoo ticker` 對映（US `AAPL`、TW `2330.TW`/`0050.TW`）。集中一處，避免兩套映射漂移。

### D3：backend `fetchSymbolMeta` 為 symbols 的單一寫入者（建立完整識別 + 補 metadata）

- client `services/symbols.ensureSymbol(market, symbol, assetType, currency)`：`getDoc` 讀取顯示用；缺文件或缺 `name` 時 fire-and-forget 觸發後端 `fetchSymbolMeta`。client **不**寫 `symbols`（避免「client 建空殼 + backend 補」競態產生缺識別欄位的畸形文件）。
- backend `fetchSymbolMeta`（onRequest）：抓 Yahoo → `normalizeSymbolMeta` → Admin SDK upsert：文件不存在則寫**完整** `SymbolDocument`（識別欄位 + `is_active:true` + `created_at` + patch）；已存在則只 merge metadata patch + `updated_at`。Admin SDK 不受 rules 限制。
- _決策修訂_（apply 階段發現）：原 D3 規劃「client create 識別 + backend enrich」，但兩寫入者競態會產生缺 `symbol_id/market/asset_type/is_active` 的畸形 symbols 文件（違反 §6 schema 形狀）。改為 backend 單一寫入者：race-safe、文件永遠符合 schema、與 live-quotes（fetchQuote 為 quotes 單一寫入者）一致。代價：function 未部署於 production（延後 gate）時 symbols 不會被建立，display fallback ticker——與 live-quotes 在 prod 未部署時的行為一致，可接受。rules 仍允許 client create/read（本 change 以測試驗證），只是 app 不走 client-create。

### D4：觸發時機 = on-demand（建立時 + 顯示缺值時），in-memory 去抖

`ensureSymbol` 在「新增交易」成功後對該代號呼叫一次；顯示層遇到 `symbols` 文件缺 `name` 時 lazy 觸發一次。以 in-memory Set/Map 記「本 session 已請求過的 symbolId」避免重複轟炸（同 live-quotes 的 in-memory cache 思路）。

### D5：整形純函式置於 `packages/shared/src/symbols/`

`normalizeSymbolMeta(raw): SymbolMetaPatch`——把 Yahoo 原始物件整形為 `Pick<SymbolDocument,'name'|'name_zh'|'exchange'|'industry'|'sector'>` 的 partial：擇優名稱欄位（longName > shortName）、trim、長度上限、非字串→空字串、全空欄位不納入 patch（不覆寫既有）。純函式、無 IO，TDD 先測再實作。

### D6：顯示名稱解析

新增 `symbolDisplayName(doc, rawSymbol)`：中文畫面優先 `name_zh`，缺則 `name`，再缺則 `rawSymbol`。holdings/transactions/AssetDetail 改吃此函式 + `symbols` store/service，`holdingsDemo.ts` 名稱 map 退役（demo 的報酬率 mock 不在本 change 範圍，另案處理）。

## Risks / Trade-offs

- **Yahoo quoteSummary 需 crumb 可能取不到** → 退化 chart meta（D1），industry/sector 暫缺；display 不受影響（只用 name）。
- **name_zh 不穩** → best-effort，缺則降級 name→symbol（D6），不阻斷顯示。
- **function 未部署於 production（延後 gate）** → 生產環境暫時只有 client 建立的識別文件、display fallback ticker；不 crash、不錯值。emulator dev 全鏈可驗。
- **client create 競態 backend merge** → backend 用 `merge:true`（create-if-absent），client 僅 create-if-absent，兩者皆冪等不衝突。
- **觸發轟炸** → in-memory 去抖（D4）。

## Migration Plan

- 無資料遷移、無 schema 變更。既有 `symbols` 文件（若有 seed）相容；新代號隨用隨建。
- 部署：functions 新增 `fetchSymbolMeta`，production `firebase deploy --only functions` 為 owner 延後 gate；dev 對 emulator（`emulators:fn`，需先 build functions）。
- Rollback：移除 endpoint 呼叫即回退到 raw-ticker 顯示，無破壞性副作用。

## Open Questions

- name_zh 對台股是否需要次級來源（如 TWSE 開放資料）？→ 本 change best-effort，若品質不足再開後續 change（cron enrich）評估。
