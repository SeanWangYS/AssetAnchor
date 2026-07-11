## Context

四個 tab 落地頁的標題實作分裂成兩套：

| 頁面     | 現況                                                                  | 問題                                                                                            |
| -------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 持倉總覽 | 原生 stack header（`title` + `setOptions({ headerRight })` 掛 🔔/＋） | 標題 ~17pt semibold，不符 spec 23px/800                                                         |
| 交易紀錄 | `headerShown:false` + 自繪標題（`fontSize.cardTitle`/extrabold）      | **無 safe-area top inset**（僅 `paddingTop: spacing.xs`=4）→ 真機壓狀態列時鐘                   |
| 分析     | 原生 stack header                                                     | 同持倉，不符 23px/800（`analysis-page-spec.md` §3.1）                                           |
| 設定     | 原生 stack header                                                     | 同上（設計包無獨立 settings spec，統一樣式依 app-prototype + 兩份既有 spec 的共同 header 模式） |

設計包規定（`holdings-overview-spec.md` §3.1 item 2、`analysis-page-spec.md` §3.1 item 1）：落地頁標題 **23px / 800**。ADR-0008：設計包是 UI 最高權威。

限制：`react-native-safe-area-context` 已是依賴（auth 畫面在用 `SafeAreaView`）；theme token 檔明訂「不可刪鍵、不可改鍵型別」（additive only）。

## Goals / Non-Goals

**Goals:**

- 四個 tab 落地頁標題視覺統一為 23px/800，且正確避開狀態列（safe-area top inset）。
- 標題列收斂成單一共用元件 `core/ui/ScreenHeader.tsx`，右側 actions 用 slot 傳入（持倉 🔔/＋、交易 日曆鈕）。
- 既有入口行為零變化：持倉 ＋ → AddTransaction modal、交易 日曆 → DateRange sheet。

**Non-Goals:**

- 子頁（AssetDetail、Profile、About、帳戶管理等 push screens）維持原生 header——有系統返回鍵與轉場動畫，屬導航 chrome，設計包未對其要求 23px。
- 🔔 通知鈕不加功能（維持現狀純顯示）。
- 不改 tab bar、modal group、SplashGate；不動 body 內容排版。

## Decisions

### D1｜自繪 ScreenHeader 而非調原生 header 樣式

原生 `headerTitleStyle` 雖可調字級，但 iOS large-title/普通 title 有平台上限與置中排版，無法做到 spec 的「左對齊 23px/800 + 右側自訂圓鈕群」版型；交易頁已證明自繪可行。**選擇**：落地頁一律 `headerShown:false` + 自繪 `ScreenHeader`。**替代案（否決）**：`headerTitle: () => <Text …/>` 客製——仍受原生 header 高度/佈局約束，且四頁寫法會再度分裂。

### D2｜safe-area 用 `useSafeAreaInsets()` 而非 `SafeAreaView`

ScreenHeader 內部以 `useSafeAreaInsets().top` 加到自身 `paddingTop`，畫面根容器不需要包 `SafeAreaView`——避免整頁被推移影響既有 FAB/捲動區域（bottom inset 由 tab bar 處理）。auth 畫面的 `SafeAreaView` 模式不套用：那是整頁式無 tab 的畫面。

### D3｜API 形狀：`title` + 可選 `right` slot

```tsx
<ScreenHeader
  title="持倉總覽"
  right={
    <>
      {bellBtn}
      {plusBtn}
    </>
  }
/>
```

只收 `title: string` 與 `right?: ReactNode`。不做 `left`、subtitle、返回鍵——落地頁沒有這些需求，出現需求時再擴充（YAGNI）。內建排版：`paddingHorizontal: spacing.page`、title `flex:1` 左對齊、right 橫排 gap。

### D4｜token：新增 `fontSize.screenTitle = 23`（語意分離，不重用 cardTitle）

`fontSize.cardTitle` 恰好也是 23，但語意是「卡片標題」；畫面標題借用它會讓日後任一方調整互相牽連。theme 檔規約 additive-only，新增鍵無風險。ScreenHeader 用 `fontSize.screenTitle` + `fontFamily.text.extrabold`（=800，對齊 spec）。

### D5｜持倉頁 headerRight 遷移

移除 `useLayoutEffect` + `navigation.setOptions({ headerRight })`（原生 header 關掉後失效），🔔/＋ 兩鈕原封搬進 `right` slot；`accessibilityLabel="新增交易"`、`accessibilityLabel="通知"` 維持不變（Maestro e2e 依 a11y label 選取，不能斷）。

### D6｜Stack 層只關落地 screen 的 header

`HoldingsStack` / `AnalysisStack` / `SettingsStack` 僅對落地 screen 設 `options={{ headerShown: false }}`，navigator 層 `screenOptions` 的 header 樣式保留給子頁。`SettingsStack` 的 `Accounts` screen 已是 `headerShown:false`（掛 AccountsStack），不動。

## Risks / Trade-offs

- [持倉頁 Maestro e2e 依賴 header 元素] → 兩鈕的 a11y label 原樣保留；跑 `.e2e` 既有 flows 驗證（`add-crypto-transaction.yaml` 等以 ＋ 進表單的 flow）。
- [自繪 header 失去原生 scroll-edge 效果（半透明/模糊）] → 現有原生 header 已設 `headerShadowVisible:false` + 純色底，本來就無此效果，無損失。
- [分析/設定頁從未自繪，加 ScreenHeader 後頂部間距觀感變化] → iOS Simulator 逐頁視覺對圖（ADR-0008 gate），對齊 prototype。
- [交易頁修 inset 後整頁下移 ~59pt] → 這正是 bug 修復的預期效果；對圖確認 pill/清單間距不跑版。

## Migration Plan

單一 PR（含本 change 文件）；帶 UI → owner merge。無資料/schema 遷移。rollback = revert commit。

## Open Questions

（無——樣式數值皆有 spec 依據；設定頁缺獨立 spec 一節已在 Context 說明以統一模式處理。）
