## Context

ADR-0006 已拍板報價架構（Yahoo + Cloud Function 代理 + MMKV/Firestore 雙層 cache + 15min TTL；Blaze 已開通）。`apps/functions` 已有 exchange-rates function（pure-fn seam 先例：`parseBotCsv` 純函式 + 測試、I/O 薄層）。`quotes/{symbolId}` schema 見 §6（既有）。

## Goals / Non-Goals

**Goals:** 現價 + 未實現損益真值；雙層 cache（MMKV→Firestore→fetchQuote）；on-demand + pull-to-refresh；報價髒資料邊界防護（zod + sanity）；來源可替換（QuoteProvider）。

**Non-Goals:** production 部署（部署 gate）、streaming/L2、排程批次、crypto 來源、年化/TWR/IRR。

## Decisions

### D1：pure-fn seam（對齊 ADR-0007 + 既有 function）

報價驗證拆純函式：`sanitizeQuote(raw): { ok; quote } | { ok:false; reason }`（zod 形 + sanity：價 >0 且有限、時戳非未來/非過期離譜、必要欄位齊）。Cloud Function `fetchQuote` = 抓取 I/O（Yahoo）+ `sanitizeQuote`（純、先測，錄 fixture）+ 寫 Firestore（薄層）。shared 放跨端共用的 `QuoteDocument` 型別與（若跨端共用）sanity；provider-specific parse 放 functions。

### D2：雙層 cache 讀取流（services/quotes）

`getQuote(symbolId)`：MMKV 新鮮（<15min）→ 用；否則 Firestore `quotes/{symbolId}` 新鮮 → 用 + 回填 MMKV；否則 `httpsCallable('fetchQuote')` → 後端抓+寫 → 再讀 Firestore + 回填 MMKV。`refresh()`（pull-to-refresh）強制走 fetchQuote。新鮮度由 `fetched_at` + 15min TTL 判定（純函式 `isFresh(fetchedAt, now)` 可測）。

### D3：MMKV（原生模組）

新增 `react-native-mmkv` → **需 `expo prebuild` + `run:ios` 原生重建**（非 JS hot-reload）。封裝在 `services/quotes` 的 cache 層；若 prebuild 受阻，退路為 in-memory map + Firestore offline cache（記為 fallback，先以 MMKV 為準）。

### D4：dev 連線

firebase service 加 `connectFunctionsEmulator(functions, 'localhost', 5001)`（`wireEmulatorsOnce`）；emulator 跑 `--only auth,firestore,functions`。dev 全程模擬器，無需部署 / Blaze（Blaze 僅 production 部署需要）。

## Risks / Trade-offs

- **MMKV 原生重建**：prebuild/run:ios 較重、可能卡 → 有 in-memory fallback；視覺驗收前需 owner 真機/模擬器原生 build。
- **Yahoo 非官方端點**：可能變動 → QuoteProvider 介面化、sanity 擋髒資料、fixture contract test 不打外網。
- **部署 gate**：dev 模擬器可全測；production 報價需 `firebase deploy --only functions`（owner）。
- **聖牛 schema**：`quotes` 依 §6 既有定義實作；若實作中發現需偏離欄位 → 停回 owner（schema gate）。

## Migration Plan

無資料遷移（quotes 為 cache，可重建）。回滾＝revert + 不部署 function。

## Open Questions

- production 是否本輪即部署 `fetchQuote`（部署 gate）→ 預設 dev 對模擬器完成，部署待 owner 授權。
