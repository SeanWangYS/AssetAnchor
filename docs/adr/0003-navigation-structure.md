# ADR-0003: 導航結構（Root Stack + Bottom Tabs ×4 + Modal group）

- **狀態**：Accepted
- **日期**：2026-06-07
- **相關**：planning doc §11；OpenSpec change `add-account-management`

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
- **Drawer / 5-tab / central-FAB**：planning §11.2 已否決。
