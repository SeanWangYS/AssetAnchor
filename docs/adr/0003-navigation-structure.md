# ADR-0003: 導航結構（Root Stack + Bottom Tabs ×4 + Modal group）

- **狀態**：Accepted（**部分已被 ADR-0008 修訂**）
- **日期**：2026-06-07
- **相關**：planning doc §11；OpenSpec change `add-account-management`

> ⚠️ **已被 [ADR-0008](./0008-design-package-as-source-of-truth.md) 修訂（2026-06-14）。**
> 本 ADR 的 **4-tab 結構（持倉 / 交易 / 帳戶 / 設定）已不再現行**。設計包定稿後，權威導航改為 **持倉 / 交易 / 分析 / 設定**：**帳戶降為「設定」子頁**（不再是 tab）、**新增「分析」tab**、**交易頁新增入口改 central-FAB（FAB-only，移除 header ＋）**、持倉頁保留 header ＋、新增 SplashGate。
> 仍然成立的部分：Root native-stack + Modal group 的整體骨架、per-navigator ParamList + `CompositeScreenProps` 型別安全、auth state conditional render。
> 以下歷史內容保留作決策軌跡，**tab 清單請以 ADR-0008 與 `docs/design/` 為準**。

## Context

Sprint 2 起 App 從扁平 4-tab 進入有層次的導航：帳戶 tab 需要 List / Detail 兩層；「新增帳戶」要以 modal 呈現，且未來「新增交易」也要從多處觸發、共用同一個 modal（planning §11.3）。需要先定整體導航骨架，避免之後重構。

## Decision

採 React Navigation v7：

- 已登入 → **Root native-stack**，內含兩個 Group：
  - 預設 Group：**MainTabs**（Bottom Tabs ×4：持倉 / 交易 / 帳戶 / 設定），該 tab `headerShown: false`，header 由內層 stack 出。
  - **Modal Group**（`presentation: 'modal'`）：`AddAccount`（Sprint 3 起 `AddTransaction` / `EditTransaction` 共用此 group）。
- 每個 tab 內各自一個 native-stack；Sprint 2 先實作 **AccountsStack**（AccountList / AccountDetail），其餘三個 tab 維持單畫面佔位，各自 sprint 再升級。
- **型別安全**：per-navigator ParamList + `CompositeScreenProps`，讓巢狀畫面能 type-safe 地 navigate 到 Root 的 modal。
- **auth 切換**：`RootNavigator` 依 auth state conditional render（AuthStack ↔ RootStack），不用 `navigate`（避免 history 殘留 / 畫面 flash）。

## Consequences

- 「新增」類 modal 集中於 Root Modal group，多入口共用、route params 預填一致。
- 跨 navigator 導航以 `CompositeScreenProps` 表達，型別清楚。
- 各 tab 可漸進升級為 stack，不必一次重構全部。

## Alternatives Considered

- **AddAccount 放進 AccountsStack 內的 modal**：較簡單，但 Sprint 3 的 AddTransaction 要跨 tab 共用就得搬到 Root；提前放 Root 省一次重構。
- **全域 ReactNavigation RootParamList declaration merging**：可讓 `useNavigation` 免型別，但會讓所有 `useNavigation` 預設指向 root、語意較隱晦；改用顯式 `CompositeScreenProps` 更清楚。
- **Drawer / 5-tab / central-FAB**：planning §11.2 已否決。（**註**：其中 **central-FAB 後經 ADR-0008 採用**——設計稿交易頁改 FAB-only；當時否決的是把全域導航做成 central-FAB，與現行「分頁新增入口用 FAB」不同層次。）
