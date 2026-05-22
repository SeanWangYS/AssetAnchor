// Sprint 0 placeholder. Expo app entry will be initialized in Sprint 1.
//
// ⚠️ Sprint 1 NOTE: `npx create-expo-app` will overwrite this file plus
// package.json / tsconfig.json. Do NOT accept Expo's overwrites blindly —
// preserve: `@assetanchor/shared: workspace:*` dep, monorepo scripts,
// `extends: ../../tsconfig.base.json`. Scaffold Expo in a temp dir and
// hand-merge the relevant pieces into apps/mobile/.
import { Money } from '@assetanchor/shared';

export function sanityCheck(): string {
  return Money.zero('TWD').toDisplayString();
}
