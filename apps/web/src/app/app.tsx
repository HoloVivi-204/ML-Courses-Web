import { ConfigProvider, theme as antTheme } from 'antd';
import { lazy, type ReactNode, Suspense, useEffect, useMemo } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { CourseCatalogPage, CoursePage, RouteNotFoundPage } from '../features/catalog/catalog-page';
import type { Locale } from '../features/catalog/course-data';
import type { AuthGateway } from '../features/auth/auth-context';
import { useAuth } from '../features/auth/auth-context';
import { createFirebaseAuthGateway } from '../features/auth/firebase-auth-gateway';
import { AuthProvider } from '../features/auth/auth-session';
import { LandingPage } from '../features/landing/landing-page';
import {
  createFetchLearningApiClient,
  type LearningApiClient,
} from '../features/learning/learning-api';
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

const LearningCoursePage = lazy(async () => {
  const module = await import('../features/learning/learning-course-page');

  return { default: module.LearningCoursePage };
});

const LearningDemoPage = lazy(async () => {
  const module = await import('../features/learning/learning-demo-page');

  return { default: module.LearningDemoPage };
});

const LearningQuizPage = lazy(async () => {
  const module = await import('../features/learning/learning-quiz-page');

  return { default: module.LearningQuizPage };
});

const PlaygroundPage = lazy(async () => {
  const module = await import('../features/playground/playground-page');

  return { default: module.PlaygroundPage };
});

interface AppRoutesProps {
  authGateway?: AuthGateway | undefined;
  learningApiClient?: LearningApiClient | undefined;
}

function AppRoutes({ authGateway, learningApiClient }: AppRoutesProps) {
  const { i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const locale: Locale = i18n.resolvedLanguage === 'en' ? 'en' : 'vi';
  const gateway = useMemo(() => authGateway ?? createFirebaseAuthGateway(), [authGateway]);
  const learningClient = useMemo(
    () => learningApiClient ?? createFetchLearningApiClient(),
    [learningApiClient],
  );

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
      <AuthProvider gateway={gateway}>
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
                    <AuthEntry learningApiClient={learningClient} locale={locale} mode="sign-in" />
                  </Suspense>
                }
              />
              <Route
                path="/register"
                element={
                  <Suspense fallback={<AuthRouteLoading />}>
                    <AuthEntry learningApiClient={learningClient} locale={locale} mode="sign-up" />
                  </Suspense>
                }
              />
              <Route path="/courses" element={<CourseCatalogPage locale={locale} />} />
              <Route path="/courses/:courseId" element={<CoursePage locale={locale} />} />
              <Route
                path="/learn/:courseId"
                element={
                  <RequireAuthenticated>
                    <Suspense fallback={<TrialRouteLoading />}>
                      <LearningCoursePage learningApiClient={learningClient} locale={locale} />
                    </Suspense>
                  </RequireAuthenticated>
                }
              />
              <Route
                path="/learn/:courseId/posts/:postId"
                element={
                  <Suspense fallback={<TrialRouteLoading />}>
                    <TrialPostPage locale={locale} />
                  </Suspense>
                }
              />
              <Route
                path="/learn/:courseId/demos/:demoId"
                element={
                  <RequireAuthenticated>
                    <Suspense fallback={<TrialRouteLoading />}>
                      <LearningDemoPage learningApiClient={learningClient} locale={locale} />
                    </Suspense>
                  </RequireAuthenticated>
                }
              />
              <Route
                path="/learn/:courseId/quizzes/:quizId"
                element={
                  <RequireAuthenticated>
                    <Suspense fallback={<TrialRouteLoading />}>
                      <LearningQuizPage learningApiClient={learningClient} locale={locale} />
                    </Suspense>
                  </RequireAuthenticated>
                }
              />
              <Route
                path="/playground/:scenarioId"
                element={
                  <RequireAuthenticated>
                    <Suspense fallback={<TrialRouteLoading />}>
                      <PlaygroundPage learningApiClient={learningClient} locale={locale} />
                    </Suspense>
                  </RequireAuthenticated>
                }
              />
              <Route path="*" element={<RouteNotFoundPage />} />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}

interface RequireAuthenticatedProps {
  children: ReactNode;
}

function RequireAuthenticated({ children }: RequireAuthenticatedProps) {
  const location = useLocation();
  const { status } = useAuth();

  if (status === 'loading') {
    return <TrialRouteLoading />;
  }

  if (status === 'anonymous') {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;

    return <Navigate replace to={`/login?returnTo=${encodeURIComponent(returnTo)}`} />;
  }

  return children;
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
  learningApiClient?: LearningApiClient | undefined;
}

export function App({ authGateway, learningApiClient }: AppProps) {
  const i18n = useMemo(() => createAppI18n(), []);

  return (
    <I18nextProvider i18n={i18n}>
      <AppRoutes authGateway={authGateway} learningApiClient={learningApiClient} />
    </I18nextProvider>
  );
}
