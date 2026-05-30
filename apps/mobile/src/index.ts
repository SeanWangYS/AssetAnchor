// Sprint 0 placeholder. Expo app entry will be initialized in Sprint 1.
//
// ⚠️ Sprint 1 NOTE: this placeholder is replaced by a real Expo app via the
// official monorepo flow (Expo SDK 52+ auto-configures Metro — NO manual
// metro.config.js needed; the old "temp dir + hand-merge" dance is obsolete):
//   1. clear this placeholder, then run:
//      pnpm create expo-app --template default@sdk-54 apps/mobile
//      (confirm the exact SDK version at init time)
//   2. add `node-linker=hoisted` to .npmrc (pnpm 9; pnpm 10+ uses
//      pnpm-workspace.yaml `nodeLinker: hoisted`) — pnpm × Metro symlink fix
//   3. re-add the two wires the generator drops:
//      `@assetanchor/shared: workspace:*` dep + tsconfig `extends ../../tsconfig.base.json`
// Rationale & full walkthrough: docs/tech_note/expo-pnpm-monorepo-integration.md
import { Money } from '@assetanchor/shared';

export function sanityCheck(): string {
  return Money.zero('TWD').toDisplayString();
}
