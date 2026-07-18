import { ArrowLeft, BookOpenText, Clock3, Lightbulb, MoveRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { localize, type Locale } from '../catalog/course-data';
import { NeuronDecisionLab } from './neuron-decision-lab';
import { getTrialPost } from './trial-post-data';

interface TrialPostPageProps {
  locale: Locale;
}

export function TrialPostPage({ locale }: TrialPostPageProps) {
  const { t } = useTranslation();
  const { courseId, postId } = useParams();
  const post = getTrialPost(courseId, postId);

  if (!post) {
    return <TrialPostNotFoundPage />;
  }

  return (
    <main className="trial-post-page page-shell">
      <Link className="breadcrumb-link" to={`/courses/${post.courseId}`}>
        <ArrowLeft aria-hidden="true" size={16} />
        {t('trial.backToCourse')}
      </Link>
      <header className="trial-post-heading">
        <div className="trial-post-kicker">
          <span className="eyebrow">{t('trial.eyebrow')}</span>
          <span className="trial-post-duration">
            <Clock3 aria-hidden="true" size={15} />
            {t('trial.duration', { count: post.durationMinutes })}
          </span>
        </div>
        <h1>{localize(post.title, locale)}</h1>
        <p>{localize(post.description, locale)}</p>
        <div className="trial-post-identity" aria-label={t('trial.identityLabel')}>
          <span>{post.moduleId}</span>
          <MoveRight aria-hidden="true" size={15} />
          <strong>{post.id}</strong>
        </div>
      </header>

      <div className="trial-reading-layout">
        <aside className="trial-contents">
          <nav aria-label={t('trial.contentsLabel')}>
            <span className="trial-contents-title">
              <BookOpenText aria-hidden="true" size={17} />
              {t('trial.contentsTitle')}
            </span>
            <ol>
              <li>
                <a href="#what-is-a-neuron">{t('trial.contents.neuron')}</a>
              </li>
              <li>
                <a href="#weighted-sum">{t('trial.contents.weights')}</a>
              </li>
              <li>
                <a href="#try-it">{t('trial.contents.lab')}</a>
              </li>
              <li>
                <a href="#read-result">{t('trial.contents.result')}</a>
              </li>
            </ol>
          </nav>
        </aside>

        <article className="trial-article">
          <section id="what-is-a-neuron" className="lesson-section">
            <span className="lesson-section-index">01</span>
            <h2>{t('trial.article.neuron.title')}</h2>
            <p className="lesson-lede">{t('trial.article.neuron.lede')}</p>
            <p>{t('trial.article.neuron.body')}</p>

            <div
              className="neuron-story"
              aria-label={t('trial.article.neuron.diagramLabel')}
              role="img"
            >
              <div className="neuron-story-signal">
                <span>x₁</span>
                <small>{t('trial.article.neuron.signalOne')}</small>
              </div>
              <i aria-hidden="true" />
              <div className="neuron-story-core">Σ</div>
              <i aria-hidden="true" />
              <div className="neuron-story-signal is-output">
                <span>ŷ</span>
                <small>{t('trial.article.neuron.decision')}</small>
              </div>
            </div>

            <aside className="lesson-insight">
              <Lightbulb aria-hidden="true" size={21} />
              <div>
                <strong>{t('trial.article.neuron.insightTitle')}</strong>
                <p>{t('trial.article.neuron.insightBody')}</p>
              </div>
            </aside>
          </section>

          <section id="weighted-sum" className="lesson-section">
            <span className="lesson-section-index">02</span>
            <h2>{t('trial.article.weights.title')}</h2>
            <p className="lesson-lede">{t('trial.article.weights.lede')}</p>
            <div
              className="equation-strip"
              aria-label={t('trial.article.weights.equationLabel')}
              role="img"
            >
              <span>
                <small>{t('trial.article.weights.inputs')}</small>
                x₁, x₂
              </span>
              <b aria-hidden="true">×</b>
              <span>
                <small>{t('trial.article.weights.weights')}</small>
                w₁, w₂
              </span>
              <b aria-hidden="true">+</b>
              <span>
                <small>{t('trial.article.weights.bias')}</small>b
              </span>
              <b aria-hidden="true">=</b>
              <span className="is-result">
                <small>{t('trial.article.weights.score')}</small>z
              </span>
            </div>
            <p>{t('trial.article.weights.body')}</p>
          </section>

          <div id="try-it" className="lesson-section lesson-lab-section">
            <span className="lesson-section-index">03</span>
            <NeuronDecisionLab activityId={post.activityId} />
          </div>

          <section id="read-result" className="lesson-section">
            <span className="lesson-section-index">04</span>
            <h2>{t('trial.article.result.title')}</h2>
            <p className="lesson-lede">{t('trial.article.result.lede')}</p>
            <div className="result-reading-grid">
              <div>
                <span>z &lt; 0</span>
                <strong>{t('trial.article.result.inactive')}</strong>
                <p>{t('trial.article.result.inactiveBody')}</p>
              </div>
              <div className="is-active">
                <span>z ≥ 0</span>
                <strong>{t('trial.article.result.active')}</strong>
                <p>{t('trial.article.result.activeBody')}</p>
              </div>
            </div>
            <p>{t('trial.article.result.body')}</p>
          </section>

          <footer className="trial-lesson-summary">
            <span className="eyebrow">{t('trial.summary.eyebrow')}</span>
            <h2>{t('trial.summary.title')}</h2>
            <p>{t('trial.summary.body')}</p>
            <Link className="secondary-link" to={`/courses/${post.courseId}`}>
              {t('trial.summary.back')}
              <MoveRight aria-hidden="true" size={17} />
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}

function TrialPostNotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className="not-found page-shell">
      <span aria-hidden="true">404 / POST</span>
      <h1>{t('trial.notFound.title')}</h1>
      <p>{t('trial.notFound.body')}</p>
      <Link className="primary-link" to="/courses">
        {t('trial.notFound.back')}
      </Link>
    </main>
  );
}
