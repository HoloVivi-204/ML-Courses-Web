import {
  ArrowRight,
  BookOpenCheck,
  FlaskConical,
  MousePointer2,
  Play,
  Sparkles,
} from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { CourseCard } from '../catalog/course-card';
import { courses, type Locale } from '../catalog/course-data';

interface LandingPageProps {
  locale: Locale;
}

function XorLabPreview() {
  const { t } = useTranslation();

  return (
    <div className="lab-preview" aria-label={t('landing.lab.ariaLabel')}>
      <div className="lab-titlebar">
        <span className="lab-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <code>pg-xor / perceptron</code>
        <span className="lab-status">{t('landing.lab.status')}</span>
      </div>
      <div className="lab-body">
        <div className="lab-sidebar">
          <span>{t('landing.lab.parameters')}</span>
          <label>
            {t('landing.lab.learningRate')}
            <output>0.05</output>
          </label>
          <div className="lab-range" aria-hidden="true">
            <i style={{ width: '56%' }} />
          </div>
          <label>
            {t('landing.lab.epochs')}
            <output>120</output>
          </label>
          <div className="lab-range" aria-hidden="true">
            <i style={{ width: '72%' }} />
          </div>
          <span className="lab-run-preview">
            <Play aria-hidden="true" fill="currentColor" size={13} />
            {t('landing.lab.run')}
          </span>
        </div>
        <div className="xor-plot">
          <svg viewBox="0 0 520 340" role="img" aria-label={t('landing.lab.chartAlt')}>
            <g className="plot-grid">
              <path d="M56 34V290M56 290H486" />
              <path d="M56 226H486M56 162H486M56 98H486" />
              <path d="M164 34V290M272 34V290M380 34V290" />
            </g>
            <path className="decision-band" d="M80 274L456 54" />
            <path className="decision-line" d="M80 274L456 54" />
            <g className="point point-circle">
              <circle cx="122" cy="86" r="11" />
              <circle cx="154" cy="116" r="8" />
              <circle cx="384" cy="246" r="11" />
              <circle cx="420" cy="218" r="8" />
            </g>
            <g className="point point-square">
              <rect x="111" y="223" width="20" height="20" rx="3" />
              <rect x="150" y="251" width="16" height="16" rx="2" />
              <rect x="372" y="82" width="20" height="20" rx="3" />
              <rect x="410" y="112" width="16" height="16" rx="2" />
            </g>
            <g className="plot-labels">
              <text x="76" y="318">
                0.0
              </text>
              <text x="252" y="318">
                0.5
              </text>
              <text x="454" y="318">
                1.0
              </text>
            </g>
          </svg>
          <div className="lab-insight">
            <Sparkles aria-hidden="true" size={16} />
            <span>
              <strong>{t('landing.lab.insightTitle')}</strong>
              <small>{t('landing.lab.insightBody')}</small>
            </span>
          </div>
        </div>
      </div>
      <div className="lab-footer">
        <span>
          {t('landing.lab.accuracy')} <strong>50%</strong>
        </span>
        <span>
          {t('landing.lab.loss')} <strong>0.69</strong>
        </span>
        <span className="lab-verdict">{t('landing.lab.verdict')}</span>
      </div>
    </div>
  );
}

const methodIcons = [BookOpenCheck, FlaskConical, MousePointer2] as const;

export function LandingPage({ locale }: LandingPageProps) {
  const { t } = useTranslation();

  return (
    <main className="landing-page">
      <section className="hero section-shell">
        <div className="hero-copy reveal-up">
          <span className="eyebrow">{t('landing.eyebrow')}</span>
          <h1>
            <Trans i18nKey="landing.title" components={{ accent: <em />, line: <span /> }} />
          </h1>
          <p className="hero-lede">{t('landing.lede')}</p>
          <div className="hero-actions">
            <Link className="primary-link" to="/courses/course-deep-learning-basic">
              {t('landing.primaryCta')}
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <a className="secondary-link" href="#method">
              <Play aria-hidden="true" size={15} />
              {t('landing.secondaryCta')}
            </a>
          </div>
          <dl className="hero-stats">
            <div>
              <dt>02</dt>
              <dd>{t('landing.stats.courses')}</dd>
            </div>
            <div>
              <dt>12</dt>
              <dd>{t('landing.stats.modules')}</dd>
            </div>
            <div>
              <dt>100%</dt>
              <dd>{t('landing.stats.browser')}</dd>
            </div>
          </dl>
        </div>
        <div className="hero-visual reveal-up delay-one">
          <div className="hero-visual-label" aria-hidden="true">
            <span>LAB / 01</span>
            <i />
            <span>XOR</span>
          </div>
          <XorLabPreview />
          <div className="orbit-note">
            <i aria-hidden="true">↳</i>
            <span>{t('landing.lab.orbitNote')}</span>
          </div>
        </div>
      </section>

      <section className="method-section section-shell" id="method">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t('landing.method.eyebrow')}</span>
            <h2>{t('landing.method.title')}</h2>
          </div>
          <p>{t('landing.method.intro')}</p>
        </div>
        <div className="method-grid">
          {methodIcons.map((Icon, index) => (
            <article key={index} className={index === 1 ? 'is-featured' : ''}>
              <span className="method-number">0{index + 1}</span>
              <Icon aria-hidden="true" size={25} strokeWidth={1.6} />
              <h3>{t(`landing.method.items.${index}.title`)}</h3>
              <p>{t(`landing.method.items.${index}.body`)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="courses-section section-shell" id="courses">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t('landing.courses.eyebrow')}</span>
            <h2>{t('landing.courses.title')}</h2>
          </div>
          <Link className="heading-link" to="/courses">
            {t('landing.courses.all')}
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
        <div className="course-grid">
          {courses.map((course, index) => (
            <CourseCard key={course.id} course={course} index={index} locale={locale} />
          ))}
        </div>
      </section>

      <section className="closing-note section-shell">
        <span aria-hidden="true">∴</span>
        <blockquote>{t('landing.closing.quote')}</blockquote>
        <p>{t('landing.closing.body')}</p>
        <Link to="/courses/course-deep-learning-basic">
          {t('landing.closing.cta')}
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </section>
    </main>
  );
}
