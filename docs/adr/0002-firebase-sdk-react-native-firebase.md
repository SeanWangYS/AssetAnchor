# ADR-002: Firebase SDK — React Native Firebase over Firebase JS SDK

- **Status**: Accepted
- **Date**: 2026-05-30（Sprint 1 補記；決策原訂於規劃期 §2 核心決策表）
- **Deciders**: Sean Wang

## Context

AssetAnchor mobile 需要 Firebase Auth + Firestore。React Native + Expo 上整合 Firebase 有兩條路：

- **Firebase JS SDK**（`firebase` npm）：純 JavaScript，可在 Expo Go 直接跑。
- **React Native Firebase**（`@react-native-firebase/*`）：包原生 iOS/Android Firebase SDK 的 native module。

取捨核心是「**開發簡單度**」vs「**原生品質 / 未來性**」。關鍵前提：專案已決定走 **Expo Dev Build + EAS**（§2），代表 dev build 的成本本來就要付。

## Decision

採 **`@react-native-firebase`（native module）**。Google 登入走原生 `@react-native-google-signin`，**不再用** `expo-auth-session` 的 web flow。

## Consequences

- ✅ 原生 auth 持久化（keychain）、Firestore 原生離線持久化，開箱即用。
- ✅ 原生 Google 登入體驗；未來可接 FCM push / Crashlytics / Analytics。
- ✅ 與「已採 EAS Dev Build」一致 —— RNFB 的主要成本（需 dev build）本來就要付，邊際成本近乎零。
- ⚠️ 不能用 Expo Go（native module）→ 需 custom dev build。首次 build 較久、換 native 套件要重編 dev client；**日常 JS 開發仍是 Fast Refresh，DX 不受影響**（見 tech note）。
- ⚠️ 較多 native config（config plugin、`GoogleService-Info.plist`）→ Sprint 1 最大風險點（go/no-go gate）。
- ⚠️ API 與 JS SDK 不同 → 舊專案（用 JS SDK）程式碼不可直接複用（§14.3）。

## Alternatives Considered

| 方案 | 為什麼不採 |
|---|---|
| **Firebase JS SDK（純 JS）** | 新手更簡單、可跑 Expo Go；但 RN 上 auth 持久化需 workaround、離線受限、Google 登入走 web flow 體驗較差、難接原生能力。**保留為 Plan B**：若 Sprint 1 go/no-go（RNFB native 整合）卡 >1 週，暫退此方案並重訪選型（見 §13.3、Sprint 1 spec）。 |
| Supabase / 自建後端 | 偏離 §2 已拍板的 Firebase 後端；solo dev 不重起爐灶。 |

## References

- planning doc §2（核心決策表）、§13.3（go/no-go + Plan B 里程碑）、§14.3（舊資產不複用）
- Sprint 1 auth 規格：`openspec/specs/auth/spec.md`（原 `docs/superpowers/specs/2026-05-30-sprint-1-auth-design.md` 已隨 align-to-design-package 移除）
- dev build DX / Expo Go 限制：`docs/tech_note/expo-pnpm-monorepo-integration.md`
