// Sprint 0 placeholder. Expo app entry will be initialized in Sprint 1.
import { Money } from '@assetanchor/shared';

export function sanityCheck(): string {
  return Money.zero('TWD').toDisplayString();
}
