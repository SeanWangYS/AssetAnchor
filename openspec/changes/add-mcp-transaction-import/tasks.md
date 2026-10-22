## 1. shared：時序、重複與超賣（TDD）

- [ ] 1.1 先寫測試：`sortTransactionsChronologically` 同日 BUY 先於 SELL、同類型維持輸入順序；`deriveHoldings` 當沖案例不擲錯
- [ ] 1.2 抽出並 export 排序函式，`deriveHoldings`／`deriveRealizedEvents` 改用它，既有測試全綠
- [ ] 1.3 先寫測試：`transactionDuplicateKey` 正規化、`findDuplicates`（既有、同批）
- [ ] 1.4 實作重複判定
- [ ] 1.5 先寫測試：`findImportOversells`（只賣超賣、先買後賣、當沖、既有異常不歸咎、跨帳戶不互抵、跨幣別不互抵）
- [ ] 1.6 實作批次超賣檢查
- [ ] 1.7 `TransactionDocument` 新增選填 `source`、`import_batch_id`，shared coverage gate 綠

## 2. MCP 匯入工具

- [ ] 2.1 先寫測試：確認碼簽發與驗證（同清單通過、任一欄位不同失敗、過期失敗、不同使用者失敗）
- [ ] 2.2 實作確認碼（HMAC，金鑰由 cookie key 衍生）
- [ ] 2.3 先寫測試：待匯入列正規化（預設值、字串數值、沿用 `transactionInputSchema` 訊息）
- [ ] 2.4 實作正規化與逐列驗證組裝（ok／duplicate／invalid／oversell、new_symbol）
- [ ] 2.5 實作 `validate_transactions`（帳戶檢查、代號存在性與 Yahoo 確認、50 筆上限）
- [ ] 2.6 實作 `create_transactions`（scope 檢查、確認碼比對、重新驗證、batch 寫入、建立新代號）
- [ ] 2.7 resource scope 加入 `transactions.write`；`list_transactions` 新增 `import_batch_id` 篩選與輸出
- [ ] 2.8 同意頁權限清單加入「新增交易」

## 3. 整合測試與驗證

- [ ] 3.1 整合測試涵蓋 `mcp-server`、`mcp-authorization`、`transaction-import` 新增情境（含確認碼竄改、驗證後資料變動、新代號建立、舊權杖缺寫入 scope）
- [ ] 3.2 無頭 Chrome 重跑登入／同意流程並截圖確認權限清單
- [ ] 3.3 更新 ADR-0011 與 mcp-operations runbook（重新授權說明）

## 4. DoD 與交付

- [ ] 4.1 typecheck、lint、prettier、shared coverage、functions 單元與整合測試、rules、mobile 測試全綠
- [ ] 4.2 開 PR（stacked on #88；聖牛 schema + 部署，owner merge）
- [ ] 4.3 （owner）部署後在 claude.ai 以真實截圖匯入一批交易並在 App 確認
- [ ] 4.4 `/opsx:archive`，更新 planning §6 Collection 3 欄位
