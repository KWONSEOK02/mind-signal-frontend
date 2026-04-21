module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'chore',
        'refactor',
        'test',
        'ci',
        'revert',
        'perf',
        'style',
      ],
    ],
    'scope-case': [2, 'always', 'kebab-case'],
    // start-case·pascal-case·upper-case 3종 금지 → 순수 영어 소문자 강제, 한국어/파일명 혼용 subject는 sentence-case 허용
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
  },
};
