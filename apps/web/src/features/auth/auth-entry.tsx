import type { Locale } from '../catalog/course-data';
import type {
  LearnerProfile,
  LearnerThemePreference,
  LearningApiClient,
} from '../learning/learning-api';
import { AuthPage, type AuthMode } from './auth-page';

interface AuthEntryProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
  mode: AuthMode;
  onProfilePreferencesLoaded: (profile: LearnerProfile) => void;
  themePreference: LearnerThemePreference;
}

export function AuthEntry({
  learningApiClient,
  locale,
  mode,
  onProfilePreferencesLoaded,
  themePreference,
}: AuthEntryProps) {
  return (
    <AuthPage
      learningApiClient={learningApiClient}
      locale={locale}
      mode={mode}
      onProfilePreferencesLoaded={onProfilePreferencesLoaded}
      themePreference={themePreference}
    />
  );
}
