import { AlertTriangle, ShieldCheck, Trash2 } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useAuth } from '../auth/auth-context';
import type { AvatarUploadStorageGateway } from '../auth/firebase-avatar-storage-gateway';
import type {
  AvatarContentType,
  LearnerLocalePreference,
  LearnerProfile,
  LearnerThemePreference,
  LearningApiClient,
} from '../learning/learning-api';
import { LearningApiError } from '../learning/learning-api';
import type { Locale } from '../catalog/course-data';

interface ProfilePageProps {
  avatarUploadStorageGateway: AvatarUploadStorageGateway;
  learningApiClient: LearningApiClient;
  locale: Locale;
  onProfilePreferencesLoaded: (profile: LearnerProfile) => void;
  themePreference: LearnerThemePreference;
}

const ACCOUNT_DELETE_CONFIRMATION = 'DELETE';
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const AVATAR_CONTENT_TYPES: readonly AvatarContentType[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

type AvatarUploadStatus = 'failed' | 'idle' | 'saved' | 'uploading';
type DeleteStatus = 'failed' | 'idle' | 'reauthentication-required' | 'submitting';

export function ProfilePage({
  avatarUploadStorageGateway,
  learningApiClient,
  locale,
  onProfilePreferencesLoaded,
  themePreference,
}: ProfilePageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    getIdToken,
    reauthenticateWithGoogle,
    reauthenticateWithPassword,
    signOut,
    updateDisplayName,
    user,
  } = useAuth();
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<'failed' | 'loading' | 'ready'>('loading');
  const [selectedLocale, setSelectedLocale] = useState<LearnerLocalePreference>(locale);
  const [selectedTheme, setSelectedTheme] = useState<LearnerThemePreference>(themePreference);
  const [displayName, setDisplayName] = useState('');
  const [displayNameStatus, setDisplayNameStatus] = useState<
    'idle' | 'failed' | 'saved' | 'saving'
  >('idle');
  const [preferenceStatus, setPreferenceStatus] = useState<'idle' | 'failed' | 'saved' | 'saving'>(
    'idle',
  );
  const [avatarUploadStatus, setAvatarUploadStatus] = useState<AvatarUploadStatus>('idle');
  const [confirmation, setConfirmation] = useState('');
  const [deleteStatus, setDeleteStatus] = useState<DeleteStatus>('idle');
  const [reauthenticationPassword, setReauthenticationPassword] = useState('');
  const [hasReauthenticationError, setHasReauthenticationError] = useState(false);
  const isProfileEditable = profile?.status === 'active';
  const canDelete =
    confirmation.trim() === ACCOUNT_DELETE_CONFIRMATION &&
    deleteStatus !== 'submitting' &&
    deleteStatus !== 'reauthentication-required';
  const providerIds = user?.providerIds ?? [];
  const supportsPasswordReauthentication =
    providerIds.includes('password') || (providerIds.length === 0 && Boolean(user?.email));
  const supportsGoogleReauthentication = providerIds.includes('google.com');

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
          setDisplayName(loadedProfile.displayName);
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

  async function handleSaveDisplayName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedDisplayName = displayName.trim();

    if (!normalizedDisplayName) {
      setDisplayNameStatus('failed');
      return;
    }

    setDisplayNameStatus('saving');

    try {
      if (!(await updateDisplayName(normalizedDisplayName))) {
        throw new Error('Firebase display name update was not accepted.');
      }

      const idToken = await getIdToken(true);

      if (!idToken) {
        throw new Error('Authenticated profile request is missing identity.');
      }

      const updatedProfile = await learningApiClient.bootstrapProfile({
        idToken,
        locale: selectedLocale,
        theme: selectedTheme,
      });

      setProfile(updatedProfile);
      setDisplayName(updatedProfile.displayName);
      onProfilePreferencesLoaded(updatedProfile);
      setDisplayNameStatus('saved');
    } catch {
      setDisplayNameStatus('failed');
    }
  }

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const avatarFile = event.target.files?.[0];

    event.target.value = '';

    if (!avatarFile) {
      return;
    }

    if (
      !isProfileEditable ||
      !isAvatarContentType(avatarFile.type) ||
      avatarFile.size <= 0 ||
      avatarFile.size > MAX_AVATAR_SIZE_BYTES
    ) {
      setAvatarUploadStatus('failed');
      return;
    }

    setAvatarUploadStatus('uploading');

    try {
      const idToken = await getIdToken();

      if (!idToken) {
        throw new Error('Authenticated avatar upload is missing identity.');
      }

      const sha256 = await getFileSha256(avatarFile);
      const uploadSession = await learningApiClient.createAvatarUploadSession({
        contentType: avatarFile.type,
        idToken,
        sha256,
        sizeBytes: avatarFile.size,
      });

      await avatarUploadStorageGateway.uploadAvatar({ file: avatarFile, uploadSession });

      const updatedProfile = await learningApiClient.finalizeAvatarUpload({
        idToken: (await getIdToken(true)) ?? idToken,
        uploadSessionId: uploadSession.uploadSessionId,
      });

      setProfile(updatedProfile);
      onProfilePreferencesLoaded(updatedProfile);
      setAvatarUploadStatus('saved');
    } catch {
      setAvatarUploadStatus('failed');
    }
  }

  async function completeAccountDeletion(forceTokenRefresh = false): Promise<void> {
    const idToken = await getIdToken(forceTokenRefresh);

    if (!idToken) {
      throw new Error('Authenticated profile request is missing identity.');
    }

    await learningApiClient.deleteAccount({ idToken });

    if (!(await signOut())) {
      throw new Error('Local sign-out failed after account deletion.');
    }

    navigate('/login', { replace: true });
  }

  async function handleDeleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canDelete) {
      return;
    }

    setDeleteStatus('submitting');
    setHasReauthenticationError(false);

    try {
      await completeAccountDeletion();
    } catch (error) {
      setDeleteStatus(
        isRecentDeletionAuthenticationError(error) ? 'reauthentication-required' : 'failed',
      );
    }
  }

  async function handlePasswordReauthentication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reauthenticationPassword) {
      return;
    }

    setDeleteStatus('submitting');
    setHasReauthenticationError(false);

    try {
      if (!(await reauthenticateWithPassword(reauthenticationPassword))) {
        throw new Error('Password reauthentication was not accepted.');
      }
    } catch {
      setDeleteStatus('reauthentication-required');
      setHasReauthenticationError(true);
      return;
    }

    setReauthenticationPassword('');

    try {
      await completeAccountDeletion(true);
    } catch (error) {
      setDeleteStatus(
        isRecentDeletionAuthenticationError(error) ? 'reauthentication-required' : 'failed',
      );
    }
  }

  async function handleGoogleReauthentication() {
    setDeleteStatus('submitting');
    setHasReauthenticationError(false);

    try {
      if (!(await reauthenticateWithGoogle())) {
        throw new Error('Google reauthentication was not accepted.');
      }
    } catch {
      setDeleteStatus('reauthentication-required');
      setHasReauthenticationError(true);
      return;
    }

    try {
      await completeAccountDeletion(true);
    } catch (error) {
      setDeleteStatus(
        isRecentDeletionAuthenticationError(error) ? 'reauthentication-required' : 'failed',
      );
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
              <dt>{t('profile.identity.createdAt')}</dt>
              <dd>
                {formatCreatedAt(profile?.createdAt, locale, t('profile.identity.unknownDate'))}
              </dd>
            </div>
          </dl>

          <form className="profile-display-name-form" onSubmit={handleSaveDisplayName}>
            <label htmlFor="profile-display-name">{t('profile.identity.displayName')}</label>
            <input
              disabled={!isProfileEditable || displayNameStatus === 'saving'}
              id="profile-display-name"
              maxLength={100}
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
                setDisplayNameStatus('idle');
              }}
            />
            {displayNameStatus === 'failed' ? (
              <p className="profile-delete-error" role="alert">
                {t('profile.identity.updateError')}
              </p>
            ) : null}
            {displayNameStatus === 'saved' ? (
              <p className="profile-success" role="status">
                {t('profile.identity.updated')}
              </p>
            ) : null}
            <button disabled={!isProfileEditable || displayNameStatus === 'saving'} type="submit">
              {displayNameStatus === 'saving'
                ? t('profile.identity.saving')
                : t('profile.identity.save')}
            </button>
          </form>
        </section>

        <section className="profile-panel">
          <div className="profile-panel-heading">
            <ShieldCheck aria-hidden="true" size={22} />
            <div>
              <h2>{t('profile.preferences.title')}</h2>
              <p>{t('profile.preferences.subtitle')}</p>
            </div>
          </div>

          <div className="profile-avatar">
            {profile?.avatarUrl ? (
              <img
                alt={t('profile.avatar.imageAlt', { displayName: profile.displayName })}
                src={profile.avatarUrl}
              />
            ) : (
              <span aria-label={t('profile.avatar.label')} role="img">
                {getInitials(profile?.displayName ?? t('profile.identity.noName'))}
              </span>
            )}
          </div>

          <label className="profile-avatar-upload" htmlFor="profile-avatar-upload">
            {t('profile.avatar.uploadLabel')}
          </label>
          <input
            accept="image/jpeg,image/png,image/webp"
            disabled={!isProfileEditable || avatarUploadStatus === 'uploading'}
            id="profile-avatar-upload"
            type="file"
            onChange={(event) => {
              void handleAvatarUpload(event);
            }}
          />
          {avatarUploadStatus === 'failed' ? (
            <p className="profile-delete-error" role="alert">
              {t('profile.avatar.uploadError')}
            </p>
          ) : null}
          {avatarUploadStatus === 'saved' ? (
            <p className="profile-success" role="status">
              {t('profile.avatar.uploaded')}
            </p>
          ) : null}
          {avatarUploadStatus === 'uploading' ? (
            <p className="profile-status" role="status">
              {t('profile.avatar.uploading')}
            </p>
          ) : null}

          <form className="profile-preferences-form" onSubmit={handleSavePreferences}>
            <label htmlFor="profile-locale">{t('profile.preferences.locale')}</label>
            <select
              disabled={!isProfileEditable || preferenceStatus === 'saving'}
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
              disabled={!isProfileEditable || preferenceStatus === 'saving'}
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
            <button disabled={!isProfileEditable || preferenceStatus === 'saving'} type="submit">
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
            {profile?.status === 'deletion-pending' ? (
              <p className="profile-status" role="status">
                {t('profile.delete.recovery')}
              </p>
            ) : null}
            {deleteStatus === 'failed' ? (
              <p className="profile-delete-error" role="alert">
                {t('profile.delete.error')}
              </p>
            ) : null}
            <button className="profile-delete-button" disabled={!canDelete} type="submit">
              <Trash2 aria-hidden="true" size={17} />
              {deleteStatus === 'submitting'
                ? t('profile.delete.submitting')
                : t('profile.delete.cta')}
            </button>
          </form>
          {deleteStatus === 'reauthentication-required' ? (
            <section
              className="profile-reauthentication"
              aria-labelledby="profile-reauthentication-title"
            >
              <h3 id="profile-reauthentication-title">{t('profile.delete.reauthTitle')}</h3>
              <p>{t('profile.delete.reauthIntro')}</p>
              {supportsPasswordReauthentication ? (
                <form onSubmit={handlePasswordReauthentication}>
                  <label htmlFor="profile-reauthentication-password">
                    {t('profile.delete.reauthPasswordLabel')}
                  </label>
                  <input
                    autoComplete="current-password"
                    id="profile-reauthentication-password"
                    type="password"
                    value={reauthenticationPassword}
                    onChange={(event) => {
                      setReauthenticationPassword(event.target.value);
                      setHasReauthenticationError(false);
                    }}
                  />
                  <button type="submit">{t('profile.delete.reauthPasswordCta')}</button>
                </form>
              ) : null}
              {supportsGoogleReauthentication ? (
                <button type="button" onClick={() => void handleGoogleReauthentication()}>
                  {t('profile.delete.reauthGoogleCta')}
                </button>
              ) : null}
              {hasReauthenticationError ||
              (!supportsPasswordReauthentication && !supportsGoogleReauthentication) ? (
                <p className="profile-delete-error" role="alert">
                  {t('profile.delete.reauthError')}
                </p>
              ) : null}
            </section>
          ) : null}
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

function isAvatarContentType(value: string): value is AvatarContentType {
  return AVATAR_CONTENT_TYPES.includes(value as AvatarContentType);
}

async function getFileSha256(file: File): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure hashing is unavailable.');
  }

  const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer());

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function isRecentDeletionAuthenticationError(error: unknown): boolean {
  return (
    error instanceof LearningApiError &&
    (error.code === 'ACCOUNT_DELETION_RECOVERY_REQUIRED' ||
      error.code === 'RECENT_SIGN_IN_REQUIRED')
  );
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
