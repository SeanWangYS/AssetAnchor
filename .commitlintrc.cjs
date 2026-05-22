module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'docs', 'refactor', 'test', 'style', 'perf', 'ci', 'build'],
    ],
    'scope-enum': [2, 'always', ['mobile', 'functions', 'shared', 'infra', 'docs', 'firebase']],
    'scope-empty': [2, 'never'],
    'subject-case': [0],
  },
};
