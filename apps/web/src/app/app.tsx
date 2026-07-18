import { ConfigProvider, theme as antTheme } from 'antd';
import { lazy, Suspense, useEffect, useMemo } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { CourseCatalogPage, CoursePage, RouteNotFoundPage } from '../features/catalog/catalog-page';
import type { Locale } from '../features/catalog/course-data';
import { LandingPage } from '../features/landing/landing-page';
import { createAppI18n } from '../shared/i18n/i18n';
import { useTheme } from '../shared/theme/use-theme';
import { SiteHeader } from '../shared/ui/site-header';

const TrialPostPage = lazy(async () => {
  const module = await import('../features/learning/trial-post-page');

  return { default: module.TrialPostPage };
});

function AppRoutes() {
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

export function App() {
  const i18n = useMemo(() => createAppI18n(), []);

  return (
    <I18nextProvider i18n={i18n}>
      <AppRoutes />
    </I18nextProvider>
  );
}
