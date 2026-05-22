// Sprint 0 placeholder. Real Cloud Functions wiring starts in Sprint 4.
//
// ⚠️ Sprint 4 NOTE: this workspace currently typechecks against @assetanchor/shared
// because TS resolves the workspace symlink. At RUNTIME, however, Node will try to
// require '.../packages/shared/src/index.ts' and fail (Node can't execute .ts).
// Before functions imports anything from @assetanchor/shared at runtime, decide:
//   (a) add a `tsup`/`tsc` build step on shared emitting dist/ + conditional exports
//       ("import": "./dist/index.js", "types": "./dist/index.d.ts"), OR
//   (b) bundle shared into functions output via esbuild/rollup at deploy time.
// Option (a) is cleaner for shared types/Money; option (b) reduces deploy size.
import { Money } from '@assetanchor/shared';

export function sanityCheck(): string {
  return Money.zero('USD').toDisplayString();
}
