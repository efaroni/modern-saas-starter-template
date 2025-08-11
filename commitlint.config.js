/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Allow longer commit messages for detailed descriptions
    'body-max-line-length': [2, 'always', 100],
    'footer-max-line-length': [2, 'always', 100],
    'header-max-length': [2, 'always', 100],

    // Enforce conventional commit types
    'type-enum': [
      2,
      'always',
      [
        'build',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'style',
        'test',
        'chore',
        'revert',
      ],
    ],

    // Enforce lowercase subject
    'subject-case': [2, 'always', 'lower-case'],

    // Require subject
    'subject-empty': [2, 'never'],

    // Require type
    'type-empty': [2, 'never'],
  },
};
