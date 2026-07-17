## ADDED Requirements

### Requirement: 帳戶-市場錯配軟提示

新增/編輯交易時，所選帳戶的市場與表單市場不一致 SHALL 顯示非阻斷提示（複委託/跨市場為合法情境，SHALL NOT 阻擋送出）。

#### Scenario: 台股帳戶記美股交易

- **WHEN** 使用者選擇台股帳戶且市場為美股
- **THEN** 帳戶欄下方 SHALL 顯示「複委託請確認」語意的提示；送出 SHALL 仍可成功

### Requirement: 期間篩選 preset 回填與零命中降級

選擇 preset SHALL 將起訖欄回填為該 preset 的實際日期區間（「全部」清空）；套用鈕於命中 0 筆時 SHALL disable（按下必得空清單的操作不可執行）。

#### Scenario: 選「今年」回填起訖

- **WHEN** 使用者點選「今年」preset
- **THEN** 起欄 SHALL 顯示當年 1 月 1 日、訖欄 SHALL 顯示當年 12 月 31 日（期末——與 preset 過濾語意完全等價，含未來日交易）；套用後命中筆數 SHALL 與回填區間一致

#### Scenario: 「全部」恆可套用

- **WHEN** 使用者選「全部」且目前命中 0 筆
- **THEN** 套用鈕 SHALL 仍可按（語意＝清除篩選）

#### Scenario: 零命中不可套用

- **WHEN** 目前選取的區間命中 0 筆
- **THEN** 套用鈕 SHALL 為 disabled 狀態

### Requirement: 新增交易入口傳遞標的 context

自個股頁開啟的新增交易 SHALL 預填該標的（代號/市場/資產類型/幣別）；自持倉 header 與交易 FAB 開啟 SHALL 維持空白表單。sheet 標題 SHALL 為「新增交易」（與全 app 用詞一致）。

#### Scenario: 個股頁帶入標的

- **WHEN** 使用者在 QQQ 個股頁點「＋ 為此標的新增交易」
- **THEN** 表單代號 SHALL 為 QQQ、市場美股、資產類型與幣別隨標的帶入

### Requirement: 本月已實現的無資料表達

本月無任何賣出時，「本月已實現損益」SHALL 以「—」加註「本月無賣出」呈現；有賣出且合計為零 SHALL 以中性零值呈現——兩者可區分。

#### Scenario: 無賣出月份

- **WHEN** 當月沒有任何 SELL 交易
- **THEN** SHALL 顯示「—」與「本月無賣出」註記，SHALL NOT 顯示 0 或漲跌箭頭
