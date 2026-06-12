import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  // ADR-0007 §3：只 gate mobile 端「純邏輯」檔（mapper / calculator / derivation /
  // 純 reducer / 錯誤映射），排除 screens / components / store / service 的 I/O。
  // 交易純 builder 與成本計算屬 packages/shared（由其 ≥90% 全域 gate 涵蓋）。
  collectCoverageFrom: ['src/**/*Ordering.ts', 'src/**/authErrors.ts'],
  coverageThreshold: {
    global: { branches: 90, functions: 90, lines: 90, statements: 90 },
  },
};

export default config;
