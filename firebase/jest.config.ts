import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  // Rules tests import shared source (ESM-style `.js` specifiers) to build real payloads.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
};

export default config;
