import type { Locale } from '../catalog/course-data';
import type { LearningApiClient } from '../learning/learning-api';
import { AuthPage, type AuthMode } from './auth-page';

interface AuthEntryProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
  mode: AuthMode;
}

export function AuthEntry({ learningApiClient, locale, mode }: AuthEntryProps) {
  return <AuthPage learningApiClient={learningApiClient} locale={locale} mode={mode} />;
}
