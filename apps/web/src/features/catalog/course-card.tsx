import { ArrowUpRight, Clock3, Layers3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { localize, type CourseSummary, type Locale } from './course-data';

interface CourseCardProps {
  course: CourseSummary;
  index: number;
  locale: Locale;
}

export function CourseCard({ course, index, locale }: CourseCardProps) {
  const { t } = useTranslation();
  const title = localize(course.title, locale);

  return (
    <Link
      aria-label={t('course.exploreLabel', { title })}
      className={`course-card course-card-${course.tone}`}
      to={`/courses/${course.id}`}
    >
      <div className="course-card-index" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </div>
      <div className="course-card-content">
        <span className="course-kicker">{localize(course.eyebrow, locale)}</span>
        <h3>{title}</h3>
        <p>{localize(course.description, locale)}</p>
        <div className="course-meta">
          <span>
            <Layers3 aria-hidden="true" size={16} />
            {t('course.moduleCount', { count: course.moduleCount })}
          </span>
          <span>
            <Clock3 aria-hidden="true" size={16} />
            {t('course.hourCount', { count: course.durationHours })}
          </span>
        </div>
        <span className="course-link">
          {t('course.explore')}
          <ArrowUpRight aria-hidden="true" size={18} />
        </span>
      </div>
    </Link>
  );
}
