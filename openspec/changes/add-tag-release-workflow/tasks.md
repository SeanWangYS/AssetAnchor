# Tasks — add-tag-release-workflow

## 1. 實作

- [x] 1.1 `.github/workflows/release-ios.yml`（tag pattern + 兩道 gate + EAS 扣扳機）
- [x] 1.2 runbook 流程 A/B 重排 + `EXPO_TOKEN` 前置說明
- [x] 1.3 README CI/CD 節同步

## 2. 驗證（DoD）

- [x] 2.1 prettier / actionlint 級語法檢查（yaml 可 parse）
- [ ] 2.2 owner 設 `EXPO_TOKEN` secret 後，下次發版（打 tag）實戰驗證 gate 與觸發

## 3. 收尾

- [x] 3.1 PR（owner merge——動 CI/部署面）
- [x] 3.2 archive
