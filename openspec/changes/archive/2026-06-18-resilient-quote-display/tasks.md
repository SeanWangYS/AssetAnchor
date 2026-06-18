## 1. quotesStore：過期報價保留 + stale 判定（⑤ 資料層）

- [x] 1.1 `quotesStore.loadFor`：Firestore 讀到報價時無論新鮮與否都回填 store（過期不再丟棄），過期者仍於背景觸發 `fetchQuote`，成功則覆蓋為新鮮值
- [x] 1.2 新增取用輔助：以 `isFresh(entry.fetchedAtMs, now)` 衍生 `stale` 判定 + asOf（entry.fetchedAtMs）供消費端用（不改 Firestore schema、不新增 `quotes` 欄位）
- [x] 1.3 確認 in-memory 既有報價在背景刷新失敗（fetch 回 null）時不被清掉（維持最後已知值）

## 2. 載入時機：focus + 回前景（① 觸發層）

- [x] 2.1 新增可重用 hook `useRefreshQuotesOnFocus(targets)`：`useFocusEffect` 內呼叫 `loadFor(targets)`（非 force）
- [x] 2.2 同 hook 掛 `AppState` `change` 監聽，於 `active` 時呼叫 `loadFor`；cleanup 內 `subscription.remove()`
- [x] 2.3 hook 內加最小間隔節流（5s），避免快速切分頁短時間重複呼叫
- [x] 2.4 `HoldingsOverviewScreen` 與 `AssetDetailScreen` 接上該 hook（force 仍只保留給 pull-to-refresh）

## 3. 彙總部分渲染 + 今日損益新鮮度邊界（④③ 顯示層）

- [x] 3.1 抽純函式 `computeHoldingsHero` + 單元測試（7 cases：全新鮮 / 部分缺 / 過期 / 全缺 / 空 / rates=null / 跨幣別），斷言 `value/cost/unrealized/returnPct/pendingCount/anyStale/today/todayKnown`（ADR-0007 獎盃模型）
- [x] 3.2 `hero` 由「任一缺值 return null」改為部分渲染（呼叫純函式）：可算者累加、缺者計入 `pendingCount`；含 `pendingCount`/`anyStale`
- [x] 3.3 `grandCost` 同改：以可換算持倉加總，不因單檔換算失敗整體回 `null`（rates=null 才回 null）
- [x] 3.4 今日損益新鮮度邊界：僅新鮮報價納入今日漲跌；含過期或缺 `prevClose` 時 `todayKnown=false`，彙總今日損益僅全數新鮮才呈現否則「—」
- [x] 3.5 僅在「納入彙總數 === 0」時回 null → 顯示「報價載入中…」（唯一仍顯示載入中的情形）

## 4. 降級 UI 標示（⑤ 顯示層）

- [x] 4.1 Hero 在 `anyStale` 時標示「部分為最後已知報價（延遲）」+ 重試入口（重試＝force `loadFor`）
- [x] 4.2 Hero 在 `pendingCount > 0` 時標示「N 檔報價更新中」
- [x] 4.3 個股詳情（`AssetDetailScreen`）過期時標示「最後更新 HH:MM · 延遲」、今日列僅新鮮才顯示；缺報價顯示「更新中…」而非「報價未就緒」
- [x] 4.4 文案沿用既有繁中字串慣例（screen 內），無新 i18n 鍵

## 5. 驗證與收尾

- [x] 5.1 `pnpm --filter @assetanchor/mobile typecheck` + `lint` 通過；`test:coverage` 13 passed、全域 92.7% stmts / 92.5% branch（>90% gate）
- [~] 5.2 本機 dogfood（Emulator）：**已驗** 全部 quotes 改過期 + functions 模擬器關 → 持倉總覽顯示最後已知值 + 「部分為最後已知報價（延遲）」+ 今日損益「—」（不卡載入中，見 /tmp/aa-holdings-stale.png）。**待 owner 補驗**：切分頁/回前景觸發刷新、刪某檔 quote → 「N 檔更新中」部分渲染
- [ ] 5.3 iOS Simulator 逐畫面視覺對圖（持倉總覽 Hero/bento + 個股詳情）對照 `docs/design/holdings-overview/holdings-overview-spec.md` —— **owner gate**
- [ ] 5.4 Conventional Commits 分批 commit（scope: mobile）；開 PR；（帶 UI）archive 後續做下一個 change，merge 延後由 owner 批次執行
