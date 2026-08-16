import { Button } from 'antd';
import { Languages, LogOut, Menu, Moon, Sun, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router';

import type { Locale } from '../../features/catalog/course-data';
import type { Theme } from '../theme/use-theme';

interface SiteHeaderProps {
  hasAdminAccess: boolean;
  isAuthenticated: boolean;
  isAuthActionPending: boolean;
  locale: Locale;
  onLocaleChange: () => void;
  onSignOut: () => void;
  onThemeChange: () => void;
  theme: Theme;
}

function getNavClassName({ isActive }: { isActive: boolean }): string {
  return isActive ? 'site-nav-link is-active' : 'site-nav-link';
}

export function SiteHeader({
  hasAdminAccess,
  isAuthenticated,
  isAuthActionPending,
  locale,
  onLocaleChange,
  onSignOut,
  onThemeChange,
  theme,
}: SiteHeaderProps) {
  const { t } = useTranslation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const themeLabel = t(theme === 'dark' ? 'theme.enableLight' : 'theme.enableDark');

  const mobileMenuLabel = t(isMobileNavOpen ? 'nav.closeMenu' : 'nav.openMenu');

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link
          aria-label="ML Path"
          className="brand"
          onClick={() => setIsMobileNavOpen(false)}
          to="/"
        >
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="brand-wordmark">
            ML<span>PATH</span>
          </span>
        </Link>

        <nav
          aria-label={t('nav.primaryLabel')}
          className={isMobileNavOpen ? 'site-nav is-mobile-open' : 'site-nav'}
          id="site-primary-nav"
        >
          <NavLink end className={getNavClassName} onClick={() => setIsMobileNavOpen(false)} to="/">
            {t('nav.home')}
          </NavLink>
          <NavLink
            className={getNavClassName}
            onClick={() => setIsMobileNavOpen(false)}
            to="/courses"
          >
            {t('nav.courses')}
          </NavLink>
          <NavLink
            className={getNavClassName}
            onClick={() => setIsMobileNavOpen(false)}
            to="/dashboard"
          >
            {t('nav.dashboard')}
          </NavLink>
          {isAuthenticated && hasAdminAccess ? (
            <NavLink
              className={getNavClassName}
              onClick={() => setIsMobileNavOpen(false)}
              to="/admin/content"
            >
              {t('nav.admin')}
            </NavLink>
          ) : null}
          <NavLink
            className={getNavClassName}
            onClick={() => setIsMobileNavOpen(false)}
            to="/playground"
          >
            {t('nav.playground')}
          </NavLink>
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
          <Button
            aria-controls="site-primary-nav"
            aria-expanded={isMobileNavOpen}
            aria-label={mobileMenuLabel}
            className="icon-button mobile-menu-toggle"
            icon={
              isMobileNavOpen ? (
                <X aria-hidden="true" size={19} />
              ) : (
                <Menu aria-hidden="true" size={19} />
              )
            }
            onClick={() => setIsMobileNavOpen((currentValue) => !currentValue)}
            type="text"
          />
          {isAuthenticated ? (
            <>
              <Link aria-label={t('nav.profile')} className="header-profile" to="/profile">
                <UserRound aria-hidden="true" size={16} />
                <span>{t('nav.profile')}</span>
              </Link>
              <Button
                aria-label={t('nav.signOut')}
                className="header-logout"
                disabled={isAuthActionPending}
                icon={<LogOut aria-hidden="true" size={16} />}
                onClick={onSignOut}
                type="text"
              >
                {t('nav.signOut')}
              </Button>
            </>
          ) : (
            <>
              <Link className="header-login" to="/login">
                {t('nav.login')}
              </Link>
              <Link className="header-cta" to="/register">
                {t('nav.register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
