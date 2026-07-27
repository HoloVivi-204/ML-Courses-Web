import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

interface FirebaseHeader {
  key: string;
  value: string;
}

interface FirebaseHostingConfig {
  headers?: Array<{
    headers: FirebaseHeader[];
    source: string;
  }>;
}

async function getHostingHeaders(): Promise<Map<string, string>> {
  const firebaseConfig = JSON.parse(
    await readFile(new URL('../../../firebase.json', import.meta.url), 'utf8'),
  ) as { hosting: FirebaseHostingConfig };
  const globalHeaders = firebaseConfig.hosting.headers?.find(({ source }) => source === '**');

  return new Map(globalHeaders?.headers.map(({ key, value }) => [key, value]));
}

describe('Firebase Hosting security headers', () => {
  it('allows required OAuth, reCAPTCHA, font, Worker, and API browser capabilities', async () => {
    const headers = await getHostingHeaders();
    const contentSecurityPolicy = headers.get('Content-Security-Policy') ?? '';

    expect(contentSecurityPolicy).toContain("default-src 'self'");
    expect(contentSecurityPolicy).toContain("script-src 'self'");
    expect(contentSecurityPolicy).toContain("img-src 'self' data: blob:");
    expect(contentSecurityPolicy).toContain('https://accounts.google.com');
    expect(contentSecurityPolicy).toContain('https://www.gstatic.com');
    expect(contentSecurityPolicy).toContain('https://www.google.com/recaptcha/');
    expect(contentSecurityPolicy).toContain("font-src 'self' data:");
    expect(contentSecurityPolicy).toContain("worker-src 'self' blob:");
    expect(contentSecurityPolicy).toContain("connect-src 'self'");
    expect(contentSecurityPolicy).toContain("frame-src 'self'");
    expect(headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin-allow-popups');
    expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains');
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('X-Frame-Options')).toBe('DENY');
  });
});
