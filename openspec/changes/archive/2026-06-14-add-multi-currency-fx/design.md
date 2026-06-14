## Context

Sprint 4 原計劃（planning §5、ADR-0004 §3）以「對稱式多幣別 `amounts` map」實作多幣別：交易發生時抓交易日匯率、把另一幣別金額焊進交易（歷史保真）。Owner 拍板翻案為更簡單的模型：

- **交易事件只記市場原幣別**（台股 TWD、美股 USD），不在交易裡做任何 FX 換算。
- **匯率抽離成一張每日更新的獨立表**（`exchange_rates/{date}`），由後端 Cloud Function 寫入。
- **FX 只在顯示/分析跨幣別合計時即時套用「最新匯率」**（as-of-today 快照），不落地、不追蹤匯率損益。

關鍵相容性事實：Sprint 3 既有程式碼**本來就只寫單幣別子集**（`buildTransactionDoc` 只填原幣別一筆、`rate=1`、`amounts_status=COMPLETE`；`deriveHoldings` 只讀 `amounts[original_currency]`，Position 為原幣別）。因此本翻案不是推翻已寫的行為，而是**取消「往 amounts map 補第二幣別」這件還沒做的事**，並順手清掉永遠用不到的多幣別鷹架。

約束：聖牛 schema（§6）變更須逐欄評估三端影響；金額一律 `Money`（decimal.js）10 位小數 string；functions runtime 不能 require `.ts`（`apps/functions/src/index.ts` 留有警告）；Firebase 專案 `assetanchor-832df`，需 Blaze 才能部署 Functions + 對外抓 HTTP。

## Goals / Non-Goals

**Goals:**

- 交易文件攤平為單幣別 flat 欄位，移除對稱 `amounts` map 與其衍生機制。
- 部署第一個 Cloud Function（每日抓台銀匯率），建立 functions 打包 / emulator / 部署工作流（🚦 里程碑）。
- 提供顯示時 FX 換算純函式，支撐 AssetDetail 幣別切換與持倉總覽 TWD 跨幣別總成本。
- 文件去除 model A、保留翻案決策軌跡（ADR-0005）。

**Non-Goals:**

- 匯率損益、每筆交易歷史台幣值、市值/損益、走勢圖、總覽切換鈕、USD/TWD 以外幣別、買賣方向匯率細分（見 proposal Non-goals）。
- 歷史匯率回填（`exchange_rates` 自部署日起向前累積；過去日期不backfill）。

## Decisions

### D1：交易事件單幣別 + 顯示時 FX（model A → B）

每筆交易只記市場原幣別。跨幣別數字在顯示層用最新匯率即時換算，是 as-of-today 快照、非歷史保真值。同一檔股票的成本與市值在原幣別下計算後才換算，故該檔報酬率（%）不受匯率影響；只有跨幣別「合計總額」會隨匯率每日浮動，但 App 不對此浮動做任何歸因（= 不追蹤匯率損益）。

- **Why over A**：owner 明確不在意持有期間匯率損益。A 存在的唯一理由（歷史保真 + 匯率損益）被產品決策否決，留著只是複雜度。
- **Alternative considered**：保留 amounts map 但永遠單幣別（Option A，休眠）。否決：留下「看似多幣別、實際永遠單幣別」+「永遠 COMPLETE 的 status」會成為未來看不懂的誤導性結構（正是本次翻案的起因痛點）。

### D2：交易文件攤平（聖牛 §6 逐欄對照）

| §6 原欄位                                                       | 新 schema                | 差異與理由                                                                  |
| --------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------- |
| `original_currency: Currency`                                   | **`currency: Currency`** | 重新命名。單幣別模型下「original」無意義，直接叫 `currency`（市場原幣別）。 |
| `amounts: { [ccy]: TransactionAmount }`                         | **移除**                 | 對稱多幣別 map 不再需要；金額欄位上提為 flat。                              |
| `amounts[ccy].price`                                            | **`price: string`**      | 上提為頂層欄位。`Money` 10 位小數 string。                                  |
| `amounts[ccy].total`                                            | **`total: string`**      | 上提。語意不變：`= price × quantity`（成交金額，不含 fee/tax）。            |
| `amounts[ccy].fee`                                              | **`fee: string`**        | 上提。                                                                      |
| `amounts[ccy].tax`                                              | **`tax: string`**        | 上提。                                                                      |
| `amounts[ccy].is_original`                                      | **移除**                 | 單幣別下恆為 true，無資訊量。                                               |
| `amounts[ccy].rate` / `rate_source` / `rate_type` / `rate_date` | **移除**                 | 交易不再帶匯率；換算移至顯示層 + `exchange_rates` 表。                      |
| `amounts_status: PENDING\|COMPLETE`                             | **移除**                 | 無非同步補完流程，恆 COMPLETE，無資訊量。                                   |

其餘欄位（`transaction_id`、`account_id`、`asset_type`、`symbol`、`market`、`transaction_type`、`transaction_date`、`ex_date`、`quantity`、`related_transaction_id`、`lot_id`、`notes`、時戳）**完全不變**。

**三端影響**：

- **shared**：`types/transaction.ts` 攤平 + 移除 `TransactionAmount`/`AmountsMap`；`schemas/transaction.ts` 將 `original_currency` → `currency`（驗證邏輯不變）；`buildTransactionDoc.ts` 直接組 flat（程式碼變少）；`deriveHoldings.ts` 改讀 `tx.total`/`tx.fee`/`tx.tax`/`tx.currency`（聚合與混幣別防護邏輯不變）。各檔測試同步更新。
- **functions**：本 change 才首次寫程式，直接照新 schema，無遺留。
- **mobile**：`transactionService` / `TransactionForm` 經由 builder + zod 間接相依，欄位重命名後型別自動帶過；無 FX 欄位需新增。

**資料遷移**：自用、pre-launch，正式專案預期無真實交易資料。emulator 資料重置即可。若正式專案有少量資料，提供一次性 backfill script（讀舊 doc → 攤平 → 覆寫），但預設不需要。

### D3：`exchange_rates` 為每日累積表，顯示讀「最新」

```javascript
// Document ID = BOT 牌告日期 "2026-06-13"
{
  date: "2026-06-13",            // = board_date，BOT 實際牌告日
  source: "BOT",
  rate_type: "spot_sell",        // 即期賣出，MVP 唯一基準
  rates: {
    "USD_TWD": "31.6800000000",  // 1 USD = 31.68 TWD
    "TWD_USD": "0.0315700000"    // 反向預存，省顯示層計算
  },
  fetched_at: <serverTimestamp>,
  is_estimated: false            // 本模型下恆 false（doc 以實際牌告日為 key）
}
```

- 顯示層永遠讀「最新一筆」`exchange_rates`（`orderBy(date desc) limit 1`），不依交易日查特定日期。
- 表向前累積（報稅佐證保險）；過去日期不回填。
- 對照 §6 差異：`rates` 精簡為 `USD_TWD`/`TWD_USD` 兩向（移除 §6 預留的 `_buy`/`_cash_sell` 備用欄，第二階段再加）；新增 `rate_type` 明示基準；`is_estimated` 保留欄位但本模型恆 false。

### D4：每日「排程」Cloud Function，mobile 純 Firestore 讀

```
Cloud Function（onSchedule, Asia/Taipei 每日 16:30）
   └─ 抓 BOT CSV → parse USD spot_sell → Admin SDK 寫 exchange_rates/{board_date}

apps/mobile
   └─ 像讀任何 Firestore doc 一樣讀 exchange_rates 最新筆（rules 已允許登入者讀）
```

- **Why scheduled over callable/trigger**：(1) mobile **零新依賴**——不需裝 `@react-native-firebase/functions`、不需重 build dev client；App 只用既有 Firestore 讀。(2) 與交易寫入完全解耦。(3) 符合「每天更新一張表」心智模型。
- **Alternatives**：① per-transaction callable（舊計劃）——交易時觸發，但需 mobile functions SDK + 與寫入耦合，否決。② Firestore trigger——每筆交易觸發，量大且不需要，否決。③ GitHub Actions cron（免 Blaze、純免費）——放棄 🚦 里程碑、後端拆兩套、service-account 金鑰管理，記為 alternative，刻意不選。
- **Demo / 初次 seed**：排程函式可在 emulator 用 `firebase functions:shell` 或暴露一個 dev-only HTTP wrapper 手動觸發一次，秀「呼叫 → Firestore 出現匯率 doc」里程碑。
- **無匯率時的優雅降級**：若 `exchange_rates` 尚無任何 doc（函式還沒跑過），總覽 grand total 顯示「匯率未就緒」、AssetDetail 切換維持原幣別。不 crash。

### D5：functions runtime 打包（bundle shared）

用 **tsup（esbuild 底層）** 把 `apps/functions/src/index.ts` 連同 `@assetanchor/shared` source bundle 成單一 `lib/index.js`：

- `firebase-admin` / `firebase-functions` 設為 **external**（雲端 runtime / `package.json` deps 提供）；其餘（shared source、decimal.js）**bundle 進輸出**，雲端 `npm install` 不需解析 `workspace:*`。
- `package.json`：`main` = `lib/index.js`，`build` = `tsup`，deps 只留 `firebase-admin`/`firebase-functions`。
- target node22、platform node、format esm/cjs 視 firebase-functions v6 需求而定（apply 時確認）。
- **Why now（採 owner 選擇，非我原建議）**：一次建立打包模式，Sprint 5 報價函式直接受惠，不用兩次面對同一問題。函式因此可 `import { Money } from '@assetanchor/shared'` 做 10 位小數序列化。

### D6：FX 換算為 shared 純函式（TDD）

`packages/shared` 新增換算純函式（暫名 `convertMoney(amount: Money, rates, to: Currency): Money` 或 `applyRate`）：給定原幣別 `Money` + `exchange_rates.rates` + 目標幣別，回傳換算後 `Money`（10 位小數）。同幣別回傳自身。純函式、TDD、吃 ≥90% gate。顯示層（mobile）組合：`deriveHoldings`（原幣別）→ 對每筆 position 用最新 rate 換算 → 加總成 TWD grand total。

### D7：BOT 來源（實測修正 planning §5）

curl 實測結論：

- `/xrt/flcsv/0/L6M`（無幣別）→ 回「找不到資料」，**planning §5 寫法有誤**。
- `/xrt/flcsv/0/day` → 有 19 幣別當日牌告，但 **CSV 無日期欄位**（週末抓到的是週五牌告卻無從分辨）。
- ✅ **`/xrt/flcsv/0/L6M/USD`** → 每行含「資料日期」欄（`20260612`），最上面一行 = 最新牌告。**採此來源**：取頂行得 `board_date` + spot_sell，以實際牌告日為 doc key（is_estimated 恆 false、週末重跑idempotent 覆寫同一 Friday doc）。
- CSV 結構：UTF-8 BOM + CRLF，兩半對稱（本行買入 / 本行賣出 ×〔現金/即期/遠期×7〕）。**spot_sell = 「本行賣出」段的「即期」欄**。
- 時區：以 **Asia/Taipei** 判定，排程於 16:30（牌告固定後）跑。

### D8：顯示層 UI

- **持倉總覽**：保留各市場原幣別小計（精確），底部新增「總成本（TWD）」grand total = Σ(各 position totalCost 換算成 `preferred_display_currency`)。無切換鈕。
- **AssetDetail**：新增 TWD/USD segmented 切換，即時換算該股均價 / 總成本（原幣別為基準，用最新 rate）。
- **AddTransaction**：移除設計稿 §3.3 的「換算 USD」預覽（表單保持純單幣別）。

## Risks / Trade-offs

- **聖牛首次變更動到已上線 schema** → Mitigation：既有行為本就單幣別，攤平不改變 `deriveHoldings` 輸出；§4 worked-example fixture（台積電 avg=550.76）作為迴歸守門；shared ≥90% gate + rules 測試全綠才推。
- **放棄歷史台幣值 / 匯率損益（不可逆於資料層）** → Mitigation：owner 已確認放棄；每日累積 `exchange_rates` 保留事後由 `transaction_date` 重建的可能。
- **Blaze 需綁信用卡，理論上有爆量風險** → Mitigation：用量在免費額度內（每日 1 次、Cloud Scheduler 前 3 job 免費）；設 budget alert（US$1）。
- **functions 打包配置首次建立，可能踩 firebase-functions v6 / esm-cjs 雷** → Mitigation：先在 emulator 跑通 sanity function 再加抓取邏輯；打包設定獨立 commit。
- **台銀 CSV 格式/欄位變動或抓取失敗** → Mitigation：函式對 parse 失敗 fail loud（不寫半套 doc）；顯示層對「無最新 rate」優雅降級。
- **「最新匯率」語意 vs 使用者直覺**：使用者可能誤以為成本是歷史台幣值 → Mitigation：UI 標示換算為 as-of-today 快照（i18n 字串說明）。

## Migration Plan

1. **shared 攤平**（純重構，TDD/迴歸守門）→ typecheck/test 全綠。
2. **functions 打包 + sanity function** 在 emulator 跑通 → 再加 BOT 抓取 + 寫 `exchange_rates`。
3. **mobile** 接顯示層（FX 純函式 + Overview grand total + AssetDetail toggle）。
4. **文件**：planning §5/§6 改寫、ADR-0005、ADR-0004 §3 註記、設計稿 §3.3。
5. **部署**：升 Blaze + budget alert → `firebase deploy --only functions` → 手動觸發一次 seed → Simulator 驗收。
6. **Rollback**：函式可單獨刪除（不影響 App 讀既有 doc）；schema 攤平若需回退，git revert + emulator 重置（pre-launch 無正式資料）。

## Open Questions

- functions 的 firebase-functions 版本與 esm/cjs 輸出格式 → apply 時定（先跑通 sanity 再說）。
- FX 換算純函式的最終命名與簽章（`convertMoney` vs `applyRate`）→ apply 時 TDD 過程中定。
- 排程時間 16:30 是否足夠（牌告偶有延後）→ 先設 16:30，觀察後可調；顯示用「最新筆」對延後容忍度高。
