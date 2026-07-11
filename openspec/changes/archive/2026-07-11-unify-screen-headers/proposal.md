## Why

2026-07-11 TestFlight dogfood 發現四個 tab 落地頁標題不一致且有實際缺陷：交易頁是唯一自繪標題的頁（`headerShown:false` + 自排版），但**沒有 safe-area top inset**（僅 `paddingTop: 4`）→ 真機上「交易紀錄」壓到狀態列時鐘；另外三頁（持倉/分析/設定）用原生 stack header（~17pt regular），與設計包規定的**標題 23px / 800**（`holdings-overview-spec.md` §3.1、`analysis-page-spec.md` §3.1）不符。設計包是 UI 最高權威（ADR-0008），四頁應統一。

## What Changes

- 新增共用元件 `core/ui/ScreenHeader.tsx`：`useSafeAreaInsets()` top inset + 標題 23px/800（`fontSize.screenTitle` + `fontFamily.text.extrabold`）+ 可選右側 actions slot。
- `core/theme` 新增語意 token `fontSize.screenTitle = 23`（與既有 `cardTitle` 同值、語意分離：畫面標題 vs 卡片標題，日後可獨立調整）。
- 四個 tab 落地頁換用 ScreenHeader：
  - **持倉總覽**：關原生 header（`headerShown:false`），🔔 通知鈕 + ＋ 新增交易鈕移入 ScreenHeader 右側 slot（入口行為不變，navigation spec「持倉 tab 保留 header ＋」仍成立）。
  - **交易紀錄**：既有自繪標題改用 ScreenHeader（修 safe-area 壓時鐘 bug），右側日曆鈕移入 slot。
  - **分析**：關原生 header，改 ScreenHeader（無右側 actions）。
  - **設定**：關原生 header，改 ScreenHeader（無右側 actions）。
- **子頁不動**：AssetDetail / AssetTransactions / Profile / About / 帳戶管理等 push 進來的子頁保留原生 header（有返回鍵，屬導航 chrome，設計包未要求 23px）。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `design-system`：新增 requirement——四個 tab 落地頁的畫面標題使用共用 `ScreenHeader`（safe-area top inset + 23px/800），不使用原生 stack header。

## Non-goals

- 不改子頁（push screens）的原生 header 樣式。
- 不做通知功能（🔔 鈕維持現狀：純顯示、無 onPress 行為）。
- 不動導航結構（4 tab / modal group / SplashGate 皆不變）；navigation spec 無 requirement 變更。
- 不做 light 主題、不做 i18n（維持 MVP 決策）。
- 不重排各頁 body 內容——僅標題列區塊。

## Impact

- `apps/mobile/src/core/ui/ScreenHeader.tsx`（新增）+ `core/ui/index.ts` export。
- `apps/mobile/src/core/theme/index.ts`：`fontSize` 加 `screenTitle` 鍵（additive，不動既有鍵）。
- `HoldingsStack.tsx` / `AnalysisStack.tsx` / `SettingsStack.tsx`：落地 screen 改 `headerShown:false`。
- `HoldingsOverviewScreen.tsx`：移除 `useLayoutEffect` + `navigation.setOptions({ headerRight })`，改 ScreenHeader。
- `TransactionsScreen.tsx`：自繪 header 換 ScreenHeader。
- `AnalysisOverviewScreen.tsx` / `SettingsScreen.tsx`：加 ScreenHeader。
- 無 schema / functions / shared 變更；無新依賴（`react-native-safe-area-context` 已在用）。
- 風險：持倉頁 e2e（Maestro）若依賴原生 header 元素需驗證；帶 UI → **owner-gated merge + iOS Simulator 視覺對圖**。
