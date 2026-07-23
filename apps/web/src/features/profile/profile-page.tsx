import { AlertTriangle, ShieldCheck, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/auth-context';
import type { LearningApiClient } from '../learning/learning-api';

interface ProfilePageProps {
  learningApiClient: LearningApiClient;
}

const ACCOUNT_DELETE_CONFIRMATION = 'DELETE';

export function ProfilePage({ learningApiClient }: ProfilePageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getIdToken, signOut, user } = useAuth();
  const [confirmation, setConfirmation] = useState('');
  const [status, setStatus] = useState<'idle' | 'failed' | 'submitting'>('idle');
  const canDelete = confirmation.trim() === ACCOUNT_DELETE_CONFIRMATION && status !== 'submitting';

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
              <dt>{t('profile.identity.email')}</dt>
              <dd>{user?.email ?? t('profile.identity.noEmail')}</dd>
            </div>
            <div>
              <dt>{t('profile.identity.uid')}</dt>
              <dd>
                <code>{user?.uid}</code>
              </dd>
            </div>
          </dl>
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
