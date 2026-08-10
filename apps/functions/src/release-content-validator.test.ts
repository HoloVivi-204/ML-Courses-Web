import { describe, expect, it } from 'vitest';

import {
  assertReleaseContentBaseline,
  createReleaseContentValidationInput,
  validateReleaseContentBaseline,
} from './release-content-validator.js';

describe('Release 1 content baseline validator', () => {
  it('proves the exact localized, source-pinned, deterministic baseline', () => {
    expect(assertReleaseContentBaseline()).toEqual({
      counts: {
        courses: 2,
        demos: 10,
        moduleQuizQuestions: 72,
        modules: 12,
        postQuizQuestions: 54,
        posts: 18,
        quizQuestions: 126,
      },
      status: 'valid',
    });
  });

  it('rejects nested locale, link, source, semantic, and deterministic proof drift', () => {
    const input = createReleaseContentValidationInput();
    const invalid = {
      ...input,
      demos: input.demos.map((demo, index) =>
        index === 0
          ? {
              ...demo,
              resultHash: '0'.repeat(64),
              visualFixture: { ...demo.visualFixture, hash: 'f'.repeat(64) },
            }
          : demo,
      ),
      posts: input.posts.map((post, index) =>
        index === 0
          ? {
              ...post,
              taskFingerprint: 'invalid',
              title: {
                ...post.title,
                vi: 'Generic feature chưa được chú giải ở lần đầu xuất hiện',
              },
              blocks: post.blocks.map((block, blockIndex) =>
                blockIndex === 0
                  ? {
                      ...block,
                      externalLinkUrl: 'javascript:alert(1)',
                      locales: {
                        ...block.locales,
                        vi: { ...block.locales.vi, title: '' },
                      },
                    }
                  : block,
              ),
            }
          : post,
      ),
      quizzes: input.quizzes.map((quiz, index) =>
        index === 0
          ? {
              ...quiz,
              questions: quiz.questions.map((question, questionIndex) =>
                questionIndex === 0
                  ? { ...question, sourceIds: [], taskFingerprint: 'invalid' }
                  : question,
              ),
            }
          : quiz,
      ),
    };
    const report = validateReleaseContentBaseline(invalid);
    const findingCodes = report.findings.map((finding) => finding.code);

    expect(report.status).toBe('invalid');
    expect(findingCodes).toEqual(
      expect.arrayContaining([
        'DEMO_RESULT_HASH_MISMATCH',
        'DEMO_VISUAL_FIXTURE_MISMATCH',
        'GENERIC_CONTENT_FORBIDDEN',
        'SOURCE_REFERENCE_MISSING',
        'TASK_FINGERPRINT_INVALID',
        'TERMINOLOGY_FIRST_USE_INVALID',
        'TEXT_MISSING',
        'URL_INVALID',
      ]),
    );
  });
});
