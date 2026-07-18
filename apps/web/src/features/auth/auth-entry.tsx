import { useMemo } from 'react';

import type { Locale } from '../catalog/course-data';
import type { AuthGateway } from './auth-context';
import { AuthPage, type AuthMode } from './auth-page';
import { createFirebaseAuthGateway } from './firebase-auth-gateway';
import { AuthProvider } from './auth-session';

interface AuthEntryProps {
  authGateway?: AuthGateway | undefined;
  locale: Locale;
  mode: AuthMode;
}

export function AuthEntry({ authGateway, locale, mode }: AuthEntryProps) {
  const gateway = useMemo(() => authGateway ?? createFirebaseAuthGateway(), [authGateway]);

  return (
    <AuthProvider gateway={gateway}>
      <AuthPage locale={locale} mode={mode} />
    </AuthProvider>
  );
}
