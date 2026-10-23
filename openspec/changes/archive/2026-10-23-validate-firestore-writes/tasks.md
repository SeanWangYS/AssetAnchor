## 1. 準備

- [x] 1.1 盤點 client 寫入點與欄位（四個寫入檔、三個路徑；symbols 只有後端寫）
- [x] 1.2 唯讀掃描 production 文件形狀（無舊版欄位、金額格式全部正確）

## 2. Rules

- [x] 2.1 `firestore.rules`：users / accounts / transactions 的 create 與 update 驗證、限制可寫路徑、symbols 改後端專用
- [x] 2.2 rules 測試：合法寫入（含 batch 與 MCP 交易編輯）、各類非法寫入、enum 防漂移；交易 payload 用 shared `buildTransactionDoc`

## 3. Shared

- [x] 3.1 zod 加長度上限（帳戶名稱 100、備註 1000、代號 32）+ 測試

## 4. 文件

- [x] 4.1 planning §7、CLAUDE.md 架構速覽、symbol-metadata spec

## 5. 驗證

- [x] 5.1 typecheck / lint / prettier / shared coverage / rules 測試全綠
- [x] 5.2 本地 emulator：App 切顯示幣別的寫入在新 rules 下成功
- [ ] 5.3 部署後 owner 在 TestFlight 新增／編輯交易、改現金餘額確認（部署後）
