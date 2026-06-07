// Sprint 1 wiring sanity: proves `@assetanchor/shared` resolves from the mobile
// app via the pnpm `workspace:*` link + `node-linker=hoisted`. App screens land
// under `src/` in later Sprint 1 tasks; for now this keeps the `src/**` lint glob
// satisfied and gives a type-checked import of the shared Money model.
import { Money } from '@assetanchor/shared';

export function sanityCheck(): string {
  return Money.zero('TWD').toDisplayString();
}
