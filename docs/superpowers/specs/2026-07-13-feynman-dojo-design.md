# Feynman Dojo — 架構師內化訓練系統設計

- **日期**：2026-07-13
- **狀態**：owner 已核准設計（本文件為施工依據）
- **背景**：AssetAnchor 50 天（2026-05-23 → 07-12，71 commits、11 ADR、26 個 OpenSpec change）以 AI 輔助高速開發完成，owner 自評「開發成果未內化成個人經驗」——回顧報告中的多數決策已想不起來。本系統目標：把專案中的架構層知識確實內化為 owner 本人的工程師經驗。

## 1. 目標與成功標準

- **內化層級**：層級四「能教別人」（費曼學習法）——每項通過拷問後，owner 親手寫出能教會他人的 Notion tech note。
- **方向定位**：owner 明確要求聚焦**架構師（architect）面向**；PM 範圍紀律、工程流程系統兩項經 owner 決定**排除**於課程外。
- **節奏**：每週 2–3 次 session、每次 75–90 分鐘；預估 15–16 次、約 6 週。

## 2. 課程表（7 項，具體 → 抽象）

| # | 項目 | 錨定證據（拷問素材） |
|---|------|---------------------|
| 1 | 金融級正確性工程 | `packages/shared/src/money/money.ts`、`safeDecimal.ts`（缺失 fail-soft vs 存在但爛 fail-loud）、49 個 Money 測試、canonical 10 位小數字串＝跨端契約（ADR-0005）、ADR-0007「靜默錯誤」風險模型 |
| 2 | 架構決策力與翻案 | ADR-0004（event sourcing、不落地 holdings）、ADR-0005（多幣別 model A→B 翻案：產品範圍決定反向抽掉架構理由）、ADR-0008（設計包＝最高權威、單一仲裁者＋精確例外護欄）、ADR-0009（難但對：留在 New Arch 修根因）、聖牛 schema 治理 |
| 3 | 模組邊界與依賴方向 | ADR-0001（monorepo 取捨：兩 repo+publish／Nx 為何不用）、單向依賴 `features/* → core\|services\|shared`、單一事實來源鏈 `Object.freeze enum → z.enum → z.infer` 三端共用（`schemas/transaction.ts`）、RNFB 雙版本 brand-check crash＝hoisting＋精確 pin 依賴治理案例 |
| 4 | 信任邊界與威脅模型 | client 直連 Firestore ⇒ rules＝唯一安全邊界；`write: if false` 只擋 client SDK、Admin SDK bypass；isolation vs field-integrity 為獨立安全性質；個人 app 威脅模型下刻意 client-side zod＋4 行 rules 的有意識取捨（`docs/tech_note/firestore-security-rules.md`、`zod-schema-and-firestore-rules-validation.md`）；rules 當可測試程式碼（CI gate） |
| 5 | 外部依賴防腐層 | ADR-0007「測試守我家邏輯；外部不信任用介面＋邊界驗證＋fallback 防」；typed 錯誤分類學 permanent vs transient（`quoteErrors.ts`、`instanceof` 不 parse 字串）；identity guard（BTC 撞同名 ETF、200 回錯價 2000 倍 → 視同 not-found）；429 才輪替 host、誠實 UA vs TLS 指紋實測、`expectGranularity` 防靜默降級（`yahooHistoryProvider.ts`） |
| 6 | 快取拓撲與資料生命週期 | 同人相反決定的對比：holdings 不落地（ADR-0004，消滅「事件與快照不一致」整類 bug）vs price_history 落地（ADR-0010，近不可變、可回填）——決策軸＝資料性質（可變性/時效/可信度/量體）；兩層快取＋server-side 15min TTL ⇒ 成本與用戶數脫鉤（ADR-0006）；lazy incremental fetch、冪等 upsert |
| 7 | 防禦縱深與可觀測性 | guard-transaction-market-consistency（讓錯誤進不來）×surface-quote-symbol-errors（讓錯誤看得見）成對 change；fail-loud vs fail-soft 政策邊界（`safeDecimal.ts`、帳戶白屏 fail-soft 包覆）；prod bug「functions:log 是唯一可觀測點、client 零錯誤能見度」教訓；Sentry 補位 |

- 原「根因除錯」素材拆解：RNFB pin → 項目 3；Yahoo UA/TLS → 項目 5；Fabric `collapsable={false}` 案例為選修彩蛋（不佔正課）。

## 3. 課程結構：交錯式＋間隔重複

- 每次 session 前 10–15 分鐘為**舊題快問**：抽帳本中所有到期的「洞」。
- 間隔規則：答錯 → 3 天後回鍋；答對 → 升級（3 天 → 1 週 → 2 週）；**連續兩次答對 → 除役**；除役題仍可能在延遲驗收（§5-3）或期末考被抽中，屆時答錯即重置回 3 天重新入列。
- 主體 60–75 分鐘攻當前項目。

## 4. 單次 Session 協議（75–90 分）

1. **開場（2 分）**：讀帳本、宣布菜單。距上次 session > 5 天 → 開場直接點名質問進度（督促條款）。
2. **舊題快問（10–15 分）**：到期洞逐題考、誠實評分、更新間隔。
3. **盲講（15 分）**：owner 不看任何資料講解當日項目；AI 全程不打斷、只記漏洞。
4. **拷問（30–40 分）**，三層遞進：
   - **事實層**：「你當時實際做了什麼？」（AI 開啟真實檔案/ADR 對質）
   - **因果層**：「為什麼？拒絕了什麼替代方案？trade-off？」
   - **遷移層**：新情境題（例：健身紀錄 app 該不該用 event sourcing？何時不該？）
5. **記洞（5 分）**：答不出的題進帳本＋到期日；指派回家作業（指定 ADR/程式碼閱讀——讀資料是作業、不是 session 中行為）。
6. **收尾**：更新帳本、預告下次項目與作業。

## 5. 每項畢業標準（三關）

1. 拷問三層通過、無 critical 洞。
2. owner **親手寫** Notion tech note（走既有 Tech Notes 資料庫／notion-tech-note-publisher 流程）；AI 只審稿列問題（模糊處/錯誤處），不代筆；代筆味過重可退稿。
3. **延遲驗收**：note 完成滿一週後，隨機抽 3 題舊題全對 → 蓋「畢業」章。

七項全畢業 → 可選期末考：30 分鐘跨項目綜合模擬面試。

## 6. 落地檔案

| 檔案 | 內容 |
|------|------|
| `.claude/skills/feynman-dojo/SKILL.md` | `/feynman-dojo` 指令：讀帳本＋教材 → 跑 §4 協議 → 寫回帳本 |
| `docs/learning/feynman-curriculum.md` | 七項教材底稿：2026-07-13 回顧提煉的全部證據（檔案路徑、ADR 引文、關鍵引言）＋各項題庫種子（三層各數題） |
| `docs/learning/feynman-ledger.md` | 進度帳本：各項狀態（未開始/進行中/待寫 note/延遲驗收中/畢業）、洞清單（題目、到期日、連對次數）、session log（日期、項目、結果摘要） |

全部進 git 版本控制——跨對話、跨 session 不丟失。

## 7. 誠實規則（雙方契約）

- 盲講與拷問中**禁查資料**；查資料＝回家作業。
- AI 評分不放水：講不清楚就是洞。
- **例外升級條款**：某硬技術項在拷問中整段崩潰（如 Money 的 canonical/display 分層完全講不出）→ 該項臨時加開一次 45 分鐘小型重實作（禁 AI 補全）。
- Notion note 由 owner 執筆。

## 8. 範圍外（owner 拍板）

- PM 範圍紀律、工程流程系統兩項不納入課程（2026-07-13 owner 決定，聚焦架構師方向）。
- 不建排程提醒（owner 選「skill＋帳本」，觸發靠本人；督促條款見 §4-1）。
- 不做公開部落格文/真人分享驗收（選定 Notion tech note）。

## 9. 風險與對策

- **最大風險＝斷練**：帳本記錄最後 session 日期，任何一次開課先檢查間隔並質問；若連續兩週零 session，AI 應提議降級節奏（每週 1 次）而非放任系統死亡。
- **拷問變表演**：三層題必須錨定真實檔案與 ADR 原文，AI 出題前先讀證據，防止空泛問答。
- **note 拖稿**：畢業第 2 關未完成前，不開下一項的第 2 次 session（軟性卡點，帳本標記）。
