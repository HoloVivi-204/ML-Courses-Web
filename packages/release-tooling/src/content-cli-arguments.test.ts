import { describe, expect, it } from 'vitest';

import {
  parseCourseCommand,
  parseFetchSourceCommand,
  parseScopeValidationCommand,
} from './content-cli-arguments.js';

describe('content pipeline command arguments', () => {
  it('accepts only one allowlist source identifier for fetch', () => {
    expect(parseFetchSourceCommand(['--source', 'google-ml-crash-course'])).toEqual({
      sourceId: 'google-ml-crash-course',
    });
  });

  it('rejects arbitrary URLs so the command cannot become a generic crawler', () => {
    expect(() => parseFetchSourceCommand(['--url', 'https://example.test/article'])).toThrow(
      'Unsupported argument: --url',
    );
  });

  it('rejects scope validation flags because the locked repository inputs are fixed', () => {
    expect(() => parseScopeValidationCommand(['--file', 'other.yaml'])).toThrow(
      'content:scope:validate does not accept arguments.',
    );
  });

  it('requires a stable course ID for transform and validation commands', () => {
    expect(parseCourseCommand(['--course', 'course-classical-ml'], 'content:transform')).toEqual({
      courseId: 'course-classical-ml',
    });
    expect(() => parseCourseCommand(['course-classical-ml'], 'content:validate')).toThrow(
      'content:validate requires exactly --course <courseId>.',
    );
  });
});
