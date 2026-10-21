/**
 * Single source for deploy-time runtime options (functions-runtime-limits).
 *
 * Every function caps its scaling so a burst or abusive caller cannot fan out to the
 * 2nd-gen default of 100 instances. Each instance serves up to 80 concurrent requests,
 * so 3 instances leave ample headroom for a personal app (prod peak: 2–4 incl. idle).
 * minInstances stays unset (0) to avoid idle charges. Enforced by runtimeOptions.test.ts.
 */
export const REGION = 'asia-east1';

/** User-facing HTTP endpoints called by the mobile app. */
export const USER_HTTP_OPTIONS = { region: REGION, cors: true, maxInstances: 3 } as const;

/** Low-volume background work: scheduler, Firestore trigger, manual seed endpoint. */
export const BACKGROUND_OPTIONS = { region: REGION, maxInstances: 1 } as const;
