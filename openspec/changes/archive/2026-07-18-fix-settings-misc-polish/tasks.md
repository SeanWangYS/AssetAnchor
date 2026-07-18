# Tasks — fix-settings-misc-polish

## 1. 實作

- [x] 1.1 P2-5：兩頁 label「均價（含費）」
- [x] 1.2 P3-7：shared formatDisplayTime（TDD）+ HoldingsOverview as-of（targets+quoteFor 迭代、maxMs>0 guard、並存「· 延遲 15 分鐘」）+ AssetDetail 收斂手拼
- [x] 1.3 P3-15：「登入帳號」「現金餘額（合計）」「帳號」（group 改名）三處字面 + 註解同步
- [x] 1.4 P3-16：Input editable=false disabled 樣式；dirty-state 視覺查證標記
- [x] 1.5 P3-17：package.json 0.0.2 + app.config/About 讀之；描述補加密貨幣；i18n 死碼同步；holdings-overview-spec 設計包加註（獨立 commit）

## 2. 驗證（DoD）

- [x] 2.1 設計稽核：2 獨立子代理（邏輯 / 簡潔）——7 必改全採納（P3-15 兩文件統一為「帳號」、spec 同名措辭收斂、as-of guards/並存文案、設計包同步、expo-constants 事實更正）
- [x] 2.2 typecheck / lint / prettier / shared coverage / mobile test 全綠
- [x] 2.3 模擬器對照：個股/交易歷史「均價（含費）」、持倉註腳最後更新、設定三處字面、Profile 唯讀樣式、About 0.0.2+crypto
- [x] 2.4 隱私政策 owner-hold 記入總結報告

## 3. 收尾

- [x] 3.1 commit → push → PR（stacked on #64；owner 拍板：名稱/用語/版本來源）
- [x] 3.2 CI 綠（owner-gated 不自 merge）→ `/opsx:archive`
