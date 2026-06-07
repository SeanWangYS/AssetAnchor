# ADR-001: Monorepo with pnpm Workspaces

- **Status**: Accepted
- **Date**: 2026-05-23（Sprint 0）
- **Deciders**: Sean Wang

## Context

AssetAnchor 包含三個明確獨立但**共用 Firestore schema 與 Money class** 的部分：
- `apps/mobile`（Expo React Native App）
- `apps/functions`（Firebase Cloud Functions）
- `packages/shared`（Firestore document types、enums、Money）

若不共用，等於要在三邊重複維護同樣的 type/enum/邏輯，且任何 schema 變動須三邊同步。

## Decision

採 **monorepo + pnpm workspaces**：
- 工作目錄 `apps/*`、`packages/*` 透過 `pnpm-workspace.yaml` 宣告
- `@assetanchor/shared` 以 `workspace:*` 形式被 mobile / functions 引用
- 不額外裝 Turborepo / Nx；`pnpm -r <script>` 已足夠跑跨 workspace 指令

## Consequences

- ✅ Types / enums / Money 改動一次、三邊立即同步
- ✅ Single `pnpm install`、single lockfile
- ✅ CI 只需一條 install pipeline
- ⚠️ Expo + pnpm 整合：SDK 52+ 的 Metro 已自動支援 monorepo（免手寫 `metro.config.js`），但 pnpm 需設 `node-linker=hoisted`（本專案 pnpm 9.12 寫在 `.npmrc`；pnpm 10+ 改用 `pnpm-workspace.yaml` 的 `nodeLinker: hoisted`）才能讓 Metro 解析到跨 workspace 的 `@assetanchor/shared`（Sprint 1 處理，原理見 `docs/tech_note/expo-pnpm-monorepo-integration.md`）
- ⚠️ Firebase Functions deploy 時要打包 `packages/shared` 為相對相依（Sprint 4 處理，見 apps/functions/src/index.ts 內 Sprint 4 NOTE）

## Alternatives Considered

| 方案 | 為什麼不採 |
|---|---|
| 兩個獨立 repo + npm publish `shared` | publish 流程太重、版本管理成本高、solo dev 不值得 |
| Yarn workspaces / npm workspaces | pnpm 的 strict 預設 + 較小的 node_modules 適合 solo dev 維護 |
| Turborepo / Nx | 暫不需要 task graph 快取；增加學習曲線無對應收益 |

## References

- planning doc §12.1 — Repo 結構
- planning doc §12.2 — 模組劃分
