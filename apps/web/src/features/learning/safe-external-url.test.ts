import { describe, expect, it } from 'vitest';

import { getSafeExternalUrl } from './safe-external-url';

describe('safe external URL', () => {
  it('allows only credential-free HTTPS URLs', () => {
    expect(getSafeExternalUrl('https://example.test/lesson')?.href).toBe(
      'https://example.test/lesson',
    );
    expect(getSafeExternalUrl('http://example.test/lesson')).toBeNull();
    expect(getSafeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(getSafeExternalUrl('https://learner:secret@example.test/lesson')).toBeNull();
  });
});
