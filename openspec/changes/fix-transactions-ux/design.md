# Design — fix-transactions-ux

## Context

TransactionDetail L133 有常駐 hint（設計稿 annotation）。TransactionForm 已有兩個軟警告前例：`marketMismatchHint`（代號樣式 vs 市場，非阻斷 accent 提示）與市場→幣別聯動；帳戶維度缺對應檢查（`accounts` prop 有每帳戶 `market`）。HoldingsOverview header 鈴鐺 Pressable 無 onPress（e2e 以 a11y label「新增交易」選＋鈕、未用「通知」）。DateRangeSheet `onSelectPreset` 清空起訖（互斥語意）、`canApply` 只看 custom 合法性不看 count；`filterByPreset`/`inRange` 已有純函式與測試。Fab 絕對定位 bottom 24、TransactionsScreen content paddingBottom 96。`zhTW.transactions.addTitle = '新增買入'`，3 條 e2e yaml 斷言此字串。AddTransaction route params `undefined`；AssetDetail 入口 `navigate('AddTransaction')` 不帶 context；`TransactionFormDefaults = Partial<TransactionFormValues>` 可直接預填。

## Goals / Non-Goals

**Goals**：六項（P2-9/P2-11/P2-14/P3-9/P3-10/P3-11）一次修；全屬顯示/表單層。
**Non-goals**：見 proposal。

## Decisions

1. **P2-9**：刪 L133 `<Text style={styles.hint}>` 與 `hint` style（無其他消費者）。
2. **P2-11 帳戶-市場提示**：`accountMarketMismatchHint = useMemo(...)`——`accounts.find(a => a.account_id === accountId)`，帳戶存在且表單 market 為合法 MARKETS 且兩者不等 → 提示字串（帳戶市場繁中標籤化：台股/美股/加密貨幣）；渲染於帳戶 picker 下方，樣式複用 `marketMismatchHint`。CRYPTO 帳戶記 TW/US 同樣提示（一般化「所選帳戶為 X 帳戶，交易市場為 Y——若為複委託/跨市場交易請確認」）。不阻斷（sellable 檢查等既有機制不變）。
3. **P2-14**：刪鈴鐺 Pressable + `bell` Icon import（若他處未用）；headerActions 保留＋鈕。e2e 無「通知」選取器（已 grep），安全。
4. **P3-9a `presetRange`**（稽核必改重寫）：dateRangeStore 新增純函式 `presetRange(preset, now): CustomRange | null`——**逐字對齊 `inRange` 的日曆月語意**：`month`＝當月 1 日..**當月月底**、`last3m`＝**前兩個日曆月的 1 日**..當月月底（同 inRange 的 `year*12+month` 線性化，非「今日往前 3 個月」——setMonth 會 rollover）、`ytd`＝1/1..**12/31**、`all`/`custom`＝null。**訖端採期末而非今日**（owner 拍板：schema 不禁未來日交易，期末回填使「等價性」無條件成立且誠實反映 preset 語意；fallback＝今日+接受未來日語意差）。等價性測試 `filterByPreset(preset) ≡ filterByPreset('custom', presetRange(preset))` **parametrize now**（月底 2026-05-31、1 月、閏年 2 月）+ fixture 含窗界前後一日與未來日交易。`onSelectPreset` 以 presetRange 回填（null 清空）；**重開 sheet 非 custom 也以 presetRange(current) 初始化**（與「選 preset 即回填」一致）；回填不觸發 `setSel('custom')`（只綁 onChangeText，已驗證）。
5. **P3-9b**：`canApply = sel === 'all' || ((sel !== 'custom' || isValidCustomRange(range)) && count > 0)`——**all 豁免 count**（套用「全部」語意＝清除篩選，永遠可執行；否則 0 筆交易時「重設」按了無事可做，稽核 wart）。
6. **P3-9c**：TransactionsScreen content paddingBottom 96 → 128。不動 Fab 元件（其他畫面共用；safe-area 大改屬 backlog）。
7. **P3-10a**（稽核必改重寫）：zh-TW `addTitle: '新增交易'` + `empty` 文案「新增買入」同步。**e2e 守門不可純換字串**——持倉 ＋ 與交易 FAB 的 a11y label 就是「新增交易」，`notVisible: '新增交易'` 永遠 timeout、`visible` 變空洞。改用 **modal 專屬元素「股票代號」**（表單欄 label，唯一、開 sheet 即在畫面上）：開＝`visible: '股票代號'`、關＝`notVisible: '股票代號'`。
8. **P3-10b**：realized.count === 0 分支的「—」下方加 `<Text style={styles.bentoSubNote}>本月無賣出</Text>`（樣式同 bentoSub 家族、textFaint）。
9. **P3-11**（稽核必改：Position 無 assetType 欄位）：navigation types `AddTransaction: { symbol?: string; market?: Market; asset_type?: AssetType; currency?: Currency } | undefined`；AssetDetail 入口的 `asset_type` **取該 (market,symbol) 最近一筆交易的 `asset_type`**（AssetDetail 已訂閱 transactionsStore；與表單代號補完同取值口徑），無交易 fallback 省略該欄；currency＝position.currency。AddTransactionScreen 以 **`route.name === 'AddTransaction'` 窄化** route.params（勿 boolean+cast）；優先序 edit > copy > params。市場→幣別聯動 prevMarketRef mount 不觸發、不覆寫帶入 currency（已驗證）。持倉 header ＋ 與交易 FAB 不帶 params。順帶清過時註解（「a11y label 通知…e2e 依此選取」、ScreenHeader doc 的 🔔）。

## Risks / Trade-offs

- [presetRange 與 inRange 邊界漂移] → 等價性單元測試鎖住（同 preset 與回填 custom 命中數必等）。
- [e2e 字串同步漏改] → grep '新增買入' 全 repo 歸零驗證。
- [P3-11 params 打字（route.params as ...）] → 走 typed RootStackParamList，typecheck 把關。
- [鈴鐺移除偏離原型] → PR 置頂 owner 拍板；fallback 一行復原。

## Migration Plan

單 PR（stacked on #62）。Rollback = revert。

## Open Questions

（無。）
