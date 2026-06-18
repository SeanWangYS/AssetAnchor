import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  // packages/shared 以 source 形式被消費（ESM、import 帶 .js 副檔名）；測試引用其 value
  // （MARKETS/CURRENCIES…）時把相對 `.js` specifier 映回無副檔名，讓 ts-jest 解析到 .ts
  // （對齊 shared / mobile 的 jest 設定）。
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};

export default config;
