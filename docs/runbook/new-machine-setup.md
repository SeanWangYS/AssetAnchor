# 換機 / 新 Mac 開發環境建置（New Machine Setup）

> 目的：在另一台 Mac `git clone` 後，照本頁做完即可無縫接續開發（含 Claude Code 協作環境）。
> 日常本地測試流程見 [`local-testing.md`](local-testing.md)；發版見 [`testflight-release.md`](testflight-release.md)。
> 本頁只列「repo 不會自動帶過去」的東西——工具鏈、gitignored secrets、帳號登入、Claude Code 本機設定。

## 0. 速查：哪些東西不在 git 裡

| 類別              | 項目                                                                | 怎麼拿回來                   |
| ----------------- | ------------------------------------------------------------------- | ---------------------------- |
| Firebase 設定檔   | `apps/mobile/.secrets/GoogleService-Info.plist`                     | §3.1                         |
| ASC API key       | `apps/mobile/.secrets/AuthKey_<KEYID>.p8`（手動 EAS submit 才需要） | §3.2                         |
| mobile env        | `apps/mobile/.env`                                                  | §3.3                         |
| functions secrets | `apps/functions/.env.local`、`apps/functions/.secret.local`         | §3.4                         |
| emulator 快照     | `.emulator-data/`                                                   | 不搬，`seed:emulator` 重建   |
| native 專案       | `apps/mobile/ios/`（CNG 產物）                                      | `expo run:ios` 自動 prebuild |
| OpenSpec skills   | `.claude/skills/openspec-*`、`.claude/commands/opsx/`（gitignored） | §5.2                         |
| Claude 全域設定   | `~/.claude/CLAUDE.md`、`~/.claude/settings.json`（plugins）、memory | §5.1 / §5.3                  |

> 最省事的作法：舊機用 AirDrop / 加密隨身碟把 `apps/mobile/.secrets/`、`apps/mobile/.env`、`apps/functions/.env.local`、`apps/functions/.secret.local` 四項直接複製到新機同路徑。**不要**放進雲端同步資料夾或貼到聊天工具。

## 1. 工具鏈

```bash
# Homebrew 之後：
brew install asdf gh cocoapods
brew install cameroncooke/axe/axe            # AXe（模擬器操作 CLI，E2E/視覺對圖用）
brew install --cask temurin                   # JDK ≥ 21（Firestore emulator / rules 測試需要）

# Node：用 asdf，不用 nvm（repo .tool-versions pin nodejs 22.22.3）
asdf plugin add nodejs
cd <repo> && asdf install                     # 依 .tool-versions 裝 Node 22
corepack enable                               # pnpm 9.12.0（package.json packageManager）

# 全域 CLI
npm i -g firebase-tools@15 eas-cli @fission-ai/openspec
curl -fsSL https://get.maestro.mobile.dev | bash   # Maestro（runbook pin 2.6.1，見 e2e-maestro.md）
```

- **Xcode**：App Store 安裝 → 開一次同意授權 → `xcode-select --install`；Settings → Platforms 裝 iOS Simulator runtime。
- **firebase-tools 至少 15.x**：14.x 因 Runtime Config API 下線，`deploy --only functions` 會失敗。
- Bash 工具 / 腳本裡要確保跑在 Node 22：與 `asdf` 啟用串在同一個 shell 呼叫，或設 `ASDF_NODEJS_VERSION=22.22.3`。

## 2. Clone 與 git 身分

```bash
gh auth login                                  # GitHub 帳號 SeanWangYS
gh repo clone SeanWangYS/AssetAnchor && cd AssetAnchor
git config user.name  "Sean Wang"
git config user.email "45586375+SeanWangYS@users.noreply.github.com"
pnpm install
```

> ⚠️ 本 repo 的 commit 身分**一律用 GitHub noreply 別名**，絕不用工作 email（2026-06-24 已用 `git filter-repo` 清過全歷史）。新機的 global git config 若是工作 email，務必在 repo 層覆寫如上。

## 3. Secrets

### 3.1 `GoogleService-Info.plist`

從舊機複製；或 Firebase console → 專案 `assetanchor-832df` → 專案設定 → iOS app `com.seanwangys.assetanchor` → 下載。放到 `apps/mobile/.secrets/GoogleService-Info.plist`（`app.config.ts` 預設讀這裡）。

### 3.2 ASC API key（選用）

只有走「手動 EAS CLI 發版（流程 B）」才需要；tag 觸發的流程 A 在 EAS 雲端已有憑證。從舊機複製到 `apps/mobile/.secrets/`，或 App Store Connect → Users and Access → Integrations 重新產生。

### 3.3 `apps/mobile/.env`

```bash
cp apps/mobile/.env.example apps/mobile/.env   # 內含 EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true
```

其餘 `EXPO_PUBLIC_FIREBASE_*` / `GOOGLE_*_CLIENT_ID` 只是參考值（RNFB 實際讀 plist），可從舊機複製。⚠️ 這個檔會蓋過命令列 env——要讓本地 app 連 production 得改檔案並重啟 Metro。

### 3.4 functions 本地 secrets（只有跑 MCP / functions emulator 才需要）

- `apps/functions/.env.local`：`MCP_ISSUER_URL`
- `apps/functions/.secret.local`：`MCP_COOKIE_KEYS`、`MCP_OIDC_JWKS`（emulator 用值；production 值在 Secret Manager）

產生方式與意義見 [`mcp-operations.md`](mcp-operations.md)。

### 3.5 雲端那邊已就緒、不用動的

GitHub Actions secrets（`EXPO_TOKEN`、`GOOGLE_SERVICES_PLIST_B64`）、EAS env（Sentry DSN / auth token）、EAS iOS 憑證、Firebase Secret Manager 都在雲端，換機不用重設。

## 4. 帳號登入

```bash
firebase login        # seanwangys@gmail.com；.firebaserc 預設 project assetanchor-832df
eas login             # expo 帳號 sean.ys
gh auth status        # 已在 §2 登入
```

## 5. Claude Code 協作環境

### 5.1 全域設定（`~/.claude/`）

從舊機複製：

- `~/.claude/CLAUDE.md`：全域規則（英文提問先改寫、OpenSpec 邀請、**禁止 push/merge main 的安全規則與「專案分級 merge 例外」但書**——本 repo 的分級 merge 授權依賴這段但書存在）。
- `~/.claude/settings.json`：plugins（superpowers 等）、statusline、model 設定。複製後重開 Claude Code 會自動裝 plugins。
- `~/.claude/skills/`：個人 skills（非本專案必要）。

### 5.2 OpenSpec skills（`/opsx:*`）

`.claude/` 除了 `feynman-dojo` 都被 gitignore，新 clone 不會有 `/opsx:propose` 等指令。在 repo 根目錄重新產生：

```bash
openspec init        # 選 Claude Code；已有 openspec/ 不會覆蓋 specs/changes
# 或已初始化過：openspec update --force
```

### 5.3 Claude memory（選用）

Memory 存在 `~/.claude/projects/<repo 絕對路徑轉成的 key>/memory/`，**路徑跟著 repo 絕對路徑走**。持久規則已收斂進 repo `CLAUDE.md`（§協作偏好）與 runbooks，新機不搬也能開發。想保留歷史脈絡：

1. 舊機複製 `~/.claude/projects/-Users-<user>-Documents-Sean-project-AssetAnchor/memory/`
2. 新機先在 repo 內開一次 `claude`，讓它建立新 key 的資料夾
3. 把 memory 檔放進新資料夾（若 clone 路徑與使用者名稱都相同，key 也會相同）

### 5.4 MCP（選用）

AssetAnchor MCP 是 claude.ai custom connector（URL `https://assetanchor-832df.web.app/mcp`），跟著 claude.ai 帳號走；Claude Code 若要用，依 [`mcp-operations.md`](mcp-operations.md) 重新加。

## 6. 驗證清單

```bash
pnpm -r typecheck && pnpm -r lint && pnpm exec prettier --check .
pnpm --filter @assetanchor/shared test:coverage
pnpm --filter @assetanchor/firebase test:rules          # 驗 JDK + firebase-tools

# Terminal 1
pnpm --filter @assetanchor/firebase emulators:fn
# Terminal 2（首次會 prebuild + pod install，較久）
pnpm --filter @assetanchor/firebase seed:emulator
pnpm --filter @assetanchor/mobile ios
```

App 用 `test@assetanchor.dev` / `test1234` 登入，持倉頁出現市值即完成。E2E：`cd apps/mobile && maestro test .e2e/ --exclude-tags=devbuild-flaky`（AXe 命令需帶新機模擬器的 `--udid`，用 `xcrun simctl list devices booted` 查）。

卡住時先看 `CLAUDE.md` §本機開發陷阱，再看 [`local-testing.md`](local-testing.md) 疑難排解。
