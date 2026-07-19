import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../auth/auth-context';
import { getCourse, localize, type Locale } from '../catalog/course-data';
import { rememberLearningAccessGrant } from './learning-access-store';
import type { LearningApiClient } from './learning-api';

interface LearningCoursePageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
}

type EnrollmentStatus = 'failed' | 'ready' | 'syncing';

function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function LearningCoursePage({ learningApiClient, locale }: LearningCoursePageProps) {
  const { t } = useTranslation();
  const { getIdToken, user } = useAuth();
  const { courseId } = useParams();
  const course = getCourse(courseId);
  const firstModule = course?.modules?.[0];
  const idempotencyKey = useRef(createIdempotencyKey());
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus>('syncing');

  useEffect(() => {
    if (!course) {
      return undefined;
    }

    const selectedCourse = course;
    let isActive = true;

    async function enroll() {
      setEnrollmentStatus('syncing');

      try {
        const idToken = await getIdToken();

        if (!idToken || !user) {
          throw new Error('Authenticated user is missing an ID token or user identity.');
        }

        const enrollmentResult = await learningApiClient.enrollCourse({
          courseId: selectedCourse.id,
          idToken,
          idempotencyKey: idempotencyKey.current,
        });

        rememberLearningAccessGrant({
          courseId: selectedCourse.id,
          moduleId: enrollmentResult.access.moduleId,
          postId: enrollmentResult.access.postId,
          uid: user.uid,
        });

        if (isActive) {
          setEnrollmentStatus('ready');
        }
      } catch {
        if (isActive) {
          setEnrollmentStatus('failed');
        }
      }
    }

    void enroll();

    return () => {
      isActive = false;
    };
  }, [course, getIdToken, learningApiClient, user]);

  if (!course || !firstModule) {
    return (
      <main className="not-found page-shell">
        <span aria-hidden="true">404 / LEARNING</span>
        <h1>{t('learning.notFound.title')}</h1>
        <p>{t('learning.notFound.body')}</p>
        <Link className="primary-link" to="/courses">
          {t('learning.notFound.back')}
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </main>
    );
  }

  return (
    <main className="learning-course-page page-shell">
      <Link className="breadcrumb-link" to={`/courses/${course.id}`}>
        <ArrowLeft aria-hidden="true" size={16} />
        {t('learning.backToCourse')}
      </Link>

      <section className="learning-course-card">
        <span className="eyebrow">{t('learning.eyebrow')}</span>
        <h1>{t('learning.title', { title: localize(course.title, locale) })}</h1>
        <p>{t('learning.intro')}</p>

        <p className="learning-sync-state" role="status">
          {t(`learning.enrollment.${enrollmentStatus}`)}
        </p>

        <div className="learning-open-module">
          <span className="module-state open">
            <Sparkles aria-hidden="true" size={14} />
            {t('learning.firstModuleState')}
          </span>
          <h2>{localize(firstModule.title, locale)}</h2>
          <p>{localize(firstModule.description, locale)}</p>
          <Link className="primary-link" to={`/learn/${course.id}/posts/${firstModule.postId}`}>
            {t('learning.openFirstPost')}
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
