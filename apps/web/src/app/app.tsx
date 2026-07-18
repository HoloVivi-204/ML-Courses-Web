import { ConfigProvider, theme as antTheme } from 'antd';
import { lazy, Suspense, useEffect, useMemo } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { CourseCatalogPage, CoursePage, RouteNotFoundPage } from '../features/catalog/catalog-page';
import type { Locale } from '../features/catalog/course-data';
import type { AuthGateway } from '../features/auth/auth-context';
import { LandingPage } from '../features/landing/landing-page';
import { createAppI18n } from '../shared/i18n/i18n';
import { useTheme } from '../shared/theme/use-theme';
import { SiteHeader } from '../shared/ui/site-header';

const TrialPostPage = lazy(async () => {
  const module = await import('../features/learning/trial-post-page');

  return { default: module.TrialPostPage };
});

const AuthEntry = lazy(async () => {
  const module = await import('../features/auth/auth-entry');

  return { default: module.AuthEntry };
});

interface AppRoutesProps {
  authGateway?: AuthGateway | undefined;
}

function AppRoutes({ authGateway }: AppRoutesProps) {
  const { i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const locale: Locale = i18n.resolvedLanguage === 'en' ? 'en' : 'vi';

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem('ml-path-locale', locale);
  }, [locale]);

  async function switchLocale() {
    await i18n.changeLanguage(locale === 'vi' ? 'en' : 'vi');
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: theme === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          borderRadius: 6,
          colorPrimary: theme === 'dark' ? '#63d4cd' : '#06736f',
          fontFamily: "'Be Vietnam Pro', sans-serif",
        },
      }}
    >
      <BrowserRouter>
        <div className="app-shell">
          <SiteHeader
            locale={locale}
            onLocaleChange={switchLocale}
            onThemeChange={toggleTheme}
            theme={theme}
          />
          <Routes>
            <Route path="/" element={<LandingPage locale={locale} />} />
            <Route
              path="/login"
              element={
                <Suspense fallback={<AuthRouteLoading />}>
                  <AuthEntry authGateway={authGateway} locale={locale} mode="sign-in" />
                </Suspense>
              }
            />
            <Route
              path="/register"
              element={
                <Suspense fallback={<AuthRouteLoading />}>
                  <AuthEntry authGateway={authGateway} locale={locale} mode="sign-up" />
                </Suspense>
              }
            />
            <Route path="/courses" element={<CourseCatalogPage locale={locale} />} />
            <Route path="/courses/:courseId" element={<CoursePage locale={locale} />} />
            <Route
              path="/learn/:courseId/posts/:postId"
              element={
                <Suspense fallback={<TrialRouteLoading />}>
                  <TrialPostPage locale={locale} />
                </Suspense>
              }
            />
            <Route path="*" element={<RouteNotFoundPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ConfigProvider>
  );
}

function TrialRouteLoading() {
  const { t } = useTranslation();

  return (
    <main className="route-loading page-shell" role="status">
      {t('route.loading')}
    </main>
  );
}

function AuthRouteLoading() {
  return <main className="route-loading page-shell" role="status" />;
}

interface AppProps {
  authGateway?: AuthGateway | undefined;
}

export function App({ authGateway }: AppProps) {
  const i18n = useMemo(() => createAppI18n(), []);

  return (
    <I18nextProvider i18n={i18n}>
      <AppRoutes authGateway={authGateway} />
    </I18nextProvider>
  );
}
