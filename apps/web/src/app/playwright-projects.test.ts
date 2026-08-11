import { describe, expect, it } from 'vitest';

import playwrightConfig from '../../playwright.config';

describe('Playwright browser coverage', () => {
  it('keeps Firefox and WebKit smoke projects in the local release gate', () => {
    const projectNames = (playwrightConfig.projects ?? []).map((project) => project.name);

    expect(projectNames).toEqual(expect.arrayContaining(['firefox-smoke', 'webkit-smoke']));
  });
});
