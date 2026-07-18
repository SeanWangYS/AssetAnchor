## ADDED Requirements

### Requirement: Tag 觸發 iOS 發版

推送形如 `x.y.z-release` 的 tag SHALL 觸發自動發版 workflow；workflow SHALL 驗證 (a) tag 指向的 commit 在 `main` 上、(b) tag 版本等於 `apps/mobile/package.json` 的 `version`，任一不符 SHALL fail-fast 且不觸發 build；驗證通過 SHALL 以 EAS 雲端 build（production profile）並自動 submit TestFlight。

#### Scenario: 版號漂移被擋下

- **WHEN** 打 tag `0.0.5-release` 但 package.json version 仍為 `0.0.4`
- **THEN** workflow SHALL 失敗於版號一致性檢查，SHALL NOT 觸發 EAS build

#### Scenario: 非 main commit 被擋下

- **WHEN** 從未 merge 的分支 commit 打 release tag
- **THEN** workflow SHALL 失敗於 main 祖先檢查，SHALL NOT 觸發 EAS build
