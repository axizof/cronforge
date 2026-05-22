/**
 * Conventional Commits config for CronForge.
 *
 * Per Constitution Principle XII:
 *   - Subject MUST follow Conventional Commits (`type(scope): subject`).
 *   - Commit messages MUST NOT contain AI-attribution trailers.
 *
 * The `no-ai-attribution` rule below is custom; it scans the entire raw
 * message (header + body + footer) for forbidden trailers.
 */

const FORBIDDEN_AI_ATTRIBUTION_PATTERNS = [
  /co-authored-by:\s*claude/i,
  /generated with \[?claude code/i,
  /co-authored-by:.*anthropic/i,
];

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'header-max-length': [2, 'always', 100],
    'subject-case': [0],
    'no-ai-attribution': [2, 'always'],
  },
  plugins: [
    {
      rules: {
        'no-ai-attribution': ({ raw }) => {
          const message = raw ?? '';
          for (const pattern of FORBIDDEN_AI_ATTRIBUTION_PATTERNS) {
            if (pattern.test(message)) {
              return [
                false,
                'Commit messages must not contain AI-attribution trailers (Constitution Principle XII).',
              ];
            }
          }
          return [true];
        },
      },
    },
  ],
};
