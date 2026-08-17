import { ArrowLeft, ArrowRight, Clock3, LockKeyhole, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { formatLessonLabel, formatPracticeLabel } from '../../shared/user-facing-labels';
import { CourseCard } from './course-card';
import { courses, getCourse, localize, type Locale } from './course-data';

interface LocaleProps {
  locale: Locale;
}

export function CourseCatalogPage({ locale }: LocaleProps) {
  const { t } = useTranslation();

  return (
    <main className="catalog-page page-shell">
      <header className="catalog-heading">
        <span className="eyebrow">{t('catalog.eyebrow')}</span>
        <h1>{t('catalog.title')}</h1>
        <p>{t('catalog.intro')}</p>
      </header>
      <div className="course-grid catalog-grid">
        {courses.map((course, index) => (
          <CourseCard key={course.id} course={course} index={index} locale={locale} />
        ))}
      </div>
      <aside className="catalog-principle">
        <Sparkles aria-hidden="true" size={20} />
        <div>
          <strong>{t('catalog.principleTitle')}</strong>
          <p>{t('catalog.principleBody')}</p>
        </div>
      </aside>
    </main>
  );
}

export function CoursePage({ locale }: LocaleProps) {
  const { t } = useTranslation();
  const { status } = useAuth();
  const { courseId } = useParams();
  const course = getCourse(courseId);

  if (!course) {
    return <CourseNotFoundPage />;
  }

  const title = localize(course.title, locale);

  return (
    <main className="course-page">
      <section className={`course-hero course-hero-${course.tone}`}>
        <div className="page-shell course-hero-inner">
          <div className="course-hero-copy reveal-up">
            <Link className="breadcrumb-link" to="/courses">
              <ArrowLeft aria-hidden="true" size={16} />
              {t('course.back')}
            </Link>
            <span className="eyebrow">{localize(course.eyebrow, locale)}</span>
            <h1>{title}</h1>
            <p>{localize(course.description, locale)}</p>
            <div className="course-hero-meta">
              <span>{t('course.moduleCount', { count: course.moduleCount })}</span>
              <i aria-hidden="true" />
              <span>{t('course.postCount', { count: course.postCount })}</span>
              <i aria-hidden="true" />
              <span>{t('course.hourCount', { count: course.durationHours })}</span>
            </div>
            {course.modules?.[0] ? (
              <a className="primary-link" href="#module-01">
                {t('course.viewRoadmap')}
                <ArrowRight aria-hidden="true" size={18} />
              </a>
            ) : null}
            {status === 'authenticated' ? (
              <Link className="secondary-link" to={`/learn/${course.id}`}>
                {t('course.openLearningPath')}
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
            ) : null}
          </div>
          <div className="course-signal" aria-hidden="true">
            <div className="signal-axis signal-axis-x" />
            <div className="signal-axis signal-axis-y" />
            <span className="signal-node node-one">01</span>
            <span className="signal-node node-two">02</span>
            <span className="signal-node node-three">03</span>
            <svg viewBox="0 0 440 300">
              <path d="M65 224C135 48 276 34 376 98" />
              <path d="M65 224C205 254 310 210 376 98" />
            </svg>
          </div>
        </div>
      </section>

      <section className="roadmap page-shell">
        <div className="roadmap-heading">
          <div>
            <span className="eyebrow">{t('course.roadmapEyebrow')}</span>
            <h2>{t('course.roadmapTitle')}</h2>
          </div>
          <p>{t('course.roadmapIntro')}</p>
        </div>

        {course.modules?.length ? (
          <div className="module-list">
            {course.modules.map((module, index) => {
              const isFirstModule = index === 0;

              return (
                <Link
                  aria-label={
                    isFirstModule
                      ? t('learning.moduleRoadmap.open')
                      : localize(module.title, locale)
                  }
                  className={isFirstModule ? 'module-row is-first' : 'module-row'}
                  id={`module-${String(module.index).padStart(2, '0')}`}
                  key={module.id}
                  to={`/learn/${course.id}/modules/${module.id}`}
                >
                  <div className="module-index">
                    <span>{String(module.index).padStart(2, '0')}</span>
                    <i aria-hidden="true" />
                  </div>
                  <div className="module-content">
                    <div className="module-title-row">
                      <div>
                        <h3>{localize(module.title, locale)}</h3>
                      </div>
                      <span className={isFirstModule ? 'module-state open' : 'module-state'}>
                        {isFirstModule ? (
                          <Sparkles aria-hidden="true" size={14} />
                        ) : (
                          <LockKeyhole aria-hidden="true" size={14} />
                        )}
                        {t(isFirstModule ? 'course.trialState' : 'course.sequenceState')}
                      </span>
                    </div>
                    <p>{localize(module.description, locale)}</p>
                    {isFirstModule ? (
                      <span className="module-trial-link">
                        {t('learning.moduleRoadmap.open')}
                        <ArrowRight aria-hidden="true" size={17} />
                      </span>
                    ) : null}
                    <div className="module-facts">
                      <span>
                        <Clock3 aria-hidden="true" size={15} />
                        {t('course.minuteCount', { count: module.durationMinutes })}
                      </span>
                      {module.postIds.map((postId, postIndex) => (
                        <span key={postId}>{formatLessonLabel(postIndex + 1, locale)}</span>
                      ))}
                      {module.demoId ? <span>{formatPracticeLabel(locale)}</span> : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="roadmap-empty">
            <h3>{t('course.roadmapPendingTitle')}</h3>
            <p>{t('course.roadmapPendingBody')}</p>
          </div>
        )}
      </section>
    </main>
  );
}

export function CourseNotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className="not-found page-shell">
      <span aria-hidden="true">404 / COURSE</span>
      <h1>{t('course.notFound.title')}</h1>
      <p>{t('course.notFound.body')}</p>
      <Link className="primary-link" to="/courses">
        {t('course.notFound.back')}
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </main>
  );
}

export function RouteNotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className="not-found page-shell">
      <span aria-hidden="true">404 / ROUTE</span>
      <h1>{t('route.notFound.title')}</h1>
      <p>{t('route.notFound.body')}</p>
      <Link className="primary-link" to="/">
        {t('route.notFound.back')}
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </main>
  );
}
