# Design — fix-accounts-ui-polish

## Context

`CashBalanceCard`（core/ui）恆用 TextInput、值由 `cashDisplay`（accountService）給 `toDisplayString()` 裸 2 位字串。`AccountListScreen.valueText` 無持股回 `'—'`、副標 `${brokerLabel} · ${a.market}`（raw enum）。停用 ConfirmDialog message 含「軟刪除」。`ColorSwatches` 用 theme `ACCOUNT_COLORS`（8 色，註解自承 spec ×6）、swatch 無 accessibilityLabel。AccountDetail hero `pnlRow` `flexWrap:'wrap'` 使「未實現」label 與值可被拆行；「編輯現金」Pressable 不看 `is_active`。AddAccountScreen 靠 native modal 手勢關閉、無明示鈕。spec A2「類型·市場｜右側市值不放現金保持單行」、A3「停用市值顯示 —」、A7「色票 ×6」。

## Goals / Non-Goals

**Goals**：六項一次修，全依 spec 內解法；**Non-goals**：見 proposal。

## Decisions

1. **P2-7**：`CashBalanceCard` 增加檢視態渲染分支——`editable=false` 時以 `<Text>`（同 input 字級/右對齊）顯示；AccountDetail 檢視態的值改傳 hero 同款 2 位千分位（畫面既有 `fmtNum` helper——帳戶頁「一律 2 位」為規則表明文例外，現金卡納入同例外）；**檢視態版式＝原型 CashCardLive 的無框 key-value 列**（「NT$｜158,000.00」右對齊、去輸入框邊框——audit 抱怨的正是輸入外觀；原型檢視態 TWD 0 位 vs 規則表例外 2 位＝已知偏離，對圖備註）；空值顯示「0.00」淡色；編輯態維持 TextInput + 原始字串（startEdit 初始值取自 account doc、不受檢視格式污染，已驗證）；onChangeTwd/Usd 改 optional。
2. **P2-8**：`valueText` 簽名改收 account——`!a.is_active` → `'—'`（spec A3；現碼停用也算市值反而違 A3，本改動為修正）；啟用且 `positions.length===0` → `'無持股'`（報價載入中必有 positions>0 落入「N 檔更新中」分支，無誤顯路徑——稽核已驗；**`skipped.length>0`（爛資料整檔跳過）時維持「—」**避免誤導）；其餘照舊。順手把 inactive 帳戶排除出 `allTargets` 報價目標（清單層已不需要）。
3. **P2-9**：停用確認 message → `'停用後帳戶會收進「已停用」區、不再列入統計；可隨時重新啟用。'`；**同檔 L493 刪除受阻 dialog 的「（軟刪除、可復原）」一併去 jargon**（稽核必改：同類文案修一漏一）→ `'請改用「停用帳戶」（可隨時重新啟用）'`。
4. **P3-12a 關閉鈕**（稽核必改定案）：AddAccount 已有 native header（title「新增帳戶」）但無關閉鈕——**在 RootStack 的 AddAccount options 加 `headerLeft`「取消」**（原型表單 header＝左取消右儲存；與 AccountListScreen headerLeft 既有模式一致）。其他 modal（AddTransaction 等）同缺 → 記 backlog、不擴 scope。
5. **P3-12b a11y**：theme 增 `ACCOUNT_COLOR_LABELS`（hex→色名；`satisfies Record` 鎖漏 label），swatch `accessibilityLabel={label ?? c}`。
6. **P3-12c 色票 8→6**（稽核必改：引 A7 引到底）：**採原型明定 6 hex `['#4C6FE8','#7C6CF0','#A368F0','#22C55E','#E8B14C','#FF7A45']`**（aa-v2-accounts.jsx L179；非「刪最後兩色」）；色名 藍/紫/紫羅蘭/綠/琥珀/橘；seed 的 #2FD37E（富邦）不在新盤——依明文接受（顯示不受影響、重選才變）；既有帳戶存第 7/8 色時 Avatar 照 hex 渲染不受影響；編輯表單遇非清單色 → 該色不在 swatches 中、使用者改選才變（可接受，不做特殊「保留原色」swatch——過度工程）。
7. **P3-13a**：pnlRow 內「未實現」label + 金額 Pnl + 百分比 Pnl 包 `<View style={inline row, flexShrink:0}>`——wrap 只能發生在群組間、不能拆 label 與值。
8. **P3-13b**：編輯現金 Pressable 包 `acct.is_active ? … : null`。
9. **P3-14**：副標 `${accountTypeLabel(a.account_type)} · ${marketZhLabel(a.market)}`；`marketZhLabel` 收進 `accountDisplay.ts`（TW 台股/US 美股/CRYPTO 加密貨幣/OTHER 其他——與 AccountForm `MARKET_LABELS` 同表，抽到 accountDisplay 供兩處共用、單一定義）。

## Risks / Trade-offs

- [「無持股」文案取捨] → owner 拍板項；fallback 恢復「—」一行。
- [色票縮 6 後既有第 7/8 色帳戶編輯體驗] → 顯示不受影響；重選才變色（明文接受）。
- [CashBalanceCard 檢視/編輯雙分支] → 元件內 if 分支、props 不變（editable 既有），呼叫端只改傳入值格式。

## Migration Plan

單 PR（stacked on #63）。Rollback = revert。

## Open Questions

（無。）
