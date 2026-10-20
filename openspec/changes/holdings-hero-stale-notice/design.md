## Context

持倉總覽 hero（`HoldingsOverviewScreen.tsx`）目前由上到下：label「持股市值（{ccy}）」→ 大數字 → 變動行（`▲ 未實現 +% 全期`）→ 降級揭露列（`N 檔報價更新中 · N 檔查無代號 · 部分為最後已知報價（延遲）` + 重試，僅異常時）→ 灰色說明行（含 `quotesAsOf`＝「最後更新 HH:mm · 延遲 15 分鐘」與「不含現金」）。

`quotesAsOf` 取 `quoteTargets` 報價的 **`Math.max(fetchedAtMs)`**，且 `formatDisplayTime` 只輸出 `HH:mm`。2026-07-18 的 design 明言「混齡由『部分為最後已知報價』補充」。2026-09 停更事件證明此組合失效：最新一檔的時間不代表整體、沒有日期使停更一個月仍像當天、揭露文字太溫和。

設計依據：`docs/design/holdings-overview/holdings-overview-spec.md` D7/D8（PR #78）與 `holdings-redesign-mock.html`。

## Goals / Non-Goals

**Goals:**

- hero 平常只剩 label + 大數字（D7）。
- 後端停止更新時，使用者打開 App **一眼看出**數字是舊的，且知道舊多久（D8）。
- 分級邏輯為 shared 純函式（TDD、coverage gate）；UI 只做呈現。

**Non-Goals:**

- 帳戶詳情、分析頁、AssetDetail 的過期揭露（維持現狀）。
- 報價抓取流程（`quotesStore` / functions）任何改動。
- XIRR bento、持股表格（後續 change）。

## Decisions

### D1：以「最舊」報價判定，而非「最新」

分級取持有標的報價的 `min(fetchedAtMs)`。最新值只能證明「至少一檔曾成功」，無法偵測「多數失敗」；最舊值才反映「有沒有資料過期」。

- 替代方案：中位數 / 過期檔數比例 → 規則難解釋、門檻難定，捨棄。
- 文案依「全部 vs 部分」區分（見 D4），避免單一檔異常時以它的天數描述整體。

### D2：門檻 1 小時 / 24 小時（不沿用 15 分鐘 TTL）

15 分鐘 TTL 是 cache 判定，正常使用下（App 在背景、剛回前景、網路慢）常短暫越過，若照此提示會成為雜訊、違背「平常完全隱藏」。1 小時以上幾乎只會在後端失敗時發生；24 小時以上確定是事故。常數放 shared（`QUOTE_STALE_SOFT_MS`、`QUOTE_STALE_HARD_MS`），與 `QUOTE_TTL_MINUTES` 並列。

- `fetched_at`＝後端成功抓價時間，休市/週末仍會隨 App 開啟刷新，故不會因休市誤報。

### D3：shared 新增分級函式與日期時間格式

- `packages/shared/src/quotes/staleness.ts`：`classifyQuoteStaleness(fetchedAtMs: readonly number[], nowMs: number)` → `{ level: 'fresh' | 'soft' | 'hard'; oldestMs: number | null; ageDays: number; hardCount: number; total: number }`。輸入只有時間戳（不涉 Money）；未來時戳以 `max(0, now − t)` 夾住；空集合回 `fresh`。
- `packages/shared/src/format/date.ts`：新增 `formatMonthDayTime(date)` → `M/D HH:mm`。`formatDisplayTime` 保留（AssetDetail 仍用）。
- 兩者 TDD，先寫測試再實作。

### D4：文案組裝放 mobile 純函式

`apps/mobile/src/features/holdings/staleNotice.ts`：`staleNoticeFor(staleness)` → `null | { kind: 'soft'; text } | { kind: 'hard'; text }`。

- soft：`報價更新於 ${formatMonthDayTime(oldest)}`
- hard 且 `hardCount === total`：`報價已 ${ageDays} 天未更新（停在 ${formatMonthDayTime(oldest)}）`
- hard 且部分：`${hardCount} 檔報價已逾 1 天未更新`

UI 字串為繁中、屬 mobile（shared 不放 UI 文案）。有對應 jest 測試（mobile `test:coverage` 的純邏輯 path-glob 涵蓋），screen 本身依 ADR-0007 不寫 RNTL。

### D5：hero 呈現

- 刪除變動行與灰色說明行；`quotesAsOf`（max）memo 移除，改為以 `quoteTargets` + `quoteFor` 收集 `fetchedAtMs` 後呼叫 D3（**不得掃描整個 store**，延續 07-18 的教訓：已出清標的舊報價會污染結果）。
- soft：大數字下淡色小字（11.5px、`textWeak`）。
- hard：橙色警示框（`warning` 色 12% 底 / 35% 邊、12.5px）+ 右側「重試」（呼叫既有 `onRefresh`，force）；大數字 `opacity: 0.55`。
- 既有降級列保留「N 檔報價更新中 / N 檔查無代號」+ 重試；**移除**其中「部分為最後已知報價（延遲）」片段（由兩級提示取代，避免雙重訊息）。`hero.anyStale` 仍供今日損益「—」判定，不動。
- 被刪除的口徑說明（市值/今日依即時報價計算、延遲約 15 分鐘、不含現金、成本與已實現來自實際交易）改寫為英文註解置於 hero 區（憲法 #10）。

### D6：新增 `warning` 色 token

`colors.warning = '#F5A623'`（與 `categoryPalette` CRYPTO amber 同值，但語意獨立，避免日後改圖表色牽動警示色）。

### D7：「現在時間」的重新評估

分級依賴 `Date.now()`：screen 每次 render 重算；另加 60 秒 interval（僅 screen 掛載期間）觸發重算，使 App 長時間停在本頁時也會從 fresh 進到 soft/hard。成本為每分鐘一次輕量 render，可接受。

**此 tick 不得產生任何 I/O（零 Firestore 讀取、零 function 呼叫）**：interval 只更新本地 `now` state。已查證 re-render 不會連帶觸發報價載入——`useQuotes`（`quotesStore.ts`）與 `useRefreshQuotesOnFocus` 的 effect 只依 `depKey`（持股代號串接字串）與 focus / AppState，持股不變則不重跑；實作時 SHALL NOT 把 `now` 或 interval 接到 `loadFor`。觸發外呼的時機維持不變（focus、回前景、持股變動、pull-to-refresh），另加 hard 警示的「重試」（＝一次強制刷新，同 pull-to-refresh）。

## Risks / Trade-offs

- [單一冷門標的長期抓不到（transient 但持續）→ 每次都出現橙色警示] → 文案改為「N 檔報價已逾 1 天未更新」、可點重試；若真持續，屬應修的資料問題，提示有其價值。
- [移除「不含現金」註腳（P1-4 曾補）可能讓新使用者誤會 hero 含現金] → owner 2026-10-21 明確決定；label「持股市值」已表達口徑；分析頁仍保留註腳。
- [15 分鐘 ~ 1 小時之間過期不提示] → 今日損益在任何過期時仍顯示「—」（既有規則），數字面不會誤導。
- [裝置時間錯誤] → 未來時戳夾成 0；過去方向的錯誤無法偵測，與既有 `isFresh` 同等限制。

## Migration Plan

純 app 端 UI + shared 純函式，無 schema / rules / functions 變更，無資料遷移。隨下一次 TestFlight build 發布；回滾＝revert PR。

## Open Questions

（無；文案與門檻已依 PR #78 spec D8 定案，「部分標的」文案為本 design 補充，視覺對圖時由 owner 確認。）
