import type { Config } from 'jest';
import base from './jest.config';

/**
 * Integration tests against the Firebase emulators (Firestore, Auth, Functions, Hosting).
 * Run via `pnpm --filter @assetanchor/functions test:integration`, which starts the emulators.
 */
const config: Config = {
  ...base,
  testMatch: ['<rootDir>/src/**/*.integration.ts'],
  testTimeout: 30000,
};

export default config;
