import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { createAppI18n } from '../../shared/i18n/i18n';
import { LandingPage } from './landing-page';

describe('LandingPage', () => {
  it('scrolls to the method section when opened with the method hash', () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();

    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      render(
        <I18nextProvider i18n={createAppI18n()}>
          <MemoryRouter initialEntries={['/#method']}>
            <LandingPage locale="vi" />
          </MemoryRouter>
        </I18nextProvider>,
      );

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        value: originalScrollIntoView,
      });
    }
  });
});
