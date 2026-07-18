# Proposal — add-tag-release-workflow

## Why

TestFlight 發版目前純手動（本機 EAS CLI），版號一致性靠人工留意；owner 要求「打 git tag 即觸發版本更新」的 CI/CD 路徑，並以機器 gate 保證版號一致。

## What Changes

- 新增 `.github/workflows/release-ios.yml`：push `x.y.z-release` tag 觸發——①驗 tag 在 main 上（憲法 #8）②驗 tag 版本＝`apps/mobile/package.json` version（版號單一來源）→ ③EAS 雲端 build（production profile）+ auto-submit。
- `docs/runbook/testflight-release.md`：新增「流程 A：tag 觸發自動發版」為預設路徑，原手動流程降為「流程 B：備援」。
- `README.md` CI/CD 節同步。

## Impact

- 純 infra/docs；不動 app 程式碼、schema、Money。
- 前置 owner 動作：expo.dev 產 `EXPO_TOKEN` → `gh secret set EXPO_TOKEN`（缺 secret 時 workflow 明確失敗、不 silent）。
- 部署/花錢面：workflow 觸發條件（打 tag）本身即 owner 顯式動作，等價於原本口頭授權。
