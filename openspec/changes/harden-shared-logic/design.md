## Context

兩項 post-MVP 技術債（backlog）。皆為 `packages/shared` 純函式工作 + mobile 消費端微調，無 UI / schema / 相依變更。沿用 shared 測試紀律（TDD、coverage gate）。

## Goals / Non-Goals

**Goals:** 分析聚合可測化（移 shared）；舊資料缺欄位不再 crash（Money 邊界 fail-soft）；行為保持。

**Non-Goals:** 分析頁真實化、Money 精度語意變更、舊資料遷移。

## Decisions

### D1：shared `analysis` 收「資料來源無關」的聚合，mock 留 mobile

shared 提供 `aggregateHoldings(rawHoldings, rates, base='TWD')` + 型別（`RawHolding`/`AnalysisHolding`/`AnalysisTotals`/`ClassRollup`/`AnalysisAggregate`）+ `returnPercent`。mobile `analysisData.ts` 保留 `RAW_HOLDINGS`（mock）/`DEMO_RATES`，改呼叫 shared——分析資料來源（mock vs 未來真實）的決策留在 mobile，聚合數學歸 shared。

- _Alternative_：把 mock 也搬進 shared。否決——mock 是 mobile 展示用、非 domain 邏輯。

### D2：`toSafeDecimalString` 只對「缺值」fail-soft，「損毀」仍 fail-loud

新增純函式 `toSafeDecimalString(value: string|undefined|null, fallback='0')`：**僅** `undefined`/`null` → `fallback`；**present 值（含非法字串）原樣通過**，交由 `Money.fromDecimalString` fail-loud。`deriveHoldings` 的 `tx.total/fee/tax/quantity` 讀取套用。

- **關鍵分界**（apply 階段被既有測試「fails loud on corrupted money fields」抓到）：原設計把「非字串/空白/非法」也歸零，會弱化 ADR-0007 §5b 的 fail-loud 紀律（`'Infinity'` 應擲錯而非靜默 0）。修正為「**缺欄位**（欄位不存在）＝歷史遺留→歸 0；**存在但非法**＝corruption→擲錯」。
- _Alternative_：跳過整筆缺欄位的 tx。否決——「缺值視為 0」較不丟資料（其他欄位仍計入）、行為可預期。

## Risks / Trade-offs

- **掩蓋真正的髒資料**：fail-soft 可能讓真正異常的 doc 靜默計為 0。緩解：僅 pre-ADR-0005 舊 doc 場景；新寫入仍由 zod schema 守門（必填），故只在「歷史遺留」邊界生效。
- **重構行為漂移**：以「與重構前數值一致」scenario + 既有分析頁 typecheck 守。

## Migration Plan

無資料遷移。純函式抽取 + 邊界防禦。Rollback＝還原 import 來源。
