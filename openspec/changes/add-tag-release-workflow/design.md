# Design — add-tag-release-workflow

## Decisions

1. **GH Actions 只當扣扳機**：`eas build --no-wait --auto-submit`——建置與 submit 在 EAS 雲端，Actions job 數十秒結束（不佔 runner 分鐘數、無 30min timeout 風險）。代價：Actions 綠 ≠ 發版成功，build 失敗要看 expo.dev / email；可接受（EAS 端本來就有通知）。
2. **兩道安全 gate 前置**：(a) `git merge-base --is-ancestor $GITHUB_SHA origin/main`——只允許從 main 發版；(b) tag 字串去掉 `-release` 必須 strcmp 等於 package.json version——把「版號一致性」從人工紀律變機器 gate。
3. **tag pattern `[0-9]+.[0-9]+.[0-9]+-release`**：沿用既有 `0.0.2-release` 慣例，glob 過濾非發版 tag。
4. **token 走 GitHub secret `EXPO_TOKEN`**（expo robot token）：EAS 端既有機密（GOOGLE_SERVICES_PLIST/Sentry）不動、仍由 EAS production env 提供。

## Alternatives considered

- Actions 內同步等 build 完再 submit：runner 空轉 15-25 分鐘，且 submit 已有 `--auto-submit` 原生支援——否決。
- workflow_dispatch 手動按鈕：與「打 tag 觸發」訴求不符，留待需要時另加。
