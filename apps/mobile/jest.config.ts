import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  // packages/shared 以 source 形式被消費（ESM、import 帶 .js 副檔名）；測試時把
  // 相對 `.js` specifier 映回無副檔名，讓 jest 解析到 .ts（對齊 shared 自身 jest 設定）。
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // ADR-0007 §3：只 gate mobile 端「純邏輯」檔（mapper / calculator / derivation /
  // 純 reducer / 錯誤映射），排除 screens / components / store / service 的 I/O。
  // 交易純 builder 與成本計算屬 packages/shared（由其 ≥90% 全域 gate 涵蓋）。
  collectCoverageFrom: [
    'src/**/*Ordering.ts',
    'src/**/authErrors.ts',
    'src/**/holdingsHero.ts',
    'src/**/quotesBatch.ts',
  ],
  coverageThreshold: {
    global: { branches: 90, functions: 90, lines: 90, statements: 90 },
  },
};

export default config;
