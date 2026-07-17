# 走訪日誌（2026-07-17，iPhone 16 Pro Sim / emulator seed data）

環境：emulators:fn（auth+firestore+functions）、seed test@assetanchor.dev、Metro dev build。
注意：functions emulator 會抓真實 Yahoo 報價 → 不同時間點截圖數字可能微幅漂移（勾稽以同畫面內為主）。
測試中途新增：帳戶 Test Broker（Firstrade/US/證券/TWD 基底 + 現金 NT$1,000，保留未刪）、交易 AAPL 5股@200.5（已刪除還原）。

| 截圖                                | 畫面                | 進入路徑                   | 互動                 |
| ----------------------------------- | ------------------- | -------------------------- | -------------------- |
| 00_launch                           | HoldingsOverview    | 啟動即入（快取登入）       | 基準                 |
| 10b_holdings-usd                    | HoldingsOverview    | 顯示幣別 USD               | 切換                 |
| 10c_holdings-list                   | HoldingsOverview    | 捲動至持股清單             | 捲動                 |
| 10d/10e                             | HoldingsOverview    | 帳戶 / 類別 segment        | 切換                 |
| 11_asset-detail-2330                | AssetDetail         | 持股列 2330                | 基準                 |
| 11b/11c/11d                         | AssetDetail         | USD 切換 / 1D 區間 / 底部  | 切換+捲動            |
| 12_asset-transactions-2330          | AssetTransactions   | 查看完整交易歷史           | 基準                 |
| 13_add-tx-from-asset                | AddTransaction      | AssetDetail 入口           | sheet 開啟（後取消） |
| 20_transactions-list                | TransactionList     | Tab 2                      | 基準                 |
| 21_date-range-sheet                 | DateRange           | 期間篩選                   | 基準                 |
| 21b/21c                             | DateRange           | 本月(0筆)/今年(0筆)        | 選項                 |
| 21d                                 | DateRange           | 自訂日期 picker            | 開啟                 |
| 22_transactions-empty-state         | TransactionList     | 套用本月 → 空狀態          | 空狀態               |
| 23_transaction-detail               | TransactionDetail   | 交易列 QQQ                 | 基準                 |
| 24/24b_edit-transaction             | EditTransaction     | 編輯交易（帶值）           | 開啟後取消           |
| 25_delete-confirm                   | TransactionDetail   | 刪除交易 → 確認框          | 取消                 |
| 26_add-transaction                  | AddTransaction      | 交易 FAB                   | 基準                 |
| 26b/26c                             | AddTransaction      | 空表單送出                 | 驗證訊息             |
| 26d~26i                             | AddTransaction      | AAPL/美股/個股/5股/200.5   | 逐欄填寫             |
| 26j_add-tx-submitted                | TransactionList     | 送出成功                   | 新列出現             |
| 30_settings-home                    | SettingsHome        | Tab 4                      | 基準                 |
| 31_about                            | About               | 設定→關於                  | 基準                 |
| 32_profile                          | Profile             | 設定→個人資料              | 基準                 |
| 33_account-list                     | AccountList         | 設定→帳戶管理              | 基準                 |
| 33b                                 | AccountList         | 新增後（Test Broker 出現） | 驗證                 |
| 34/34b_account-detail-tw            | AccountDetail       | 群益證券                   | 基準+底部            |
| 35/35b_account-detail-us            | AccountDetail       | Firstrade                  | 基準+底部            |
| 36_add-account~36h                  | AddAccount          | FAB；空送出→逐欄填→建立    | 完整表單流程         |
| 37_account-detail-empty             | AccountDetail       | Test Broker（空帳戶）      | 空狀態               |
| 40_analysis-top~40d                 | AnalysisOverview    | Tab 3 + 全捲動             | 基準                 |
| 50/50b                              | HoldingsOverview    | 新增交易後                 | post-add             |
| 51/51b_asset-detail-aapl            | AssetDetail         | AAPL（跨帳戶）             | 帳戶分布             |
| 52/53                               | HoldingsOverview    | 帳戶/類別 segment post-add | 切換                 |
| 54_account-list-postadd             | AccountList         | post-add                   | 勾稽                 |
| 55/55b_account-detail-ibkr          | AccountDetail       | IBKR                       | 基準                 |
| 56/56b_account-detail-qunyi-postadd | AccountDetail       | 群益（混幣）               | 勾稽                 |
| 57_edit-account                     | EditAccount         | 編輯帳戶 sheet             | 開啟後取消           |
| 58/58b/58c                          | AccountDetail       | 編輯現金餘額→存 NT$1,000   | 完整流程             |
| 59~59d                              | AccountDetail/List  | 停用→已停用→重新啟用       | 完整流程             |
| 60_notifications                    | HoldingsOverview    | 鈴鐺（無反應）             | dead button?         |
| 61_trend-all                        | HoldingsOverview    | 資產走勢 ALL               | 切換                 |
| 62_holdings-hero-postadd            | HoldingsOverview    | hero post-add              | 勾稽                 |
| 63_double-tap-fab                   | AddTransaction      | FAB 連點兩下               | 只開一個 ✓           |
| 64/64b                              | TransactionDetail   | 刪除 AAPL 新交易 → 還原    | 完整刪除             |
| 70_logout-confirm                   | SettingsHome        | 登出確認框                 | 對話框               |
| 71~71c                              | SignIn              | 空送出/錯誤密碼            | 驗證+錯誤橫幅        |
| 72/72b                              | SignUp              | 建立帳號+空送出            | 驗證                 |
| 73/73b                              | ForgotPassword      | 寄送重設連結+空送出        | 驗證                 |
| 74/74b                              | SplashGate→Holdings | 正確登入                   | 回主畫面             |

## 主大腦當場記錄的候選發現（供交叉檢核，子代理獨立判讀勿先入為主）

1. AddAccount/AddTransaction 空表單送出 → 原始英文 zod 錯誤（enum 內部值外洩）
2. 表單填值/選值後舊驗證錯誤不消失（stale errors）
3. TransactionDetail back 鈕顯示路由名 "TransactionList"
4. 日期格式不一：2025 / 01 / 15（detail）vs 2024-03-14（asset transactions）vs 2026-07-17（表單）
5. 總成本語意不一：TransactionDetail 總成本=股數×單價（不含手續費）；AssetTransactions 總成本=含手續費
6. 小數位不一：均價 NT$151 vs US$192.20；帳戶市值 NT$5,038,450.00 vs 清單 NT$4,880,450
7. 負值/方向表達不一：▼ 33.77%（無負號）vs −33.77%（無箭頭）；已實現 ▲ NT$ 0（零值帶漲箭頭）
8. AccountList 群益 NT$4,880,450 未含 AAPL 美股部位 vs 群益 detail 持股市值 NT$4,933,784.07（跨畫面矛盾）
9. 分析頁 +105.5%（1位小數）vs 持倉 hero +105.86%（2位）
10. 通知鈴鐺點擊無反應
11. 停用帳戶對話框「軟刪除」開發術語
12. TransactionDetail 畫面下方「編輯會開啟與新增交易相同的 sheet 並帶入原值」開發者註記外洩
13. 識別色色塊按鈕無 accessibility label（AXe 顯示空字串）
14. 台股帳戶（群益）可選市場=美股新增交易，無提示/阻擋
15. 走勢圖 Y 軸 2500K/5000K 單位表達
16. Test Broker 有現金 NT$1,000 但 AccountList 顯示「—」
