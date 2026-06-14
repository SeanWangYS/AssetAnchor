# ADR-0005: 交易採單幣別事件 + 顯示時匯率換算（取代對稱多幣別 amounts map）

- **狀態**：Accepted
- **日期**：2026-06-14
- **取代**：ADR-0004 §3（對稱式多幣別 amounts map／歷史保真）與其 Alternatives 第三點的取捨
- **相關**：planning doc §5（多幣別處理）、§6（Collection 3 transactions、Collection 4 exchange_rates）；於 OpenSpec change `add-multi-currency-fx`（Sprint 4）落地

## Context

ADR-0004 §3 與 planning §5 原規劃以「對稱式多幣別 `amounts` map」實作多幣別：交易發生時抓**交易日**匯率，把另一幣別金額一併焊進每筆交易（歷史保真），並預留 `amounts_status: PENDING|COMPLETE` 處理匯率待補。ADR-0004 的 Alternatives 也曾明確否決「非對稱單幣別 + 顯示時換匯」，理由是「喪失交易日匯率的歷史保真，日後對帳/報酬會因匯率變動對不起來」。

Sprint 4 開工 explore 時，owner（唯一設計開發者）重新檢視需求，做出**產品層級的範圍決定**：

> 本 App **不追蹤匯率損益**。記錄一筆交易時只在意「該市場當下的成交金額」（台股記 TWD、美股記 USD）；持有期間 TWD/USD 匯率波動造成的價值變化，**不感興趣**。只有在分析頁要把跨幣別資產「現在」合計成單一幣別來看時，用「最新匯率」即時換算一個 as-of-today 快照即可。

這個範圍決定，正好抽掉了 ADR-0004 §3「歷史保真」存在的唯一理由——既然不追蹤匯率損益、也不需要每筆交易的歷史台幣值，對稱多幣別 map 與 PENDING/COMPLETE 狀態機就只剩複雜度而無收益。

關鍵相容性：Sprint 3 既有實作**本來就只寫單幣別子集**（`buildTransactionDoc` 只填原幣別一筆、`rate=1`、`amounts_status=COMPLETE`；`deriveHoldings` 只讀原幣別）。因此本翻案不是推翻已寫的行為，而是取消「Sprint 4 往 map 補第二幣別」這件尚未做的事，並把永遠用不到的多幣別鷹架清掉。

## Decision

### 1. 交易為單幣別事件

`TransactionDocument` **攤平**：移除 `amounts` map、`amounts_status`、`is_original`、`rate`/`rate_source`/`rate_type`/`rate_date`，改為頂層 flat 欄位 `currency`（市場原幣別）+ `price`/`total`/`fee`/`tax`（`Money` 10 位小數 string，`total = price × quantity`）。交易不再記錄任何 FX 換算。`original_currency` 更名為 `currency`。

### 2. 匯率抽離為獨立的每日表

匯率由 `exchange_rates/{牌告日}` 承載，與交易解耦。後端 Cloud Function 每日抓台銀牌告（即期賣出 `spot_sell`）以 Admin SDK 寫入（client 唯讀）。表向前累積歷史（保留未來報稅佐證重建的可能），但顯示只讀「最新一筆」。

### 3. FX 只在顯示／分析時即時換算

跨幣別合計（如持倉總覽「總成本（TWD）」、AssetDetail 幣別切換）由 `packages/shared` 純函式 `convertMoney` / `totalCostIn` 以**最新匯率**即時計算，不落地、不寫回交易。同幣別免匯率；匯率未就緒時優雅降級。換算為 as-of-today 快照，明示非歷史保真值、不作損益歸因。

## Consequences

- **架構大幅簡化**：消除交易時抓匯率、PENDING/COMPLETE 狀態機、歷史 `/L6M` 逐日抓取、16:00 placeholder 精算、Cloud Function 與交易寫入的耦合；mobile 也零新 Firebase 依賴（只用既有 Firestore 讀匯率表）。
- **聖牛 schema 首次變更**：§6 transactions 攤平，逐欄三端影響評估見 change `add-multi-currency-fx` 的 design.md。既有單幣別行為不變，`deriveHoldings` 輸出與 §4 worked example（台積電 avg=550.76）不受影響，作為迴歸守門。
- **明確放棄（owner 拍板、清醒接受）**：① 每筆交易的歷史台幣值；② 匯率損益分析。兩者於資料層不可逆，但每日累積的 `exchange_rates` + `transaction_date` 仍保留事後近似重建的可能。
- **後續 sprint**：Sprint 5 報價／市值、Sprint 6 `preferred_display_currency` 設定切換，都在此模型上疊加，不需再碰交易 schema。

## Alternatives Considered

- **維持 ADR-0004 §3 的對稱多幣別 map**：歷史保真、可算匯率損益。但 owner 已將此二者排除於 MVP 範圍外，留著只是複雜度與誤導性結構（看似多幣別、實際永遠單幣別）。否決。
- **保留 `amounts` map 但永遠單幣別（休眠不攤平）**：零既有程式碼變更。否決——休眠的多幣別 map + 永遠 COMPLETE 的 status 正是「未來看不懂當初為何如此」的技術債，與本 ADR 要消除的痛點相同。
- **per-transaction callable 抓匯率（舊計劃流程圖）**：交易時呼叫 Cloud Function 補匯率。否決——需 mobile 裝 functions SDK、與寫入耦合、且在單幣別事件模型下根本不需要。
- **GitHub Actions cron 抓匯率取代 Cloud Function**：免 Blaze、純免費。否決——放棄「第一個 Cloud Function 部署」里程碑與 functions pipeline 學習、後端拆成兩套、需管 service-account 金鑰；且 Cloud Function 在免費額度內實際成本 $0。
