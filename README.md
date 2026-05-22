# AssetAnchor

個人投資組合追蹤 App — 整合跨券商（Firstrade、Interactive Brokers、moomoo、群益等）的台股 + 美股部位。

> **狀態**：Sprint 0 Foundation 進行中（2026-05-22 起）。MVP 規劃見 [`docs/portfolio_tracker_planning.md`](docs/portfolio_tracker_planning.md)。

## 技術棧

- **App**：React Native + Expo（iOS + Android）
- **後端**：Firebase（Firestore + Auth + Cloud Functions）
- **共用**：pnpm workspaces monorepo + TypeScript strict + decimal.js
- **品質**：ESLint + Prettier + Husky + commitlint + Jest + GitHub Actions

## Repo 結構

```
apps/mobile        # Expo React Native app
apps/functions     # Firebase Cloud Functions
packages/shared    # 跨 app 共用型別 / enum / Money class
firebase/          # firestore.rules / indexes
docs/              # 規劃文件、ADR
```

## 開發

```bash
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm install
pnpm -r typecheck
pnpm -r test
pnpm -r lint
```

## License

MIT — 見 [`LICENSE`](LICENSE)。
