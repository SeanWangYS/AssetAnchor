## 1. shared（TDD）

- [x] 1.1 先寫測試：`findNewOversells`（刪除較早買入、刪除賣出、修改改小買入、換帳戶、既有異常不算）
- [x] 1.2 實作 `findNewOversells`，coverage gate 綠

## 2. MCP 修改與刪除工具

- [ ] 2.1 先寫測試：修改合併與正規化、前後內容的確認碼綁定、刪除組合的確認碼綁定
- [ ] 2.2 實作 `preview_update_transaction`、`update_transaction`
- [ ] 2.3 實作 `preview_delete_transactions`、`delete_transactions`（ID 上限 20、批次）
- [ ] 2.4 同意頁權限文字改為新增、修改、刪除

## 3. 驗證與文件

- [ ] 3.1 整合測試涵蓋 `mcp-server` 新增情境（修改、修改超賣、預覽後被改動、刪單筆、刪整批、超過 20 筆、刪除超賣、他人交易、只讀權杖）
- [ ] 3.2 無頭 Chrome 確認同意頁文字
- [ ] 3.3 更新 ADR-0011 與 runbook 驗收步驟

## 4. DoD 與交付

- [ ] 4.1 typecheck、lint、prettier、shared coverage、functions 單元與整合、rules、mobile 全綠
- [ ] 4.2 開 PR（stacked on #89；破壞性操作與部署，owner merge）
- [ ] 4.3 （owner）部署後在 claude.ai 驗收修改與刪除
- [ ] 4.4 `/opsx:archive`
