# Feynman Dojo — 教材底稿（curriculum）

> 唯讀教材。由 2026-07-13 全庫回顧提煉（71 commits / 11 ADR / 26 OpenSpec changes / 6 tech notes）。
> 進度與洞佇列在 `feynman-ledger.md`；流程引擎在 `.claude/skills/feynman-dojo/SKILL.md`。
> 拷問前 AI 必須先開啟該項「錨定證據」中的真實檔案對質，禁止空泛問答。

## item-1 金融級正確性工程

**一句話**：為「靜默錯誤」而設計——錢的正確性是一級架構問題，不是顯示層細節。

### 核心概念

- 風險模型（ADR-0007）：最致命的 bug 是「靜默算錯數字」——手動點畫面永遠看不出來，測試資源按 how bad × how silent 分配。
- 不可變 `Money` class 包 decimal.js（`precision: 30, ROUND_HALF_UP`），所有運算回傳新實例。
- **Canonical vs display 分層**：`toDecimalString()` 恆定 10 位小數 string（Firestore 存的跨端契約）；`toDisplayString(n)` 才做顯示（預設 2 位 HALF_UP）；`fromDecimalString()` 讀回。
- 幣別安全雙防線：TS 型別層＋執行期 `assertSameCurrency` 丟 `CurrencyMismatchError`（帶 left/right payload）——USD 加 TWD 在兩層都不可能。
- Fail-loud 家族：`InvalidMoneyValueError`（NaN/Infinity、帶 raw）、`DivisionByZeroError`；divide 中 NaN 檢查先於除零檢查。
- `safeDecimal.ts` 的政策邊界：欄位**缺失**（undefined/null，pre-ADR 舊資料）fail-soft → `'0'`；欄位**存在但爛**（`'Infinity'`、`'abc'`、`''`）放行給 Money fail-loud。分界＝「欄位存不存在」。
- `toNumber()`＝唯一的精度逃生門，只准 UI/charting 用。

### 錨定證據

- `packages/shared/src/money/money.ts`、`errors.ts`、`safeDecimal.ts`
- `packages/shared/src/money/money.test.ts` — 49 個測試：浮點漂移反證（0.1+0.2、累加 1000 次 ×0.1 必須恰為 100）、HALF_UP 邊界（1.005→1.01、1.004→1.00）、不可變性、錯誤 payload。
- `packages/shared/src/fx/convertMoney.test.ts` — 用 regex 斷言輸出恆為 10 位 canonical 格式。
- ADR-0005（canonical string 進 Firestore）、ADR-0007 §風險模型。

### 題庫種子

**事實層**

- Firestore 裡一筆金額實際存成什麼？為什麼不是 number？
- `safeDecimal` 對 `undefined` 和 `'abc'` 分別怎麼處理？分界原則是什麼？
- Money 的除法先檢查什麼、再檢查什麼？

**因果層**

- 為什麼 canonical 固定 10 位，而不是「有幾位存幾位」？
- 幣別已有 TS 型別擋了，為什麼執行期還要丟 `CurrencyMismatchError`？
- `toNumber()` 為何存在？它的使用邊界為什麼畫在 UI/charting？

**遷移層**

- 你要做含折扣券與稅的電商購物車，金額層怎麼設計？何時該改用 integer cents？
- 接手一個全用 float 存錢的既有系統，你的漸進遷移策略？

### 畢業 note 建議切角

「為什麼你的 App 不該用 number 存錢——從 0.1+0.2 到 canonical decimal string 的完整設計」

## item-2 架構決策力與翻案

**一句話**：會做決策不稀奇，稀奇的是留下可審計的理由、設好回頭觸發條件，並在證據出現時翻案。

### 核心概念

- ADR 格式：Context → Decision → Consequences → Alternatives（含被拒方案的理由）；supersede 機制。
- Event sourcing（ADR-0004）：transactions 是 append-only 事件流，**holdings 不落地**——「衍生資料若落地，就有『事件與快照不一致』的風險（漏更新、競態）；不存就沒有這個 bug 類別。」
- Revisit triggers：>1000 筆交易、每日走勢、即時推播才回頭考慮落地——「約束真的出現才建」。
- **A→B 翻案（ADR-0005）**：owner 拍板「不追蹤匯率損益」這個**產品範圍決定**，反向抽掉了 ADR-0004 §3「歷史保真」存在的唯一理由——對稱多幣別 map 只剩複雜度。且翻案時確認 Sprint 3 只寫過單幣別子集，翻的是「未建的未來工作」不是已出貨行為。
- 難但對（ADR-0009）：「停在 Paper 是有硬期限的技術債——下次升 SDK 被迫面對同一個 bug，且沒有退路」；根因修法 `collapsable={false}` 並訂為慣例。
- 權威治理（ADR-0008）：三方真理漂移（code/planning/design 互相矛盾）→ 宣告單一仲裁者（設計包），並刻精確例外護欄：(A) 金額精度歸 Money；(B) schema 變更仍走聖牛 gate。拒絕分域方案因邊界地帶會再生仲裁成本。
- 聖牛 schema 治理：schema 可改，但改前逐欄評估三端（mobile/functions/shared）＋ owner gate。

### 錨定證據

- `docs/adr/0004-event-sourcing-schema.md`、`0005-single-currency-events-display-fx.md`、`0008-design-package-as-source-of-truth.md`、`0009-keep-new-architecture-fabric-textinput-fix.md`
- `openspec/changes/archive/2026-06-14-add-multi-currency-fx/proposal.md`（翻案的 change 級記錄）

### 題庫種子

**事實層**

- ADR-0005 翻掉了 ADR-0004 的哪個部分？觸發翻案的是什麼決定？
- ADR-0008 的兩個護欄各是什麼？各自防什麼？
- ADR-0004 定義的 revisit triggers 有哪些？

**因果層**

- 為什麼「不存 holdings」優於「存了再想辦法保持同步」？代價是什麼？
- 為什麼 ADR-0008 拒絕「設計管 UI、planning 管 schema」的分域授權？
- ADR-0009 為什麼說留在 Paper 是「有硬期限」的技術債？

**遷移層**

- 同事提議「加一張快照表加速查詢」，你的評估框架？
- 你接手的系統有兩份互相矛盾的文件，怎麼建立權威層級、要刻哪些例外？
- 新專案什麼時候值得寫第一份 ADR？什麼決策不值得？

### 畢業 note 建議切角

「我如何推翻自己的架構決策——一次產品範圍決定如何反向瓦解技術理由（ADR-0004→0005 實錄）」

## item-3 模組邊界與依賴方向

**一句話**：好邊界讓漂移「在結構上不可能發生」，而不是靠自律。

### 核心概念

- pnpm workspaces monorepo（apps/mobile、apps/functions、packages/shared、firebase）；shared **以 source 消費**（`main` → `src/index.ts`），拒絕兩 repo + npm publish（版本發布成本對 solo dev 過重）與 Nx/Turborepo（YAGNI）。
- 單向依賴鐵律：`features/* → core | services | shared`；feature 之間互不 import。
- **單一事實來源鏈**：`Object.freeze([...] as const)` enum → `(typeof ARR)[number]` type → `z.enum(ARR)` → `z.infer` → 三端共用。一個宣告同時驅動 runtime 清單與靜態 union——漂移在結構上不可能。
- 跨欄位一致性下沉到 schema 層：`transaction.ts` `.superRefine` 呼叫 `expectedCurrencyForMarket`，讓**所有未來寫入路徑**（批次匯入等）自動繼承 TW↔TWD、US↔USD 護欄。
- 依賴治理案例：RNFB v24 精確 pin `firebase@12.10.0`；他處 `^12.14.0` 使 hoisted pnpm 裝出兩份 `@firebase/firestore`，其內部 brand check 跨副本 crash——症狀偽裝成「測試框架不相容」。修法＝精確 pin 對齊 + `pnpm why firebase` 驗證；每次升 RNFB 重演。
- 工具鏈約束：pnpm 需 `node-linker=hoisted`，Metro 才解析得到跨 workspace 的 shared（pnpm 9 在 `.npmrc`、10+ 在 `pnpm-workspace.yaml`）。

### 錨定證據

- `docs/adr/0001-monorepo-with-pnpm.md`
- `packages/shared/src/enums/`（currencies/markets/transaction-types…）、`packages/shared/src/schemas/transaction.ts`
- `packages/shared/src/markets/marketConsistency.ts`（hard block / form default / soft heuristic 刻意分開）
- `docs/tech_note/react-native-firebase-version-pinning.md`、`expo-pnpm-monorepo-integration.md`

### 題庫種子

**事實層**

- 從 enum 宣告到三端型別安全，這條鏈的每一環是什麼？
- RNFB crash 的真根因？當時的表面症狀是什麼？
- shared 是怎麼被消費的——build 產物還是 source？在哪個欄位設定？

**因果層**

- 為什麼 feature 互不 import？違反時靠什麼發現？
- 為什麼 market×currency 檢查放 zod schema 而不是只放表單？
- 什麼時候「以 source 消費」該升級成正式 publish？

**遷移層**

- 三人團隊前後端要共用型別，monorepo vs 發 npm 包，你的決策樹？
- 設計一個「新增一種資產類型只改一個檔案、圓餅圖/表單/驗證全自動跟上」的結構（本專案 PR#55 實例）。

### 畢業 note 建議切角

「單一事實來源鏈：從 `Object.freeze` 到 `z.infer`，讓型別漂移在結構上不可能」

## item-4 信任邊界與威脅模型

**一句話**：安全設計從「誰真的能做什麼」推導，而不是從「盡量多驗」推導。

### 核心概念

- Client 直連 Firestore ⇒ **rules 是唯一安全邊界**，沒有 server 中間層可救；`allow read: if true` 就是把所有人資料裸奔。
- 完整寫入模型：`write: if false` 只擋 client SDK；Admin SDK / Cloud Functions **bypass rules**——`quotes`、`exchange_rates`、`price_history` 登入者可讀、只後端可寫；`users/{uid}/**` 僅本人；`symbols` 可 create 不可 update/delete。
- **Isolation ≠ field-integrity**：兩個獨立的安全性質。本專案刻意只做 client-side zod、rules 保持極簡——因為個人 app 威脅模型下「使用者弄壞自己被隔離的資料」是低風險，**記錄為有意識取捨而非疏漏**。
- Rules 是可測試程式碼：`@firebase/rules-unit-testing` 的 `assertSucceeds`/`assertFails`，`pnpm --filter @assetanchor/firebase test:rules`，DoD 硬 gate。

### 錨定證據

- `firebase/firestore.rules` 與其測試
- `docs/tech_note/firestore-security-rules.md`、`docs/tech_note/zod-schema-and-firestore-rules-validation.md`

### 題庫種子

**事實層**

- 這個 app 裡誰能寫 `quotes`？誰能 update `symbols`？
- `write: if false` 擋得住 Cloud Functions 嗎？為什麼？
- rules 測試怎麼跑、在哪個 gate？

**因果層**

- 為什麼欄位驗證放 client-side zod 而不寫進 rules？前提是什麼威脅模型？
- 哪些變化會推翻這個取捨（提示：多人共用帳本、開放 API、資料變成金融級證據）？
- 為什麼 isolation 和 field-integrity 要當兩個獨立性質分析？

**遷移層**

- 設計多租戶 SaaS 的 Firestore 信任邊界，你的檢查清單？
- 若系統加了 server API 中間層，rules 的角色該怎麼重新定位？

### 畢業 note 建議切角

「Firestore rules 是你唯一的防線——client 直連架構下的威脅模型推導法」

## item-5 外部依賴防腐層

**一句話**：「測試守我家的邏輯；對外部世界的不信任，用介面＋邊界驗證＋fallback 這種架構手段防。」（ADR-0007）

### 核心概念

- Provider 介面可替換（Yahoo 可換 TWSE/FinMind，只留擴充點不預建）；外部回應過 zod ＋ sanity check 才入系統。
- **錯誤分類學**：permanent（404、200-但空結果 → `SymbolNotFoundError`）vs transient（其他非 2xx）；用 typed error + `instanceof` 分類、映射成 shared `QuoteErrorCode` 給 client——絕不 parse 錯誤訊息字串。
- **Identity guard**：HTTP 200 但回錯 ticker 視同 not-found——dogfood 實錄：`BTC` 原樣送 Yahoo 撞同名 NYSE Arca ETF，200 回 $28.27（真值 BTC-USD ≈ $64k，差 2000 倍）——「比查無代號更嚴重的靜默錯價」。寧可不給，不給錯。
- 頻控與韌性實測（ADR-0010，實測推翻二手研究）：雙 host 只在 429 輪替（限額各自獨立）；**誠實 UA `Mozilla/5.0 (AssetAnchor)` 比假冒完整 Chrome 更穩**（假 UA 與 Node fetch TLS 指紋不符反而更易 429）。
- 靜默降級防線：`range=max` 會被 Yahoo 靜默降成月線 → `expectGranularity` 驗 `meta.dataGranularity` 不符即 throw；`RANGE_BUCKETS` 禁 max。**寧可不寫，不寫髒資料**（`fetchAndStore` 失敗絕不寫半份 doc）。
- 平台約束：Firebase Spark 禁 Cloud Functions 對外（非 Google）請求 → 被迫 Blaze（ADR-0006）。

### 錨定證據

- `apps/functions/src/quotes/yahooProvider.ts`、`quotes/quoteErrors.ts`
- `apps/functions/src/history/yahooHistoryProvider.ts`（YAHOO_HOSTS、UA、expectGranularity）
- `apps/functions/src/exchangeRates/fetchAndStore.ts`（冪等 upsert、台銀 CSV 反爬改 Yahoo 的遷移註記）
- `docs/adr/0006-quote-cache-strategy.md`、`0010-price-history-architecture.md`、ADR-0007 §5a/5b
- `openspec/changes/archive/2026-07-11-enable-crypto-quotes/proposal.md`（BTC 事故全文）

### 題庫種子

**事實層**

- 哪些情況被分類成 permanent error？client 拿到的是什麼？
- identity guard 擋下的實際事故是什麼？差了幾倍價？
- UA 用什麼？為什麼不假冒 Chrome？

**因果層**

- 為什麼錯誤分類要 typed error 而不是比對訊息字串？
- 為什麼 host 輪替只在 429 觸發、其他錯誤不輪替？
- 「寧可不寫也不寫髒資料」在哪兩處體現？防的是什麼下游災難？

**遷移層**

- 你要接第三方支付 API，防腐層各層怎麼設計（驗證/錯誤分類/降級/冪等）？
- 上游偶爾回 200 但缺欄位，你的防線放哪幾層？

### 畢業 note 建議切角

「防腐層實戰：當 Yahoo 用 HTTP 200 回給你一個錯 2000 倍的價格」

## item-6 快取拓撲與資料生命週期

**一句話**：先問資料的「性質」（可變性/時效/可信度/量體），再決定存不存、存哪、活多久。

### 核心概念

- **全專案最漂亮的對比——同一人對兩種資料做相反決定，且都對**：
  - Holdings **不落地**（ADR-0004）：高頻衍生、可由事件流隨時重算 → 落地＝繼承「事件與快照不一致」整類 bug。
  - price*history **落地**（ADR-0010，`price_history/{symbolId}*{year}` per-symbol-per-year 分片）：近不可變、可回填、批量讀 → 不落地＝每次開圖打爆上游（429）。
  - 決策軸不是技術偏好，是**資料性質**。
- 被拒方案的理由要記牢：per-user 每日 portfolio 快照——不可回填 feature 上線前的歷史、回填編輯會弄髒快照、需要排程、無開源實作採用；而衍生市值序列對 back-dated 編輯永遠正確。
- 兩層快取拓撲（ADR-0006）：MMKV（裝置層）＋ Firestore `quotes`（server-side 共享快取，15min TTL）⇒ **報價成本與用戶數脫鉤**（N 用戶看同一標的只打一次上游）。
- On-demand 勝排程（排程被否決兩次）：使用量不確定時，排程＝為沒人看的資料付費。
- Lazy incremental：開圖才抓；fresh 就 no-op；過期補 7 天 lookback upsert（冪等）；首次從最早交易日全回填。

### 錨定證據

- `docs/adr/0006-quote-cache-strategy.md`、`0010-price-history-architecture.md`、`0004-event-sourcing-schema.md` §3
- `apps/functions/src/history/`（historyPlan 純函式）
- `openspec/changes/archive/2026-06-18-resilient-quote-display/proposal.md`（層 1）＋ `2026-06-18-add-quote-batch-discovery/`（層 2）

### 題庫種子

**事實層**

- 報價 TTL 多長？兩層快取各放哪？
- price_history 文件怎麼分片？為什麼按年？
- 首次開圖 vs 第二次開圖，各發生什麼？

**因果層**

- 為什麼 holdings 不落地但 price_history 落地？決策軸是什麼？
- 為什麼 server-side cache 讓成本與用戶數脫鉤？
- 為什麼拒絕 per-user 每日快照？三個理由？

**遷移層**

- 新聞 app 的 feed、使用者頭像、匯率表——各套「資料性質四問」得出什麼快取策略？
- 什麼資料你永遠不該落地衍生值？什麼時候該翻案？

### 畢業 note 建議切角

「同一個專案裡我對兩種資料做了相反的落地決定——資料性質四問」

## item-7 防禦縱深與可觀測性

**一句話**：錯誤要嘛進不來、要嘛看得見；每層的 fail-loud/fail-soft 政策是設計出來的，不是碰運氣。

### 核心概念

- **成對防線**（TestFlight 首個 prod bug 的工程回應）：上游 `guard-transaction-market-consistency`（schema superRefine 硬擋 market×currency 矛盾——「讓錯誤進不來」）×下游 `surface-quote-symbol-errors`（QuoteErrorCode 到 UI——「讓錯誤看得見」）。proposal 原文：「下游的 surface-quote-symbol-errors 讓錯誤看得見，本 change 讓錯誤進不來。」
- 觸發事故：台股 ETF 被存成 `market=US` → Yahoo 404 → 畫面永遠「載入中」；當時「`functions:log` 是唯一可觀測點、client 零錯誤能見度」。
- **Fail-loud / fail-soft 的分層政策**：shared 純函式 fail-loud throw（`deriveHoldings` 遇 orphan SELL 直接炸）；mobile 邊界 fail-soft 包覆（帳戶頁白屏 crashfix：包 try/catch 降級顯示，app 不整頁死）。原則：**核心邏輯不吞錯，UI 邊界不擴散**。
- `safeDecimal` 是同一政策的資料版：缺失 fail-soft、存在但爛 fail-loud。
- hard block vs soft heuristic 分離（`marketConsistency.ts`）：矛盾組合硬擋；「代號長得像另一市場」只給警告——防線強度對齊確定性。
- 可觀測性補位：Sentry（add-sentry-error-reporting）讓 client 端錯誤第一次有了能見度。

### 錨定證據

- `openspec/changes/archive/2026-07-10-guard-transaction-market-consistency/proposal.md`、`2026-07-10-surface-quote-symbol-errors/`、`2026-07-10-add-sentry-error-reporting/`
- `packages/shared/src/markets/marketConsistency.ts`（檔頭引用該 prod bug）
- `packages/shared/src/money/safeDecimal.ts`
- 帳戶超賣白屏 crashfix（PR#21：shared fail-loud + mobile 邊界 fail-soft 包覆）

### 題庫種子

**事實層**

- market×currency 矛盾在哪一層被擋？用什麼機制？
- 帳戶白屏的修法是什麼——哪層 loud、哪層 soft？
- 那次 prod bug 當下唯一的可觀測點是什麼？

**因果層**

- 為什麼 guard 和 surface 要成對做，只做一邊會怎樣？
- fail-loud/fail-soft 的分界原則是什麼？為什麼 shared 炸、UI 包？
- 為什麼「長得像錯市場」只警告不硬擋？

**遷移層**

- 你的服務偶發吞錯讓用戶永遠看轉圈，你會建哪幾層防線、順序為何？
- 新系統 day-1 的最小可觀測性配置是什麼？

### 畢業 note 建議切角

「錯誤要嘛進不來、要嘛看得見——一次 prod bug 換來的防禦縱深設計」

## 選修彩蛋（不佔正課、不入帳本）

- Fabric view-flattening 失焦案例（ADR-0009 技術細節）：focus 陰影觸發 remove+insert mutation → `collapsable={false}` 慣例。
