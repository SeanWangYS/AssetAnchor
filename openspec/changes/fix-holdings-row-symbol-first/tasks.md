# Tasks — fix-holdings-row-symbol-first

## 1. 實作

- [x] 1.1 HoldingRow 移除 Avatar/avatarColor/dense
- [x] 1.2 標題行對調（rowSymbolMain / rowNameSub 新 style）
- [x] 1.3 e2e/測試選擇器掃描（依名稱前置的斷言）
- [x] 1.4 設計包同步：spec §3.1 item 7 + 原型 jsx（獨立 commit）

## 2. 驗證（DoD）

- [x] 2.1 全 gates（typecheck/lint/prettier/shared coverage/mobile test）
- [x] 2.2 iOS Simulator 視覺對圖：三種分組 row 皆「無圓標、代號為主」；右欄三態不動

## 3. 收尾

- [x] 3.1 commit 分拆（mobile / 設計包獨立 / openspec）→ push → PR（帶 UI，owner merge）
- [ ] 3.2 archive
