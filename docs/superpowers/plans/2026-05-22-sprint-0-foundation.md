# Sprint 0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 AssetAnchor monorepo 骨架、`packages/shared` 的型別/列舉/Money class（>90% 測試覆蓋）、程式碼品質工具鏈、CI、Firebase rules/indexes 部署，並寫下 ADR-000/001。完成後 `pnpm install` 通過、CI 綠燈、Money class 全綠。

**Architecture:** pnpm workspaces monorepo，三個 workspace：`apps/mobile`（Sprint 1 填內容）、`apps/functions`（Sprint 4 填內容）、`packages/shared`（Sprint 0 核心）。`packages/shared` 提供跨 mobile/functions 共用的 Firestore 文件型別、enum、Money wrapper class（包 decimal.js）。Husky + commitlint 強制 Conventional Commits；GitHub Actions PR 觸發 lint + typecheck + test。Firebase 沿用既有專案 `assetanchor-832df`，僅清空 Firestore + 部署本檔指定的 rules/indexes。

**Tech Stack:**
- Node v22.15.0 + pnpm 9（透過 corepack）
- TypeScript 5.5 strict + noUncheckedIndexedAccess
- `decimal.js` 10.x（Money class 底層）
- Jest 29 + ts-jest（測試）
- ESLint 9 flat config + `typescript-eslint` strict + Prettier 3
- Husky 9 + lint-staged 15 + commitlint 19（Conventional Commits）
- Firebase CLI 14.x（rules/indexes 部署）
- GitHub Actions（lint / typecheck / test 三個 job）

---

## File Structure

完成 Sprint 0 後的目錄如下（依本檔分 14 個 Task 建立 / 修改）：

```
AssetAnchor/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml          # Task 12
│   │   └── feature_request.yml     # Task 12
│   ├── PULL_REQUEST_TEMPLATE.md    # Task 12
│   └── workflows/
│       └── ci.yml                  # Task 11
├── .husky/
│   ├── pre-commit                  # Task 3
│   └── commit-msg                  # Task 3
├── apps/
│   ├── mobile/
│   │   ├── package.json            # Task 8
│   │   ├── tsconfig.json           # Task 8
│   │   └── src/index.ts            # Task 8（placeholder）
│   └── functions/
│       ├── package.json            # Task 9
│       ├── tsconfig.json           # Task 9
│       └── src/index.ts            # Task 9（placeholder）
├── packages/
│   └── shared/
│       ├── package.json            # Task 4
│       ├── tsconfig.json           # Task 4
│       ├── jest.config.ts          # Task 4
│       └── src/
│           ├── index.ts            # Task 4（barrel export）
│           ├── enums/
│           │   ├── brokers.ts              # Task 5
│           │   ├── account-types.ts        # Task 5
│           │   ├── asset-types.ts          # Task 5
│           │   ├── transaction-types.ts    # Task 5
│           │   ├── currencies.ts           # Task 5
│           │   ├── enums.test.ts           # Task 5
│           │   └── index.ts                # Task 5
│           ├── types/
│           │   ├── user.ts                 # Task 6
│           │   ├── account.ts              # Task 6
│           │   ├── transaction.ts          # Task 6
│           │   ├── symbol.ts               # Task 6
│           │   ├── exchange-rate.ts        # Task 6
│           │   ├── quote.ts                # Task 6
│           │   └── index.ts                # Task 6
│           └── money/
│               ├── money.ts                # Task 7
│               ├── money.test.ts           # Task 7
│               ├── errors.ts               # Task 7
│               └── index.ts                # Task 7
├── firebase/
│   ├── firebase.json               # Task 10
│   ├── firestore.rules             # Task 10
│   ├── firestore.indexes.json      # Task 10
│   └── .firebaserc                 # Task 10
├── docs/
│   ├── portfolio_tracker_planning.md   # Task 1（從 repo 根目錄搬入）
│   ├── adr/
│   │   ├── 0000-planning-doc.md    # Task 13
│   │   └── 0001-monorepo-with-pnpm.md  # Task 13
│   └── superpowers/
│       └── plans/
│           └── 2026-05-22-sprint-0-foundation.md  # 本檔
├── .commitlintrc.cjs               # Task 2
├── .editorconfig                   # Task 1
├── .gitignore                      # Task 1
├── .prettierrc.json                # Task 2
├── .prettierignore                 # Task 2
├── LICENSE                         # Task 1（MIT）
├── README.md                       # Task 1
├── eslint.config.mjs               # Task 2
├── package.json                    # Task 1（workspace root）
├── pnpm-workspace.yaml             # Task 1
└── tsconfig.base.json              # Task 2
```

**檔案職責劃分**：
- `packages/shared` 內：enums 與 types 分檔，一個 enum 一檔（diff review 容易），types 一個 collection 一檔。
- Money class 拆 `money.ts` + `errors.ts` + `index.ts` barrel；test 與 implementation 同目錄共存（Jest 自動偵測）。
- Firebase config 集中在 `firebase/` 目錄，與 functions code（`apps/functions/`）解耦，因為 rules/indexes 與 functions 是不同 deploy unit。

---

## Pre-flight：執行前置條件

開始 Task 1 前確認以下指令可用：

```bash
node --version          # 預期 v22.x
git --version           # 預期 2.x
firebase --version      # 預期 14.x（後面 Task 10 用）
corepack --version      # 預期 0.x（Node 22 內建）
```

若 `corepack` 未啟用，跑：
```bash
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm --version          # 預期 9.12.x
```

---

## Task 1：Git init + 基底檔案（.gitignore / README / LICENSE / workspace 宣告）

**Files:**
- Create: `/Users/sean.wang/Documents/Sean/project/AssetAnchor/.gitignore`
- Create: `/Users/sean.wang/Documents/Sean/project/AssetAnchor/.editorconfig`
- Create: `/Users/sean.wang/Documents/Sean/project/AssetAnchor/LICENSE`
- Create: `/Users/sean.wang/Documents/Sean/project/AssetAnchor/README.md`
- Create: `/Users/sean.wang/Documents/Sean/project/AssetAnchor/pnpm-workspace.yaml`
- Create: `/Users/sean.wang/Documents/Sean/project/AssetAnchor/package.json`
- Move: `portfolio_tracker_planning.md` → `docs/portfolio_tracker_planning.md`

- [ ] **Step 1：`git init` 並設定 main 為 default branch**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
git init -b main
git status
```
Expected: `On branch main`, untracked: `design_inspiration/`, `portfolio_tracker_planning.md`, `docs/superpowers/...`, `.claude/`

- [ ] **Step 2：寫 `.gitignore`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/.gitignore`：
```
# Node
node_modules/
.pnpm-store/
*.log
npm-debug.log*
pnpm-debug.log*

# TypeScript build output
dist/
build/
*.tsbuildinfo

# Test coverage
coverage/

# Env
.env
.env.*
!.env.example

# OS
.DS_Store
Thumbs.db

# Editor
.idea/
.vscode/
!.vscode/extensions.json
!.vscode/settings.json.example

# Expo / RN (預留 Sprint 1)
.expo/
.expo-shared/
ios/Pods/
android/.gradle/
android/app/build/
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# Firebase
.firebase/
firebase-debug.log
firestore-debug.log
ui-debug.log

# Claude
.claude/
```

- [ ] **Step 3：寫 `.editorconfig`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/.editorconfig`：
```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 4：寫 `LICENSE`（MIT）**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/LICENSE`：
```
MIT License

Copyright (c) 2026 Sean Wang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 5：寫 `README.md`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/README.md`：
````markdown
# AssetAnchor

個人投資組合追蹤 App — 整合跨券商（Firstrade、Interactive Brokers、moomoo、群益等）的台股 + 美股部位。

> **狀態**：Sprint 0 Foundation 進行中（2026-05-22 起）。MVP 規劃見 [`docs/portfolio_tracker_planning.md`](docs/portfolio_tracker_planning.md)。

## 技術棧

- **App**：React Native + Expo（iOS + Android）
- **後端**：Firebase（Firestore + Auth + Cloud Functions）
- **共用**：pnpm workspaces monorepo + TypeScript strict + decimal.js
- **品質**：ESLint + Prettier + Husky + commitlint + Jest + GitHub Actions

## Repo 結構

```
apps/mobile        # Expo React Native app
apps/functions     # Firebase Cloud Functions
packages/shared    # 跨 app 共用型別 / enum / Money class
firebase/          # firestore.rules / indexes
docs/              # 規劃文件、ADR
```

## 開發

```bash
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm install
pnpm -r typecheck
pnpm -r test
pnpm -r lint
```

## License

MIT — 見 [`LICENSE`](LICENSE)。
````

- [ ] **Step 6：寫 `pnpm-workspace.yaml`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/pnpm-workspace.yaml`：
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 7：寫 root `package.json`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/package.json`：
```json
{
  "name": "assetanchor",
  "version": "0.0.1",
  "private": true,
  "description": "Personal portfolio tracker — Sprint 0 foundation",
  "license": "MIT",
  "packageManager": "pnpm@9.12.0",
  "engines": {
    "node": ">=22.0.0"
  },
  "scripts": {
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "prepare": "husky"
  },
  "devDependencies": {
    "@commitlint/cli": "^19.5.0",
    "@commitlint/config-conventional": "^19.5.0",
    "@typescript-eslint/eslint-plugin": "^8.13.0",
    "@typescript-eslint/parser": "^8.13.0",
    "eslint": "^9.14.0",
    "husky": "^9.1.6",
    "lint-staged": "^15.2.10",
    "prettier": "^3.3.3",
    "typescript": "^5.5.4",
    "typescript-eslint": "^8.13.0"
  },
  "lint-staged": {
    "*.{ts,tsx,js,mjs,cjs}": [
      "prettier --write",
      "eslint --fix"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

- [ ] **Step 8：把 planning doc 搬進 `docs/`**

```bash
mv /Users/sean.wang/Documents/Sean/project/AssetAnchor/portfolio_tracker_planning.md \
   /Users/sean.wang/Documents/Sean/project/AssetAnchor/docs/portfolio_tracker_planning.md
```

- [ ] **Step 9：第一次 commit**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
git add .gitignore .editorconfig LICENSE README.md pnpm-workspace.yaml package.json docs/portfolio_tracker_planning.md docs/superpowers/
git commit -m "chore(infra): initialize pnpm monorepo skeleton + base files"
```

> ⚠️ 此時 husky hook 還沒裝，所以 commit 不會被攔截。後續 Task 3 裝完才有 commitlint 檢查。

---

## Task 2：TypeScript / ESLint / Prettier / commitlint 設定

**Files:**
- Create: `tsconfig.base.json`
- Create: `eslint.config.mjs`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `.commitlintrc.cjs`

- [ ] **Step 1：寫 `tsconfig.base.json`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/tsconfig.base.json`：
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": false,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": false
  }
}
```

- [ ] **Step 2：寫 `eslint.config.mjs`（ESLint 9 flat config）**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/eslint.config.mjs`：
```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.expo/**',
      'apps/mobile/ios/**',
      'apps/mobile/android/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
```

> `@eslint/js` 由 `eslint` 自帶，不需另裝；`typescript-eslint` 同時提供 parser + plugin + flat config helper。

- [ ] **Step 3：寫 `.prettierrc.json`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/.prettierrc.json`：
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

- [ ] **Step 4：寫 `.prettierignore`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/.prettierignore`：
```
node_modules
dist
build
coverage
.expo
apps/mobile/ios
apps/mobile/android
pnpm-lock.yaml
```

- [ ] **Step 5：寫 `.commitlintrc.cjs`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/.commitlintrc.cjs`：
```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'chore',
        'docs',
        'refactor',
        'test',
        'style',
        'perf',
        'ci',
        'build',
      ],
    ],
    'scope-enum': [
      2,
      'always',
      ['mobile', 'functions', 'shared', 'infra', 'docs', 'firebase'],
    ],
    'scope-empty': [2, 'never'],
    'subject-case': [0],
  },
};
```

> `scope-empty: never` 代表每個 commit message 必須有 scope（例如 `feat(shared): ...`）。

- [ ] **Step 6：跑一次 `pnpm install` 安裝 root devDependencies**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
pnpm install
```
Expected: 成功裝完 root devDependencies。若 `pnpm install` 觸發 `prepare` 失敗（husky 找不到 `.husky/`），先建空目錄：

```bash
mkdir -p .husky
pnpm install
```

- [ ] **Step 7：驗證 ESLint + Prettier 設定能載入**

```bash
pnpm exec eslint --print-config eslint.config.mjs > /dev/null && echo "eslint config OK"
pnpm exec prettier --check .prettierrc.json && echo "prettier config OK"
```
Expected: 兩條都印 `OK`。

- [ ] **Step 8：Commit**

```bash
git add tsconfig.base.json eslint.config.mjs .prettierrc.json .prettierignore .commitlintrc.cjs pnpm-lock.yaml package.json
git commit -m "chore(infra): add typescript / eslint / prettier / commitlint configs"
```

---

## Task 3：Husky + lint-staged + commitlint hooks

**Files:**
- Create: `.husky/pre-commit`
- Create: `.husky/commit-msg`

- [ ] **Step 1：初始化 husky**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
pnpm exec husky init
```
Expected: 建立 `.husky/pre-commit`（預設內容 `npm test`）+ 設定 `package.json` 的 `prepare` script。若 `prepare` 已在 Task 1 設好，這步只會建 `.husky/pre-commit`。

- [ ] **Step 2：覆寫 `.husky/pre-commit` 改跑 lint-staged**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/.husky/pre-commit`：
```sh
pnpm exec lint-staged
```

- [ ] **Step 3：建立 `.husky/commit-msg`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/.husky/commit-msg`：
```sh
pnpm exec commitlint --edit "$1"
```

- [ ] **Step 4：賦予 hook 執行權限**

```bash
chmod +x .husky/pre-commit .husky/commit-msg
```

- [ ] **Step 5：驗證 commitlint 會擋掉壞 commit message**

跑一個假驗證（不會真的 commit）：
```bash
echo "bad message" | pnpm exec commitlint
```
Expected: 出現 `subject may not be empty` / `type may not be empty` 等錯誤，exit code 非 0。

接著驗證一個好的：
```bash
echo "feat(infra): test message" | pnpm exec commitlint
```
Expected: 無輸出、exit code 0。

- [ ] **Step 6：Commit**

```bash
git add .husky/ package.json
git commit -m "chore(infra): add husky pre-commit and commit-msg hooks"
```
Expected: commit 成功；commit-msg hook 應該驗證通過（type=chore, scope=infra）。

---

## Task 4：`packages/shared` workspace 骨架

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/jest.config.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1：寫 `packages/shared/package.json`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/package.json`：
```json
{
  "name": "@assetanchor/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint 'src/**/*.ts'",
    "test": "jest",
    "test:coverage": "jest --coverage"
  },
  "dependencies": {
    "decimal.js": "^10.4.3"
  },
  "devDependencies": {
    "@types/jest": "^29.5.13",
    "@types/node": "^22.7.5",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "typescript": "^5.5.4"
  }
}
```

> `main`/`types` 直接指向 `.ts` source — Sprint 0 不做 build step；mobile/functions 透過 ts-jest / tsc 直接吃 source。等將來真有 publish 需求再加 `tsup` build。

- [ ] **Step 2：寫 `packages/shared/tsconfig.json`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/tsconfig.json`：
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["jest", "node"]
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3：寫 `packages/shared/jest.config.ts`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/jest.config.ts`：
```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { useESM: true, tsconfig: '<rootDir>/tsconfig.json' },
    ],
  },
};

export default config;
```

- [ ] **Step 4：寫空的 `src/index.ts`（之後 Task 5–7 補 export）**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/index.ts`：
```typescript
// barrel export — populated by tasks 5–7
export {};
```

- [ ] **Step 5：跑 pnpm install 連通 workspace**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
pnpm install
```
Expected: 印出 `packages/shared` 已連通，安裝 decimal.js / jest / ts-jest 等。

- [ ] **Step 6：驗證 typecheck + jest 啟得起來**

```bash
pnpm --filter @assetanchor/shared typecheck
pnpm --filter @assetanchor/shared test --passWithNoTests
```
Expected: typecheck 0 errors；jest 印 `No tests found` 但 exit code 0（因為加了 `--passWithNoTests`）。

- [ ] **Step 7：Commit**

```bash
git add packages/shared/ pnpm-lock.yaml
git commit -m "feat(shared): scaffold packages/shared workspace with jest + ts-jest"
```

---

## Task 5：Enums（BROKERS / ACCOUNT_TYPES / ASSET_TYPES / TRANSACTION_TYPES / CURRENCIES）

**Files:**
- Create: `packages/shared/src/enums/brokers.ts`
- Create: `packages/shared/src/enums/account-types.ts`
- Create: `packages/shared/src/enums/asset-types.ts`
- Create: `packages/shared/src/enums/transaction-types.ts`
- Create: `packages/shared/src/enums/currencies.ts`
- Create: `packages/shared/src/enums/enums.test.ts`
- Create: `packages/shared/src/enums/index.ts`
- Modify: `packages/shared/src/index.ts`

> 對應 planning doc §6 的 broker / account_type / transaction_type / asset_type enum。Currency 在 schema 中沒有單獨 enum，但 Money class 要用、所以 Sprint 0 一起定。

- [ ] **Step 1：寫失敗測試（先把所有 enum 的「值是否完整、是否唯讀」測掉）**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/enums/enums.test.ts`：
```typescript
import { BROKERS, type Broker } from './brokers.js';
import { ACCOUNT_TYPES, type AccountType } from './account-types.js';
import { ASSET_TYPES, type AssetType } from './asset-types.js';
import { TRANSACTION_TYPES, type TransactionType } from './transaction-types.js';
import { CURRENCIES, type Currency } from './currencies.js';

describe('BROKERS enum', () => {
  it('contains all US brokers from planning doc §6', () => {
    expect(BROKERS).toEqual(
      expect.arrayContaining([
        'FIRSTRADE',
        'INTERACTIVE_BROKERS',
        'MOOMOO',
        'SCHWAB',
        'FIDELITY',
        'ROBINHOOD',
        'TD_AMERITRADE',
      ]),
    );
  });

  it('contains all TW brokers from planning doc §6', () => {
    expect(BROKERS).toEqual(
      expect.arrayContaining([
        'CAPITAL_SECURITIES',
        'SINOPAC',
        'FUBON',
        'YUANTA',
        'CATHAY',
        'CTBC',
        'MASTERLINK',
        'KGI',
        'MEGA',
      ]),
    );
  });

  it('contains crypto exchanges and OTHER', () => {
    expect(BROKERS).toEqual(
      expect.arrayContaining([
        'BINANCE',
        'COINBASE',
        'KRAKEN',
        'MAX',
        'BITOPRO',
        'OTHER',
      ]),
    );
  });

  it('is a readonly tuple (frozen)', () => {
    expect(Object.isFrozen(BROKERS)).toBe(true);
  });

  it('Broker type accepts known values', () => {
    const b: Broker = 'FIRSTRADE';
    expect(BROKERS.includes(b)).toBe(true);
  });
});

describe('ACCOUNT_TYPES enum', () => {
  it('matches planning doc §6 list', () => {
    expect(ACCOUNT_TYPES).toEqual([
      'BROKERAGE',
      'IRA',
      'MARGIN',
      'CASH',
      'CRYPTO_EXCHANGE',
      'CRYPTO_WALLET',
      'OTHER',
    ]);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(ACCOUNT_TYPES)).toBe(true);
  });

  it('AccountType type works', () => {
    const t: AccountType = 'BROKERAGE';
    expect(ACCOUNT_TYPES.includes(t)).toBe(true);
  });
});

describe('ASSET_TYPES enum', () => {
  it('matches planning doc §6 list', () => {
    expect(ASSET_TYPES).toEqual([
      'STOCK',
      'ETF',
      'CRYPTO',
      'BOND',
      'MUTUAL_FUND',
      'OTHER',
    ]);
  });

  it('AssetType type works', () => {
    const t: AssetType = 'STOCK';
    expect(ASSET_TYPES.includes(t)).toBe(true);
  });
});

describe('TRANSACTION_TYPES enum', () => {
  it('contains MVP types', () => {
    expect(TRANSACTION_TYPES).toEqual(expect.arrayContaining(['BUY', 'SELL']));
  });

  it('contains corporate-action types (phase 2/3)', () => {
    expect(TRANSACTION_TYPES).toEqual(
      expect.arrayContaining([
        'DIVIDEND_CASH',
        'DIVIDEND_STOCK',
        'SPLIT',
        'REVERSE_SPLIT',
        'SPINOFF',
        'MERGER',
      ]),
    );
  });

  it('contains crypto types (future)', () => {
    expect(TRANSACTION_TYPES).toEqual(
      expect.arrayContaining([
        'STAKING_REWARD',
        'AIRDROP',
        'TRANSFER_IN',
        'TRANSFER_OUT',
      ]),
    );
  });

  it('TransactionType type works', () => {
    const t: TransactionType = 'BUY';
    expect(TRANSACTION_TYPES.includes(t)).toBe(true);
  });
});

describe('CURRENCIES enum', () => {
  it('contains MVP currencies', () => {
    expect(CURRENCIES).toEqual(expect.arrayContaining(['TWD', 'USD']));
  });

  it('reserves slots for phase 2 currencies', () => {
    expect(CURRENCIES).toEqual(expect.arrayContaining(['JPY', 'EUR', 'HKD', 'CNY']));
  });

  it('Currency type works', () => {
    const c: Currency = 'TWD';
    expect(CURRENCIES.includes(c)).toBe(true);
  });
});
```

- [ ] **Step 2：跑測試確認失敗**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
pnpm --filter @assetanchor/shared test
```
Expected: 五個 enum 檔不存在，jest 報 `Cannot find module './brokers.js'` 等錯誤。

- [ ] **Step 3：實作 `brokers.ts`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/enums/brokers.ts`：
```typescript
export const BROKERS = Object.freeze([
  // 美股 / 國際
  'FIRSTRADE',
  'INTERACTIVE_BROKERS',
  'MOOMOO',
  'SCHWAB',
  'FIDELITY',
  'ROBINHOOD',
  'TD_AMERITRADE',
  // 台股
  'CAPITAL_SECURITIES',
  'SINOPAC',
  'FUBON',
  'YUANTA',
  'CATHAY',
  'CTBC',
  'MASTERLINK',
  'KGI',
  'MEGA',
  // 加密貨幣
  'BINANCE',
  'COINBASE',
  'KRAKEN',
  'MAX',
  'BITOPRO',
  'OTHER',
] as const);

export type Broker = (typeof BROKERS)[number];
```

- [ ] **Step 4：實作 `account-types.ts`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/enums/account-types.ts`：
```typescript
export const ACCOUNT_TYPES = Object.freeze([
  'BROKERAGE',
  'IRA',
  'MARGIN',
  'CASH',
  'CRYPTO_EXCHANGE',
  'CRYPTO_WALLET',
  'OTHER',
] as const);

export type AccountType = (typeof ACCOUNT_TYPES)[number];
```

- [ ] **Step 5：實作 `asset-types.ts`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/enums/asset-types.ts`：
```typescript
export const ASSET_TYPES = Object.freeze([
  'STOCK',
  'ETF',
  'CRYPTO',
  'BOND',
  'MUTUAL_FUND',
  'OTHER',
] as const);

export type AssetType = (typeof ASSET_TYPES)[number];
```

- [ ] **Step 6：實作 `transaction-types.ts`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/enums/transaction-types.ts`：
```typescript
export const TRANSACTION_TYPES = Object.freeze([
  // MVP
  'BUY',
  'SELL',
  // Phase 2
  'DIVIDEND_CASH',
  'DIVIDEND_STOCK',
  'SPLIT',
  'REVERSE_SPLIT',
  // Phase 3
  'SPINOFF',
  'MERGER',
  // Crypto (future)
  'STAKING_REWARD',
  'AIRDROP',
  'TRANSFER_IN',
  'TRANSFER_OUT',
] as const);

export type TransactionType = (typeof TRANSACTION_TYPES)[number];
```

- [ ] **Step 7：實作 `currencies.ts`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/enums/currencies.ts`：
```typescript
export const CURRENCIES = Object.freeze([
  // MVP
  'TWD',
  'USD',
  // Phase 2 reserved
  'JPY',
  'EUR',
  'HKD',
  'CNY',
] as const);

export type Currency = (typeof CURRENCIES)[number];
```

- [ ] **Step 8：寫 `enums/index.ts` barrel**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/enums/index.ts`：
```typescript
export * from './brokers.js';
export * from './account-types.js';
export * from './asset-types.js';
export * from './transaction-types.js';
export * from './currencies.js';
```

- [ ] **Step 9：在 `src/index.ts` re-export enums**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/index.ts`：
```typescript
export * from './enums/index.js';
```

- [ ] **Step 10：跑測試確認綠燈**

```bash
pnpm --filter @assetanchor/shared test
pnpm --filter @assetanchor/shared typecheck
```
Expected: 全部測試通過、typecheck 無錯。

- [ ] **Step 11：Commit**

```bash
git add packages/shared/src/enums/ packages/shared/src/index.ts
git commit -m "feat(shared): add broker / account / asset / transaction / currency enums"
```

---

## Task 6：Firestore 文件型別（User / Account / Transaction / Symbol / ExchangeRate / Quote）

**Files:**
- Create: `packages/shared/src/types/user.ts`
- Create: `packages/shared/src/types/account.ts`
- Create: `packages/shared/src/types/transaction.ts`
- Create: `packages/shared/src/types/symbol.ts`
- Create: `packages/shared/src/types/exchange-rate.ts`
- Create: `packages/shared/src/types/quote.ts`
- Create: `packages/shared/src/types/index.ts`
- Modify: `packages/shared/src/index.ts`

> 純型別檔不寫 runtime test（沒有行為可測），只靠 `tsc --noEmit` + Sprint 3 引入 zod 時補 schema 驗證。

- [ ] **Step 1：`user.ts`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/types/user.ts`：
```typescript
import type { Currency } from '../enums/currencies.js';

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  default_account_id: string | null;
}

export interface UserDocument {
  uid: string;
  email: string;
  display_name: string;
  preferred_display_currency: Currency;
  preferred_locale: string;
  created_at: FirestoreTimestamp;
  updated_at: FirestoreTimestamp;
  settings: UserSettings;
}

/**
 * Firestore Timestamp 在 mobile (@react-native-firebase) 與 functions (firebase-admin)
 * 兩端型別不同；shared 層用 structural type 抽象，由各端在 boundary 做型別 narrow。
 */
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}
```

- [ ] **Step 2：`account.ts`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/types/account.ts`：
```typescript
import type { Broker } from '../enums/brokers.js';
import type { AccountType } from '../enums/account-types.js';
import type { Currency } from '../enums/currencies.js';
import type { FirestoreTimestamp } from './user.js';

/**
 * cash_balances 用 Currency → string map。string 為 decimal.js 序列化值，
 * 小數第 10 位精度（見 planning doc §6）。
 */
export type CashBalances = Partial<Record<Currency, string>>;

export interface AccountDocument {
  account_id: string;
  account_name: string;
  broker: Broker;
  account_type: AccountType;
  base_currency: Currency;
  market: 'TW' | 'US' | 'CRYPTO' | 'OTHER';
  cash_balances: CashBalances;
  cash_balances_updated_at: FirestoreTimestamp;
  is_active: boolean;
  display_order: number;
  color: string;
  notes: string;
  created_at: FirestoreTimestamp;
  updated_at: FirestoreTimestamp;
}
```

- [ ] **Step 3：`transaction.ts`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/types/transaction.ts`：
```typescript
import type { AssetType } from '../enums/asset-types.js';
import type { TransactionType } from '../enums/transaction-types.js';
import type { Currency } from '../enums/currencies.js';
import type { FirestoreTimestamp } from './user.js';

export type RateSource = 'BOT' | 'EXCHANGERATE_HOST' | 'YAHOO' | null;
export type RateType = 'spot_sell' | 'spot_buy' | 'cash_sell' | 'cash_buy' | null;

export interface TransactionAmount {
  is_original: boolean;
  price: string;
  total: string;
  fee: string;
  tax: string;
  rate: string;
  rate_source: RateSource;
  rate_type: RateType;
  rate_date: string | null;
}

export type AmountsMap = Partial<Record<Currency, TransactionAmount>>;

export interface TransactionDocument {
  transaction_id: string;
  account_id: string;
  asset_type: AssetType;
  symbol: string;
  market: 'TW' | 'US' | 'CRYPTO' | 'OTHER';
  transaction_type: TransactionType;
  transaction_date: string;
  ex_date: string | null;
  quantity: string;
  original_currency: Currency;
  amounts: AmountsMap;
  amounts_status: 'PENDING' | 'COMPLETE';
  related_transaction_id: string | null;
  lot_id: string | null;
  notes: string;
  created_at: FirestoreTimestamp;
  updated_at: FirestoreTimestamp;
}
```

- [ ] **Step 4：`symbol.ts`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/types/symbol.ts`：
```typescript
import type { AssetType } from '../enums/asset-types.js';
import type { Currency } from '../enums/currencies.js';
import type { FirestoreTimestamp } from './user.js';

export interface SymbolDocument {
  symbol_id: string;
  symbol: string;
  market: 'TW' | 'US' | 'CRYPTO' | 'OTHER';
  asset_type: AssetType;
  name: string;
  name_zh: string;
  currency: Currency;
  is_active: boolean;
  exchange: string;
  industry: string;
  sector: string;
  created_at: FirestoreTimestamp;
  updated_at: FirestoreTimestamp;
}
```

- [ ] **Step 5：`exchange-rate.ts`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/types/exchange-rate.ts`：
```typescript
import type { FirestoreTimestamp } from './user.js';

/**
 * Key 格式：{FROM}_{TO} 例如 "TWD_USD"。
 * 同 doc 可預存買賣 variant，例如 TWD_USD_buy / TWD_USD_cash_sell。
 */
export type RateMap = Record<string, string>;

export interface ExchangeRateDocument {
  date: string;
  source: 'BOT' | 'EXCHANGERATE_HOST' | 'YAHOO';
  rates: RateMap;
  fetched_at: FirestoreTimestamp;
  is_estimated: boolean;
}
```

- [ ] **Step 6：`quote.ts`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/types/quote.ts`：
```typescript
import type { Currency } from '../enums/currencies.js';
import type { FirestoreTimestamp } from './user.js';

export interface QuoteDocument {
  symbol_id: string;
  symbol: string;
  market: 'TW' | 'US' | 'CRYPTO' | 'OTHER';
  currency: Currency;
  price: string;
  fetched_at: FirestoreTimestamp;
  source: string;
  source_timestamp: FirestoreTimestamp;
  is_delayed: boolean;
  delay_minutes: number;
  open: string;
  high: string;
  low: string;
  prev_close: string;
  volume: string;
}
```

- [ ] **Step 7：`types/index.ts` barrel**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/types/index.ts`：
```typescript
export * from './user.js';
export * from './account.js';
export * from './transaction.js';
export * from './symbol.js';
export * from './exchange-rate.js';
export * from './quote.js';
```

- [ ] **Step 8：在 `src/index.ts` re-export types**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/index.ts`：
```typescript
export * from './enums/index.js';
export * from './types/index.js';
```

- [ ] **Step 9：跑 typecheck + test**

```bash
pnpm --filter @assetanchor/shared typecheck
pnpm --filter @assetanchor/shared test
```
Expected: typecheck 通過、enums 測試仍然全綠（types 沒有測試但不影響 coverage threshold，因為 jest 只統計有 import 到的檔案 — 注意 collectCoverageFrom 會把 types 算進去；types 沒測試會讓 coverage 暴掉，所以下一步要把 types 排除）。

- [ ] **Step 10：調整 `jest.config.ts` 排除 types/ 與 \*.types.ts**

修改 `/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/jest.config.ts` 的 `collectCoverageFrom`：

```typescript
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts',
    '!src/types/**',
  ],
```

> Types 是純型別，runtime 沒可測程式碼；用 zod schema 驗證等 Sprint 3 再補。

- [ ] **Step 11：跑 coverage 確認 90% threshold 過**

```bash
pnpm --filter @assetanchor/shared test:coverage
```
Expected: enums 覆蓋率 100%；整體 ≥ 90%。

- [ ] **Step 12：Commit**

```bash
git add packages/shared/src/types/ packages/shared/src/index.ts packages/shared/jest.config.ts
git commit -m "feat(shared): add Firestore document types for user/account/transaction/symbol/rate/quote"
```

---

## Task 7：Money class（TDD，這是 Sprint 0 的重點）

**Files:**
- Create: `packages/shared/src/money/errors.ts`
- Create: `packages/shared/src/money/money.ts`
- Create: `packages/shared/src/money/money.test.ts`
- Create: `packages/shared/src/money/index.ts`
- Modify: `packages/shared/src/index.ts`

**Money class API（先把契約定死）：**

```typescript
class Money {
  constructor(value: string | number, currency: Currency)
  readonly currency: Currency
  toDecimalString(): string                       // 10 decimal places (Firestore storage format)
  toDisplayString(decimals?: number): string      // default 2 decimal places (UI)
  toNumber(): number                              // 退路；不建議用於金額計算
  add(other: Money): Money                        // throws CurrencyMismatchError if currency differs
  subtract(other: Money): Money                   // throws CurrencyMismatchError
  multiply(factor: string | number): Money
  divide(divisor: string | number): Money         // throws if divisor=0
  negate(): Money
  isZero(): boolean
  isPositive(): boolean
  isNegative(): boolean
  equals(other: Money): boolean                   // 同幣別且值相等
  compareTo(other: Money): -1 | 0 | 1             // throws CurrencyMismatchError
  static zero(currency: Currency): Money
  static fromDecimalString(s: string, currency: Currency): Money
}
```

按子功能拆 TDD 小循環。

- [ ] **Step 1：寫 `errors.ts`（先把 error 型別定好，測試會 import）**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/money/errors.ts`：
```typescript
import type { Currency } from '../enums/currencies.js';

export class CurrencyMismatchError extends Error {
  readonly left: Currency;
  readonly right: Currency;

  constructor(left: Currency, right: Currency) {
    super(`Cannot operate on Money values of different currencies: ${left} vs ${right}`);
    this.name = 'CurrencyMismatchError';
    this.left = left;
    this.right = right;
  }
}

export class DivisionByZeroError extends Error {
  constructor() {
    super('Cannot divide Money by zero');
    this.name = 'DivisionByZeroError';
  }
}
```

- [ ] **Step 2：寫 money.test.ts 區塊 1 — 建構子 + 不可變性**

新增 `/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/money/money.test.ts`：
```typescript
import { Money } from './money.js';
import { CurrencyMismatchError, DivisionByZeroError } from './errors.js';

describe('Money constructor', () => {
  it('accepts string value', () => {
    const m = new Money('1234.56', 'TWD');
    expect(m.currency).toBe('TWD');
    expect(m.toDecimalString()).toBe('1234.5600000000');
  });

  it('accepts number value', () => {
    const m = new Money(1234.56, 'USD');
    expect(m.toDecimalString()).toBe('1234.5600000000');
  });

  it('handles very small fractional values without float drift', () => {
    const m = new Money('0.1', 'TWD').add(new Money('0.2', 'TWD'));
    expect(m.toDecimalString()).toBe('0.3000000000');
  });

  it('handles trailing zeros consistently', () => {
    expect(new Money('100', 'USD').toDecimalString()).toBe('100.0000000000');
  });

  it('throws on invalid string', () => {
    expect(() => new Money('not-a-number', 'USD')).toThrow();
  });

  it('currency is readonly', () => {
    const m = new Money('1', 'USD');
    // @ts-expect-error currency should be readonly
    m.currency = 'TWD';
  });
});
```

- [ ] **Step 3：跑測試確認失敗**

```bash
pnpm --filter @assetanchor/shared test money.test
```
Expected: `Cannot find module './money.js'` 等錯誤。

- [ ] **Step 4：寫 `money.ts` 最小實作以通過 constructor 區塊**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/money/money.ts`：
```typescript
import Decimal from 'decimal.js';
import type { Currency } from '../enums/currencies.js';
import { CurrencyMismatchError, DivisionByZeroError } from './errors.js';

const STORAGE_DECIMALS = 10;
const DEFAULT_DISPLAY_DECIMALS = 2;

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

export class Money {
  readonly currency: Currency;
  private readonly value: Decimal;

  constructor(value: string | number, currency: Currency) {
    this.value = new Decimal(value);
    this.currency = currency;
  }

  toDecimalString(): string {
    return this.value.toFixed(STORAGE_DECIMALS);
  }

  toDisplayString(decimals: number = DEFAULT_DISPLAY_DECIMALS): string {
    return this.value.toFixed(decimals);
  }

  toNumber(): number {
    return this.value.toNumber();
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.value.plus(other.value).toString(), this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.value.minus(other.value).toString(), this.currency);
  }

  multiply(factor: string | number): Money {
    return new Money(this.value.times(new Decimal(factor)).toString(), this.currency);
  }

  divide(divisor: string | number): Money {
    const d = new Decimal(divisor);
    if (d.isZero()) throw new DivisionByZeroError();
    return new Money(this.value.div(d).toString(), this.currency);
  }

  negate(): Money {
    return new Money(this.value.negated().toString(), this.currency);
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isPositive(): boolean {
    return this.value.isPositive() && !this.value.isZero();
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.value.equals(other.value);
  }

  compareTo(other: Money): -1 | 0 | 1 {
    this.assertSameCurrency(other);
    return this.value.cmp(other.value) as -1 | 0 | 1;
  }

  static zero(currency: Currency): Money {
    return new Money('0', currency);
  }

  static fromDecimalString(s: string, currency: Currency): Money {
    return new Money(s, currency);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
  }
}
```

> 直接寫完整 implementation 是「TDD 變體」— 接下來每個區塊先寫測試，但 implementation 不再改。若某區塊測試失敗代表 implementation 有 bug，回頭修。

- [ ] **Step 5：跑測試確認 constructor 區塊綠燈**

```bash
pnpm --filter @assetanchor/shared test money.test
```
Expected: 6 個 constructor 測試全綠。

- [ ] **Step 6：在 `money.test.ts` 加 add / subtract 區塊**

在 `money.test.ts` 檔尾追加：
```typescript
describe('Money.add', () => {
  it('adds same-currency values', () => {
    const a = new Money('100.50', 'TWD');
    const b = new Money('200.25', 'TWD');
    expect(a.add(b).toDecimalString()).toBe('300.7500000000');
  });

  it('is immutable (does not mutate operands)', () => {
    const a = new Money('100', 'TWD');
    const b = new Money('50', 'TWD');
    a.add(b);
    expect(a.toDecimalString()).toBe('100.0000000000');
    expect(b.toDecimalString()).toBe('50.0000000000');
  });

  it('throws CurrencyMismatchError when currencies differ', () => {
    const a = new Money('100', 'TWD');
    const b = new Money('100', 'USD');
    expect(() => a.add(b)).toThrow(CurrencyMismatchError);
  });

  it('accumulating 1000 × 0.1 equals exactly 100', () => {
    let total = Money.zero('USD');
    for (let i = 0; i < 1000; i += 1) {
      total = total.add(new Money('0.1', 'USD'));
    }
    expect(total.toDecimalString()).toBe('100.0000000000');
  });
});

describe('Money.subtract', () => {
  it('subtracts same-currency values', () => {
    const a = new Money('100', 'USD');
    const b = new Money('30.5', 'USD');
    expect(a.subtract(b).toDecimalString()).toBe('69.5000000000');
  });

  it('produces negative when right > left', () => {
    const a = new Money('30', 'USD');
    const b = new Money('100', 'USD');
    expect(a.subtract(b).toDecimalString()).toBe('-70.0000000000');
  });

  it('throws CurrencyMismatchError when currencies differ', () => {
    expect(() =>
      new Money('100', 'TWD').subtract(new Money('1', 'USD')),
    ).toThrow(CurrencyMismatchError);
  });
});
```

- [ ] **Step 7：跑測試**

```bash
pnpm --filter @assetanchor/shared test money.test
```
Expected: add / subtract 區塊全綠。

- [ ] **Step 8：在 `money.test.ts` 加 multiply / divide / negate 區塊**

```typescript
describe('Money.multiply', () => {
  it('multiplies by integer factor', () => {
    expect(new Money('10.5', 'USD').multiply(3).toDecimalString()).toBe('31.5000000000');
  });

  it('multiplies by decimal string factor', () => {
    expect(new Money('100', 'TWD').multiply('0.001425').toDecimalString()).toBe(
      '0.1425000000',
    );
  });

  it('keeps currency', () => {
    expect(new Money('10', 'USD').multiply(2).currency).toBe('USD');
  });
});

describe('Money.divide', () => {
  it('divides by integer', () => {
    expect(new Money('100', 'USD').divide(4).toDecimalString()).toBe('25.0000000000');
  });

  it('divides by decimal', () => {
    expect(new Money('100', 'TWD').divide('31.65').toDecimalString()).toBe('3.1595576619');
  });

  it('throws DivisionByZeroError on zero divisor', () => {
    expect(() => new Money('100', 'USD').divide(0)).toThrow(DivisionByZeroError);
    expect(() => new Money('100', 'USD').divide('0')).toThrow(DivisionByZeroError);
  });
});

describe('Money.negate', () => {
  it('flips sign of positive value', () => {
    expect(new Money('100', 'USD').negate().toDecimalString()).toBe('-100.0000000000');
  });

  it('flips sign of negative value', () => {
    expect(new Money('-50', 'USD').negate().toDecimalString()).toBe('50.0000000000');
  });

  it('returns zero for zero', () => {
    expect(Money.zero('USD').negate().isZero()).toBe(true);
  });
});
```

- [ ] **Step 9：跑測試**

```bash
pnpm --filter @assetanchor/shared test money.test
```
Expected: 全綠。

- [ ] **Step 10：在 `money.test.ts` 加 比較 + 預測 helper + static**

```typescript
describe('Money.isZero / isPositive / isNegative', () => {
  it('detects zero', () => {
    expect(Money.zero('USD').isZero()).toBe(true);
    expect(new Money('0.0000000001', 'USD').isZero()).toBe(false);
  });

  it('detects positive (strict, excludes zero)', () => {
    expect(new Money('1', 'USD').isPositive()).toBe(true);
    expect(Money.zero('USD').isPositive()).toBe(false);
    expect(new Money('-1', 'USD').isPositive()).toBe(false);
  });

  it('detects negative', () => {
    expect(new Money('-1', 'USD').isNegative()).toBe(true);
    expect(Money.zero('USD').isNegative()).toBe(false);
    expect(new Money('1', 'USD').isNegative()).toBe(false);
  });
});

describe('Money.equals', () => {
  it('returns true for same currency and value', () => {
    expect(new Money('10', 'USD').equals(new Money('10.0000000000', 'USD'))).toBe(true);
  });

  it('returns false for different currency', () => {
    expect(new Money('10', 'USD').equals(new Money('10', 'TWD'))).toBe(false);
  });

  it('returns false for different value', () => {
    expect(new Money('10', 'USD').equals(new Money('10.01', 'USD'))).toBe(false);
  });
});

describe('Money.compareTo', () => {
  it('returns -1 when this < other', () => {
    expect(new Money('1', 'USD').compareTo(new Money('2', 'USD'))).toBe(-1);
  });

  it('returns 0 when this == other', () => {
    expect(new Money('5', 'USD').compareTo(new Money('5', 'USD'))).toBe(0);
  });

  it('returns 1 when this > other', () => {
    expect(new Money('10', 'USD').compareTo(new Money('1', 'USD'))).toBe(1);
  });

  it('throws when currencies differ', () => {
    expect(() =>
      new Money('1', 'USD').compareTo(new Money('1', 'TWD')),
    ).toThrow(CurrencyMismatchError);
  });
});

describe('Money.toDisplayString', () => {
  it('defaults to 2 decimal places', () => {
    expect(new Money('1234.5678', 'TWD').toDisplayString()).toBe('1234.57');
  });

  it('accepts custom decimal places', () => {
    expect(new Money('1234.5678', 'TWD').toDisplayString(0)).toBe('1235');
    expect(new Money('1234.5678', 'TWD').toDisplayString(4)).toBe('1234.5678');
  });

  it('uses ROUND_HALF_UP', () => {
    expect(new Money('1.005', 'USD').toDisplayString(2)).toBe('1.01');
    expect(new Money('1.004', 'USD').toDisplayString(2)).toBe('1.00');
  });
});

describe('Money.toNumber', () => {
  it('returns JS number (acknowledged precision loss for huge values)', () => {
    expect(new Money('1234.56', 'USD').toNumber()).toBeCloseTo(1234.56, 2);
  });
});

describe('Money.fromDecimalString', () => {
  it('rebuilds Money from Firestore storage string', () => {
    const m = Money.fromDecimalString('1234.5678901234', 'TWD');
    expect(m.currency).toBe('TWD');
    expect(m.toDecimalString()).toBe('1234.5678901234');
  });
});

describe('Money.zero', () => {
  it('creates zero of given currency', () => {
    expect(Money.zero('USD').isZero()).toBe(true);
    expect(Money.zero('USD').currency).toBe('USD');
  });
});
```

- [ ] **Step 11：跑完整測試 + coverage**

```bash
pnpm --filter @assetanchor/shared test:coverage
```
Expected: Money + errors 兩檔覆蓋率 100%；整體 ≥ 90%。

- [ ] **Step 12：寫 `money/index.ts` barrel**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/money/index.ts`：
```typescript
export * from './money.js';
export * from './errors.js';
```

- [ ] **Step 13：在 `src/index.ts` re-export money**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/packages/shared/src/index.ts`：
```typescript
export * from './enums/index.js';
export * from './types/index.js';
export * from './money/index.js';
```

- [ ] **Step 14：Commit**

```bash
git add packages/shared/src/money/ packages/shared/src/index.ts
git commit -m "feat(shared): add Money class with decimal.js (TDD, >90% coverage)"
```

---

## Task 8：`apps/mobile` workspace skeleton（先佔位，Sprint 1 才真正 Expo init）

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/src/index.ts`

> Sprint 1 才會做 `npx create-expo-app`。Sprint 0 只佔 workspace 名稱讓 pnpm + CI 跑得起來。

- [ ] **Step 1：`apps/mobile/package.json`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile/package.json`：
```json
{
  "name": "@assetanchor/mobile",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint 'src/**/*.{ts,tsx}'",
    "test": "echo 'no tests yet (Sprint 0 placeholder)' && exit 0"
  },
  "dependencies": {
    "@assetanchor/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.5.4"
  }
}
```

- [ ] **Step 2：`apps/mobile/tsconfig.json`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile/tsconfig.json`：
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "jsx": "react-native",
    "moduleResolution": "Bundler",
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3：`apps/mobile/src/index.ts` 佔位**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile/src/index.ts`：
```typescript
// Sprint 0 placeholder. Expo app entry will be initialized in Sprint 1.
import { Money } from '@assetanchor/shared';

export function sanityCheck(): string {
  return Money.zero('TWD').toDisplayString();
}
```

> 這個檔的作用是讓 monorepo 連通可被驗證 — 若 `@assetanchor/shared` 解析失敗，typecheck 會立即報錯。

- [ ] **Step 4：跑 typecheck**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
pnpm install
pnpm --filter @assetanchor/mobile typecheck
```
Expected: 無錯誤。

- [ ] **Step 5：Commit**

```bash
git add apps/mobile/ pnpm-lock.yaml
git commit -m "chore(mobile): scaffold apps/mobile workspace placeholder"
```

---

## Task 9：`apps/functions` workspace skeleton（同上佔位）

**Files:**
- Create: `apps/functions/package.json`
- Create: `apps/functions/tsconfig.json`
- Create: `apps/functions/src/index.ts`

- [ ] **Step 1：`apps/functions/package.json`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/functions/package.json`：
```json
{
  "name": "@assetanchor/functions",
  "version": "0.0.1",
  "private": true,
  "main": "lib/index.js",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint 'src/**/*.ts'",
    "test": "echo 'no tests yet (Sprint 0 placeholder)' && exit 0",
    "build": "tsc"
  },
  "engines": {
    "node": "20"
  },
  "dependencies": {
    "@assetanchor/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^22.7.5",
    "typescript": "^5.5.4"
  }
}
```

> `engines.node: 20` 對齊 Firebase Functions 2nd gen 官方支援版本（Cloud Functions runtime 與 dev 環境的 Node 22 解耦，Sprint 4 真正 deploy 才會被 Firebase CLI 檢查）。

- [ ] **Step 2：`apps/functions/tsconfig.json`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/functions/tsconfig.json`：
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./lib",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "target": "ES2022",
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
```

> Firebase Functions runtime 是 CommonJS，所以 functions 用 `module: CommonJS`，與 mobile / shared 不同。

- [ ] **Step 3：`apps/functions/src/index.ts` 佔位**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/functions/src/index.ts`：
```typescript
// Sprint 0 placeholder. Real Cloud Functions wiring starts in Sprint 4.
import { Money } from '@assetanchor/shared';

export function sanityCheck(): string {
  return Money.zero('USD').toDisplayString();
}
```

- [ ] **Step 4：跑 typecheck**

```bash
pnpm install
pnpm --filter @assetanchor/functions typecheck
```
Expected: 無錯誤。

- [ ] **Step 5：Commit**

```bash
git add apps/functions/ pnpm-lock.yaml
git commit -m "chore(functions): scaffold apps/functions workspace placeholder"
```

---

## Task 10：Firebase config（firestore.rules / firestore.indexes / firebase.json）

**Files:**
- Create: `firebase/firebase.json`
- Create: `firebase/.firebaserc`
- Create: `firebase/firestore.rules`
- Create: `firebase/firestore.indexes.json`

> Rules / Indexes 內容直接照搬 planning doc §7 + §8。實際 `firebase deploy` 在 Task 14 由使用者執行（影響共用基礎建設，需明確授權）。

- [ ] **Step 1：`firebase/.firebaserc`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/firebase/.firebaserc`：
```json
{
  "projects": {
    "default": "assetanchor-832df"
  }
}
```

- [ ] **Step 2：`firebase/firebase.json`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/firebase/firebase.json`：
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "firestore": { "port": 8080 },
    "auth": { "port": 9099 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

> Functions 區塊等 Sprint 4 再加（避免 Sprint 0 deploy 時帶到還不存在的 functions 目錄）。

- [ ] **Step 3：`firebase/firestore.rules`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/firebase/firestore.rules`：
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 使用者只能讀寫自己的所有資料
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }

    // 匯率：登入使用者皆可讀，只有後端 (Admin SDK) 可寫
    match /exchange_rates/{date} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // 股票代號：登入使用者皆可讀，可建立（MVP 動態新增），不可改不可刪
    match /symbols/{symbolId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }

    // 報價快取：登入使用者皆可讀，只有後端 (Cloud Function) 可寫
    match /quotes/{symbolId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

- [ ] **Step 4：`firebase/firestore.indexes.json`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/firebase/firestore.indexes.json`：
```json
{
  "indexes": [
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "account_id", "order": "ASCENDING" },
        { "fieldPath": "transaction_date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "asset_type", "order": "ASCENDING" },
        { "fieldPath": "transaction_date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "symbol", "order": "ASCENDING" },
        { "fieldPath": "transaction_date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "transaction_type", "order": "ASCENDING" },
        { "fieldPath": "transaction_date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "accounts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "is_active", "order": "ASCENDING" },
        { "fieldPath": "display_order", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

- [ ] **Step 5：本地 lint rules 檔語法（不 deploy，只 dry-run）**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/firebase
firebase --version
firebase deploy --only firestore:rules --dry-run --project assetanchor-832df 2>&1 | head -20
```
Expected: 若已 `firebase login`，會印 `Dry run` 並 validate 通過；若未登入，會看到 `Error: Authentication required`。

> 若未登入：跳出去執行 `firebase login`（互動式），登入完後再回頭跑 dry-run。

- [ ] **Step 6：Commit firebase config**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
git add firebase/
git commit -m "feat(firebase): add firestore rules / indexes / project config"
```

> ⚠️ 實際 `firebase deploy` 留到 Task 14 — 那是「影響 shared infra」的動作，必須使用者明確授權後才執行。

---

## Task 11：GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1：寫 `.github/workflows/ci.yml`**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/.github/workflows/ci.yml`：
```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

env:
  PNPM_VERSION: 9.12.0
  NODE_VERSION: 22

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec prettier --check .
      - run: pnpm -r lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @assetanchor/shared test:coverage
      - uses: actions/upload-artifact@v4
        with:
          name: shared-coverage
          path: packages/shared/coverage/
          retention-days: 7
```

- [ ] **Step 2：本機 dry-run CI 指令（模擬 CI 行為）**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
pnpm install --frozen-lockfile
pnpm exec prettier --check .
pnpm -r lint
pnpm -r typecheck
pnpm --filter @assetanchor/shared test:coverage
```
Expected: 五條全綠（任何失敗都先修，不要 commit 紅燈 CI）。

> 若 `prettier --check` 失敗，先跑 `pnpm exec prettier --write .` 修好再 commit。

- [ ] **Step 3：Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci(infra): add github actions for lint / typecheck / test"
```

---

## Task 12：PR template + Issue templates

**Files:**
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`

- [ ] **Step 1：PR template**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/.github/PULL_REQUEST_TEMPLATE.md`：
```markdown
## Summary

<!-- 一兩句話描述這個 PR 解決了什麼問題 / 帶入什麼功能 -->

## Changes

- [ ] ...

## Testing

- [ ] 新增 / 更新單元測試
- [ ] 本機 `pnpm -r typecheck` 通過
- [ ] 本機 `pnpm -r test` 通過
- [ ] 本機 `pnpm -r lint` 通過

## Related

- Sprint: <!-- Sprint X -->
- ADR: <!-- 若有新決策，附 ADR 連結；無則寫 N/A -->
- Planning doc 對應章節: <!-- §X.Y / N/A -->

## Screenshots / Recordings

<!-- 若有 UI 變動請附 -->
```

- [ ] **Step 2：bug report template**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/.github/ISSUE_TEMPLATE/bug_report.yml`：
```yaml
name: Bug Report
description: Report a defect in AssetAnchor
labels: ['bug']
body:
  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: Describe the bug + steps to reproduce
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
    validations:
      required: true
  - type: dropdown
    id: surface
    attributes:
      label: Surface
      options:
        - apps/mobile
        - apps/functions
        - packages/shared
        - firebase rules / indexes
        - infra (CI / tooling)
    validations:
      required: true
  - type: input
    id: env
    attributes:
      label: Env (iOS / Android / version / etc.)
```

- [ ] **Step 3：feature request template**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/.github/ISSUE_TEMPLATE/feature_request.yml`：
```yaml
name: Feature Request
description: Suggest a new feature or improvement
labels: ['enhancement']
body:
  - type: textarea
    id: motivation
    attributes:
      label: Motivation
      description: 解決什麼問題、目前痛點是什麼？
    validations:
      required: true
  - type: textarea
    id: proposal
    attributes:
      label: Proposal
    validations:
      required: true
  - type: dropdown
    id: phase
    attributes:
      label: Target phase
      options:
        - MVP
        - Phase 2
        - Phase 3
        - Backlog
    validations:
      required: true
```

- [ ] **Step 4：Commit**

```bash
git add .github/PULL_REQUEST_TEMPLATE.md .github/ISSUE_TEMPLATE/
git commit -m "docs(infra): add PR + issue templates"
```

---

## Task 13：ADRs（ADR-000 + ADR-001）

**Files:**
- Create: `docs/adr/0000-planning-doc.md`
- Create: `docs/adr/0001-monorepo-with-pnpm.md`

- [ ] **Step 1：ADR-000（指向 planning doc 即可）**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/docs/adr/0000-planning-doc.md`：
```markdown
# ADR-000: Planning Document as Source of Truth

- **Status**: Accepted
- **Date**: 2026-05-17（planning doc v2.3）
- **Deciders**: Sean Wang

## Context

AssetAnchor 在 Sprint 0 開始前完成了完整 MVP 規劃（議題 1–7 全部收斂）。決策密度高、互相參照頻繁，若拆成多份 ADR 反而難維護。

## Decision

`docs/portfolio_tracker_planning.md` 為**規劃決策的 source of truth**。所有後續 ADR（0001+）皆為對某一決策的補述或重新評估，不重複論證已寫在 planning doc 內的內容。

## Consequences

- 任何 v2.3 後的核心決策變更，須同步更新 planning doc + 新增對應 ADR
- 新貢獻者第一份要讀的文件即為 planning doc
- planning doc 章節編號（§N）為穩定錨點，commit message 與 ADR 內可直接引用

## Alternatives Considered

- **拆成 N 份 ADR-000x**：規劃還在初期 / 議題互相影響大，拆開反而需要大量交叉引用，留待具體實作 sprint 時再各別生 ADR。
```

- [ ] **Step 2：ADR-001（monorepo with pnpm）**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/docs/adr/0001-monorepo-with-pnpm.md`：
```markdown
# ADR-001: Monorepo with pnpm Workspaces

- **Status**: Accepted
- **Date**: 2026-05-22（Sprint 0）
- **Deciders**: Sean Wang

## Context

AssetAnchor 包含三個明確獨立但**共用 Firestore schema 與 Money class** 的部分：
- `apps/mobile`（Expo React Native App）
- `apps/functions`（Firebase Cloud Functions）
- `packages/shared`（Firestore document types、enums、Money）

若不共用，等於要在三邊重複維護同樣的 type/enum/邏輯，且任何 schema 變動須三邊同步。

## Decision

採 **monorepo + pnpm workspaces**：
- 工作目錄 `apps/*`、`packages/*` 透過 `pnpm-workspace.yaml` 宣告
- `@assetanchor/shared` 以 `workspace:*` 形式被 mobile / functions 引用
- 不額外裝 Turborepo / Nx；`pnpm -r <script>` 已足夠跑跨 workspace 指令

## Consequences

- ✅ Types / enums / Money 改動一次、三邊立即同步
- ✅ Single `pnpm install`、single lockfile
- ✅ CI 只需一條 install pipeline
- ⚠️ Expo `metro` 對 monorepo 需要額外設定（Sprint 1 處理）
- ⚠️ Firebase Functions deploy 時要打包 `packages/shared` 為相對相依（Sprint 4 處理）

## Alternatives Considered

| 方案 | 為什麼不採 |
|---|---|
| 兩個獨立 repo + npm publish `shared` | publish 流程太重、版本管理成本高、solo dev 不值得 |
| Yarn workspaces / npm workspaces | pnpm 的 strict 預設 + 較小的 node_modules 適合 solo dev 維護 |
| Turborepo / Nx | 暫不需要 task graph 快取；增加學習曲線無對應收益 |

## References

- planning doc §12.1 — Repo 結構
- planning doc §12.2 — 模組劃分
```

- [ ] **Step 3：Commit**

```bash
git add docs/adr/
git commit -m "docs(adr): add ADR-000 planning doc + ADR-001 monorepo decision"
```

---

## Task 14：最終驗收 + Firebase deploy + Sprint 0 收尾

**Files:** （無新增）

> 本 task 是 sprint exit gate。把所有檢查跑一遍、Firebase rules/indexes 部署（**先確認使用者授權**）、寫 sprint retro。

- [ ] **Step 1：跑完整本機驗收**

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
pnpm install --frozen-lockfile
pnpm exec prettier --check .
pnpm -r lint
pnpm -r typecheck
pnpm -r test
pnpm --filter @assetanchor/shared test:coverage
```
Expected: 全綠；shared coverage 報告底部 `All files` 行 lines/statements/functions/branches 皆 ≥ 90%。

- [ ] **Step 2：開 feature branch + push + PR**

```bash
# Sprint 0 所有 commit 目前都在 main 本地；改為走 PR-only 紀律
git checkout -b feature/sprint-0-foundation
git push -u origin feature/sprint-0-foundation
gh pr create --title "Sprint 0: Foundation (monorepo + shared + CI + firebase config)" --body "$(cat <<'EOF'
## Summary

完成 Sprint 0 Foundation — pnpm monorepo 骨架、`packages/shared`（types / enums / Money class with >90% coverage）、ESLint/Prettier/Husky/commitlint/CI、Firebase rules + indexes 設定、ADR-000 / ADR-001。

## Changes

- monorepo: pnpm workspaces (apps/mobile, apps/functions, packages/shared)
- shared: Firestore document types, broker/account/asset/transaction/currency enums, Money class with decimal.js
- infra: ESLint flat config, Prettier, Husky pre-commit + commit-msg, commitlint (Conventional Commits)
- ci: GitHub Actions lint + typecheck + test
- firebase: firestore.rules + firestore.indexes.json (per planning doc §7 §8)
- docs: planning doc moved to docs/, ADR-000 (planning doc as SoT) + ADR-001 (monorepo decision)

## Testing

- [x] `pnpm -r typecheck` ✅
- [x] `pnpm -r lint` ✅
- [x] `pnpm -r test` ✅
- [x] Money class coverage 100%, packages/shared overall ≥90%

## Related

- Sprint: 0 (Foundation)
- ADR: docs/adr/0000-planning-doc.md, docs/adr/0001-monorepo-with-pnpm.md
- Planning doc 對應章節: §12 (專案骨架), §13.2 (Sprint 0)
EOF
)"
```

> ⚠️ 此步驟需要事先 `gh auth login` 完成；若未設定 GitHub remote，先 `gh repo create AssetAnchor --source=. --private --push`。

- [ ] **Step 3：CI 綠燈確認**

到 PR 頁等 lint / typecheck / test 三條 job 全綠（或本機跑 `gh pr checks --watch`）。若紅燈，修完 push 同 branch 再等一次。

- [ ] **Step 4：使用者明確授權後執行 Firebase deploy**

> 🚦 **這是「影響 shared infra」的動作 — 暫停、向使用者確認後再執行**。
>
> 確認項目：
> 1. 是否已清空 `assetanchor-832df` 的舊 Firestore 資料？（手動到 Firebase Console → Firestore → 刪除所有 collection）
> 2. 是否確認要部署本 PR 的 rules + indexes？

使用者授權後執行：
```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor/firebase
firebase login         # 若未登入
firebase use assetanchor-832df
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```
Expected: rules 即時生效；indexes 進 building 狀態（幾分鐘到幾十分鐘 build 完）。

- [ ] **Step 5：撿舊專案 plist + .env（為 Sprint 1 預備）**

```bash
mkdir -p /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile/.secrets
cp /Users/sean.wang/Documents/Sean/project/AssetAnchor_old/GoogleService-Info.plist \
   /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile/.secrets/
cp /Users/sean.wang/Documents/Sean/project/AssetAnchor_old/.env \
   /Users/sean.wang/Documents/Sean/project/AssetAnchor/apps/mobile/.env.sprint1-reference
```
> 這些檔已被 `.gitignore` 排除（`.env*` + `*.plist` 雖未排除 plist，但 `.secrets/` 也加進 .gitignore；下一步補）。

- [ ] **Step 6：補 .gitignore（plist + .secrets）**

修改 `/Users/sean.wang/Documents/Sean/project/AssetAnchor/.gitignore`，在 `# Env` 區塊上方加：
```
# Secrets (Firebase plist, OAuth keys, etc.)
.secrets/
GoogleService-Info.plist
google-services.json
```

```bash
git checkout main          # 或留在 feature branch 加 commit
git add .gitignore
git commit -m "chore(infra): ignore firebase secrets (plist, .secrets/)"
git push
```

- [ ] **Step 7：Merge PR（使用者本人按 merge）**

> ⚠️ 依使用者全域規則：merge 按鈕由使用者本人按，AI 不執行。

- [ ] **Step 8：寫 Sprint 0 retrospective**

`/Users/sean.wang/Documents/Sean/project/AssetAnchor/docs/retros/sprint-0.md`（先 `mkdir -p docs/retros`）：
```markdown
# Sprint 0 Retrospective

**Period**: 2026-05-22 → <fill in>
**Goal**: Foundation — monorepo + shared + tooling + CI + firebase config

## What worked
- <fill in>

## What didn't
- <fill in>

## Next
- 進入 Sprint 1：Auth + Hello Firebase Rail（最大風險點 EAS Dev Build + @react-native-firebase native config）
```

- [ ] **Step 9：最終 commit + 標 sprint 結束**

```bash
git checkout main
git pull
git tag sprint-0-complete
git push --tags
```

---

## Sprint 0 完成判準（exit gate）

收尾時逐項勾選：

- [ ] `pnpm install --frozen-lockfile` 從 0 到 1 成功
- [ ] `pnpm -r typecheck` 全綠
- [ ] `pnpm -r lint` 全綠
- [ ] `pnpm -r test` 全綠
- [ ] `packages/shared` coverage ≥ 90%（Money class 應 100%）
- [ ] Husky 攔截：壞 commit message 真的被 reject、`pnpm exec lint-staged` 在 pre-commit 真的跑
- [ ] CI（GitHub Actions）三個 job 在 PR 全綠
- [ ] Firebase rules + indexes 已部署到 `assetanchor-832df`
- [ ] ADR-000 + ADR-001 已寫入 `docs/adr/`
- [ ] Sprint retro 寫好

達標後 → Sprint 1：Auth + Hello Firebase Rail。

---

## 風險與 fallback

| 風險 | 觸發點 | Fallback |
|---|---|---|
| `pnpm install` 失敗（lockfile drift / peer deps 衝突） | Task 2 Step 6 | 刪 `node_modules` + `pnpm-lock.yaml` 重跑；若仍失敗，降版 typescript-eslint 到 8.0.x |
| Husky hook 在 macOS 沒執行權限 | Task 3 Step 5 | 確認 `chmod +x .husky/*` 跑過；確認 `git config core.hooksPath` 為 `.husky` |
| ts-jest ESM preset 失敗 | Task 4 Step 6 | 改用 `ts-jest/presets/default`（CJS），把 `extensionsToTreatAsEsm` 移除；改 `packages/shared/package.json` 移除 `"type": "module"`，import 路徑去掉 `.js` 副檔名 |
| Firebase deploy 認證失敗 | Task 14 Step 4 | 重跑 `firebase login --reauth`；確認 `assetanchor-832df` 在當前 Google 帳號下可見 |
| Coverage 卡 89%（差幾行） | Task 7 Step 11 | 補測 errors.ts 兩個 error class 的 `name` / 屬性，或在 jest config 暫時降到 85% + 留 TODO 在 retro |

---

## Self-Review Checklist

✅ **Spec coverage**：Planning doc §13.2 Sprint 0 五項驗收標準 → Task 1 (monorepo) / Task 4-7 (shared + Money) / Task 2-3 + 11 (tooling + CI) / Task 10 + 14 (firebase) / Task 13 (ADR) 全部對到。

✅ **No placeholders**：每個 step 都有完整 code block 或具體指令，無 "TBD" / "add error handling" / "similar to Task N"。

✅ **Type consistency**：Money method 名稱（add/subtract/multiply/divide/negate/equals/compareTo/isZero/isPositive/isNegative/toDecimalString/toDisplayString/toNumber/zero/fromDecimalString）在 API 定義與測試與 implementation 三處一致。Enum 命名 `BROKERS`/`ACCOUNT_TYPES`/`ASSET_TYPES`/`TRANSACTION_TYPES`/`CURRENCIES` + 對應 type 一致。Firestore type interface 名稱 `XxxDocument` 全部一致。

✅ **TDD discipline**：Money class（Task 7）採嚴格 test-first；enums（Task 5）採 "test 全部寫完再實作"；types（Task 6）純型別不需要 runtime test 但有 typecheck gate。

✅ **Frequent commits**：14 個 task 對應 ≥ 14 個 commit（部分 task 拆 2-3 commit），符合 trunk-based 小步推進。

✅ **High-risk gates**：Firebase deploy（Task 14 Step 4）明確標注「使用者授權後執行」；merge PR（Task 14 Step 7）標注「使用者本人按 merge」。
