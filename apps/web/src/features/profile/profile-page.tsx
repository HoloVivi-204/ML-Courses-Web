import { AlertTriangle, ShieldCheck, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useAuth } from '../auth/auth-context';
import type {
  LearnerLocalePreference,
  LearnerProfile,
  LearnerThemePreference,
  LearningApiClient,
} from '../learning/learning-api';
import type { Locale } from '../catalog/course-data';

interface ProfilePageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
  onProfilePreferencesLoaded: (profile: LearnerProfile) => void;
  themePreference: LearnerThemePreference;
}

const ACCOUNT_DELETE_CONFIRMATION = 'DELETE';

export function ProfilePage({
  learningApiClient,
  locale,
  onProfilePreferencesLoaded,
  themePreference,
}: ProfilePageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getIdToken, signOut, user } = useAuth();
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<'failed' | 'loading' | 'ready'>('loading');
  const [selectedLocale, setSelectedLocale] = useState<LearnerLocalePreference>(locale);
  const [selectedTheme, setSelectedTheme] = useState<LearnerThemePreference>(themePreference);
  const [preferenceStatus, setPreferenceStatus] = useState<'idle' | 'failed' | 'saved' | 'saving'>(
    'idle',
  );
  const [confirmation, setConfirmation] = useState('');
  const [status, setStatus] = useState<'idle' | 'failed' | 'submitting'>('idle');
  const canDelete = confirmation.trim() === ACCOUNT_DELETE_CONFIRMATION && status !== 'submitting';

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      try {
        const idToken = await getIdToken();

        if (!idToken) {
          throw new Error('Authenticated profile request is missing identity.');
        }

        const loadedProfile = await learningApiClient.bootstrapProfile({
          idToken,
          locale,
          theme: themePreference,
        });

        if (isActive) {
          setProfile(loadedProfile);
          setSelectedLocale(loadedProfile.locale);
          setSelectedTheme(loadedProfile.theme);
          onProfilePreferencesLoaded(loadedProfile);
          setProfileStatus('ready');
        }
      } catch {
        if (isActive) {
          setProfileStatus('failed');
        }
      }
    }

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, [getIdToken, learningApiClient, locale, onProfilePreferencesLoaded, themePreference]);

  async function handleSavePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreferenceStatus('saving');

    try {
      const idToken = await getIdToken();

      if (!idToken) {
        throw new Error('Authenticated profile request is missing identity.');
      }

      const updatedProfile = await learningApiClient.updatePreferences({
        idToken,
        locale: selectedLocale,
        theme: selectedTheme,
      });

      setProfile(updatedProfile);
      onProfilePreferencesLoaded(updatedProfile);
      setPreferenceStatus('saved');
    } catch {
      setPreferenceStatus('failed');
    }
  }

  async function handleDeleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canDelete) {
      return;
    }

    setStatus('submitting');

    try {
      const idToken = await getIdToken();

      if (!idToken) {
        throw new Error('Authenticated profile request is missing identity.');
      }

      await learningApiClient.deleteAccount({ idToken });

      if (!(await signOut())) {
        throw new Error('Local sign-out failed after account deletion.');
      }

      navigate('/login', { replace: true });
    } catch {
      setStatus('failed');
    }
  }

  return (
    <main className="profile-page page-shell">
      <section className="profile-heading">
        <span className="eyebrow">{t('profile.eyebrow')}</span>
        <h1>{t('profile.title')}</h1>
        <p>{t('profile.intro')}</p>
      </section>

      {profileStatus === 'loading' ? (
        <p className="profile-status" role="status">
          {t('profile.loading')}
        </p>
      ) : null}
      {profileStatus === 'failed' ? (
        <p className="profile-delete-error" role="alert">
          {t('profile.loadError')}
        </p>
      ) : null}

      <div className="profile-grid">
        <section className="profile-panel">
          <div className="profile-panel-heading">
            <ShieldCheck aria-hidden="true" size={22} />
            <div>
              <h2>{t('profile.identity.title')}</h2>
              <p>{t('profile.identity.subtitle')}</p>
            </div>
          </div>

          <dl className="profile-identity-list">
            <div>
              <dt>{t('profile.identity.displayName')}</dt>
              <dd>{profile?.displayName ?? t('profile.identity.noName')}</dd>
            </div>
            <div>
              <dt>{t('profile.identity.email')}</dt>
              <dd>{user?.email ?? t('profile.identity.noEmail')}</dd>
            </div>
            <div>
              <dt>{t('profile.identity.uid')}</dt>
              <dd>
                <code>{user?.uid}</code>
              </dd>
            </div>
            <div>
              <dt>{t('profile.identity.createdAt')}</dt>
              <dd>
                {formatCreatedAt(profile?.createdAt, locale, t('profile.identity.unknownDate'))}
              </dd>
            </div>
          </dl>
        </section>

        <section className="profile-panel">
          <div className="profile-panel-heading">
            <ShieldCheck aria-hidden="true" size={22} />
            <div>
              <h2>{t('profile.preferences.title')}</h2>
              <p>{t('profile.preferences.subtitle')}</p>
            </div>
          </div>

          <div className="profile-avatar" aria-label={t('profile.avatar.label')} role="img">
            {getInitials(profile?.displayName ?? t('profile.identity.noName'))}
          </div>

          <form className="profile-preferences-form" onSubmit={handleSavePreferences}>
            <label htmlFor="profile-locale">{t('profile.preferences.locale')}</label>
            <select
              id="profile-locale"
              value={selectedLocale}
              onChange={(event) => {
                setSelectedLocale(event.target.value as LearnerLocalePreference);
                setPreferenceStatus('idle');
              }}
            >
              <option value="vi">{t('profile.preferences.localeVi')}</option>
              <option value="en">{t('profile.preferences.localeEn')}</option>
            </select>

            <label htmlFor="profile-theme">{t('profile.preferences.theme')}</label>
            <select
              id="profile-theme"
              value={selectedTheme}
              onChange={(event) => {
                setSelectedTheme(event.target.value as LearnerThemePreference);
                setPreferenceStatus('idle');
              }}
            >
              <option value="light">{t('profile.preferences.themeLight')}</option>
              <option value="dark">{t('profile.preferences.themeDark')}</option>
              <option value="system">{t('profile.preferences.themeSystem')}</option>
            </select>

            {preferenceStatus === 'failed' ? (
              <p className="profile-delete-error" role="alert">
                {t('profile.preferences.error')}
              </p>
            ) : null}
            {preferenceStatus === 'saved' ? (
              <p className="profile-success" role="status">
                {t('profile.preferences.saved')}
              </p>
            ) : null}
            <button disabled={preferenceStatus === 'saving'} type="submit">
              {preferenceStatus === 'saving'
                ? t('profile.preferences.saving')
                : t('profile.preferences.save')}
            </button>
          </form>
        </section>

        <section className="profile-panel profile-danger-panel">
          <div className="profile-panel-heading">
            <AlertTriangle aria-hidden="true" size={22} />
            <div>
              <h2>{t('profile.delete.title')}</h2>
              <p>{t('profile.delete.subtitle')}</p>
            </div>
          </div>

          <form className="profile-delete-form" onSubmit={handleDeleteAccount}>
            <label htmlFor="account-delete-confirmation">{t('profile.delete.confirmLabel')}</label>
            <input
              id="account-delete-confirmation"
              autoComplete="off"
              spellCheck={false}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            {status === 'failed' ? (
              <p className="profile-delete-error" role="alert">
                {t('profile.delete.error')}
              </p>
            ) : null}
            <button className="profile-delete-button" disabled={!canDelete} type="submit">
              <Trash2 aria-hidden="true" size={17} />
              {status === 'submitting' ? t('profile.delete.submitting') : t('profile.delete.cta')}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function getInitials(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatCreatedAt(value: string | undefined, locale: Locale, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime())
    ? fallback
    : new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
        dateStyle: 'medium',
      }).format(parsedDate);
}
