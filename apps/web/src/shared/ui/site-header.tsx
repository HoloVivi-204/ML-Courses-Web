import { Button } from 'antd';
import { Languages, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router-dom';

import type { Locale } from '../../features/catalog/course-data';
import type { Theme } from '../theme/use-theme';

interface SiteHeaderProps {
  locale: Locale;
  onLocaleChange: () => void;
  onThemeChange: () => void;
  theme: Theme;
}

function getNavClassName({ isActive }: { isActive: boolean }): string {
  return isActive ? 'site-nav-link is-active' : 'site-nav-link';
}

export function SiteHeader({ locale, onLocaleChange, onThemeChange, theme }: SiteHeaderProps) {
  const { t } = useTranslation();
  const themeLabel = t(theme === 'dark' ? 'theme.enableLight' : 'theme.enableDark');

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand" to="/" aria-label="ML Path">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="brand-wordmark">
            ML<span>PATH</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label={t('nav.primaryLabel')}>
          <NavLink end className={getNavClassName} to="/">
            {t('nav.home')}
          </NavLink>
          <NavLink className={getNavClassName} to="/courses">
            {t('nav.courses')}
          </NavLink>
          <NavLink className={getNavClassName} to="/dashboard">
            {t('nav.dashboard')}
          </NavLink>
          <a className="site-nav-link" href="/#method">
            {t('nav.method')}
          </a>
        </nav>

        <div className="site-actions">
          <Button
            className="utility-button"
            type="text"
            aria-label={t('locale.switch')}
            icon={<Languages aria-hidden="true" size={17} />}
            onClick={onLocaleChange}
          >
            <span className="utility-label">{locale.toUpperCase()}</span>
          </Button>
          <Button
            className="icon-button"
            type="text"
            aria-label={themeLabel}
            icon={
              theme === 'dark' ? (
                <Sun aria-hidden="true" size={18} />
              ) : (
                <Moon aria-hidden="true" size={18} />
              )
            }
            onClick={onThemeChange}
          />
          <Link className="header-login" to="/login">
            {t('nav.login')}
          </Link>
          <Link className="header-cta" to="/register">
            {t('nav.register')}
          </Link>
        </div>
      </div>
    </header>
  );
}
