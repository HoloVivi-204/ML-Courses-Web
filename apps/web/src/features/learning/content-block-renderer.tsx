import { ArrowUpRight, BookOpenText, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Locale } from '../catalog/course-data';
import { NeuronDecisionLab } from './neuron-decision-lab';

interface ContentBlockBase<TType extends string, TLocales> {
  accessibility: { en: string | null; vi: string | null };
  activityId: string | null;
  assetIds: readonly string[];
  id: string;
  locales: { en: TLocales; vi: TLocales };
  order: number;
  postId: string;
  required: boolean;
  schemaVersion: 1;
  sourceIds: readonly string[];
  type: TType;
}

interface HeadingLocale {
  lede: string;
  navigationTitle: string;
  title: string;
}

interface MarkdownLocale {
  paragraphs: readonly string[];
}

interface CalloutLocale {
  body: string;
  title: string;
}

interface ComparisonCalloutLocale {
  body: string;
  items: ReadonlyArray<{ body: string; label: string; title: string }>;
  title: string;
}

interface ExampleLocale {
  navigationTitle: string;
}

interface SourceListLocale {
  heading: string;
  intro: string;
  navigationTitle: string;
}

interface FormulaLocale {
  bias: string;
  description: string;
  inputs: string;
  score: string;
  weights: string;
}

type ResourceType = 'article' | 'blog' | 'documentation' | 'video';

interface ExternalResource {
  language: 'en' | 'vi';
  relatedTopicIds: readonly string[];
  resourceType: ResourceType;
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
}

export type HeadingBlock = ContentBlockBase<'heading', HeadingLocale>;
export type MarkdownBlock = ContentBlockBase<'markdown', MarkdownLocale>;
type InsightCalloutBlock = ContentBlockBase<'callout', CalloutLocale> & {
  variant: 'insight';
};
type ComparisonCalloutBlock = ContentBlockBase<'callout', ComparisonCalloutLocale> & {
  variant: 'comparison';
};
export type CalloutBlock = InsightCalloutBlock | ComparisonCalloutBlock;
export type ExampleBlock = Omit<ContentBlockBase<'example', ExampleLocale>, 'activityId'> & {
  activityId: string;
};
export type SourceListBlock = ContentBlockBase<'source-list', SourceListLocale> & {
  resources: readonly ExternalResource[];
};
export type FormulaBlock = ContentBlockBase<'formula', FormulaLocale>;
export type ContentBlock =
  HeadingBlock | MarkdownBlock | CalloutBlock | FormulaBlock | ExampleBlock | SourceListBlock;

interface ContentBlockRendererProps {
  blocks: readonly unknown[];
  locale: Locale;
  postId: string;
}

export function ContentBlockNavigation({ blocks, locale, postId }: ContentBlockRendererProps) {
  const { t } = useTranslation();
  const navigationItems = getOrderedContentBlocks(blocks, postId).flatMap((block) => {
    const title = getNavigationTitle(block, locale);

    return title ? [{ id: block.id, title }] : [];
  });

  return (
    <nav aria-label={t('trial.contentsLabel')}>
      <span className="trial-contents-title">
        <BookOpenText aria-hidden="true" size={17} />
        {t('trial.contentsTitle')}
      </span>
      <ol>
        {navigationItems.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`}>{item.title}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ContentBlockRenderer({ blocks, locale, postId }: ContentBlockRendererProps) {
  const { t } = useTranslation();
  const entries = blocks
    .map((candidate, index) => ({
      block: isContentBlock(candidate, postId) ? candidate : null,
      index,
    }))
    .sort(
      (left, right) =>
        (left.block?.order ?? Number.MAX_SAFE_INTEGER) -
          (right.block?.order ?? Number.MAX_SAFE_INTEGER) || left.index - right.index,
    );
  let sectionIndex = 0;

  return entries.map(({ block, index }) => {
    if (!block) {
      return (
        <div className="content-block-error" key={`invalid-block-${index}`} role="status">
          {t('content.invalidBlock')}
        </div>
      );
    }

    const displayIndex = getNavigationTitle(block, locale)
      ? String(++sectionIndex).padStart(2, '0')
      : null;

    if (block.type === 'heading') {
      const content = block.locales[locale];

      return (
        <div className="lesson-section content-heading-block" id={block.id} key={block.id}>
          <span className="lesson-section-index">{displayIndex}</span>
          <h2>{content.title}</h2>
          <p className="lesson-lede">{content.lede}</p>
        </div>
      );
    }

    if (block.type === 'markdown') {
      const content = block.locales[locale];

      return (
        <div className="content-markdown-block" key={block.id}>
          {content.paragraphs.map((paragraph, paragraphIndex) => (
            <p key={`${block.id}-paragraph-${paragraphIndex}`}>{paragraph}</p>
          ))}
        </div>
      );
    }

    if (block.type === 'formula') {
      const content = block.locales[locale];
      const accessibility = block.accessibility[locale] ?? content.description;

      return (
        <section className="content-formula-block" key={block.id}>
          <div className="equation-strip" aria-label={accessibility} role="img">
            <span>
              <small>{content.inputs}</small>
              x₁, x₂
            </span>
            <b aria-hidden="true">×</b>
            <span>
              <small>{content.weights}</small>
              w₁, w₂
            </span>
            <b aria-hidden="true">+</b>
            <span>
              <small>{content.bias}</small>b
            </span>
            <b aria-hidden="true">=</b>
            <span className="is-result">
              <small>{content.score}</small>z
            </span>
          </div>
          <p>{content.description}</p>
        </section>
      );
    }

    if (block.type === 'example') {
      return (
        <div className="lesson-section lesson-lab-section" id={block.id} key={block.id}>
          <span className="lesson-section-index">{displayIndex}</span>
          <NeuronDecisionLab activityId={block.activityId} />
        </div>
      );
    }

    if (block.type === 'source-list') {
      const content = block.locales[locale];
      const resources = block.resources.flatMap((resource) => {
        const safeUrl = getSafeExternalUrl(resource.url);

        if (!safeUrl) {
          return [];
        }

        return [{ resource, safeUrl }];
      });

      return (
        <section className="content-source-list" id={block.id} key={block.id}>
          <span className="lesson-section-index">{displayIndex}</span>
          <h2>{content.heading}</h2>
          <p>{content.intro}</p>
          <ul>
            {resources.map(({ resource, safeUrl }) => (
              <li key={resource.sourceId}>
                <a href={safeUrl.href} rel="noopener noreferrer" target="_blank">
                  {resource.title}
                  <ArrowUpRight aria-hidden="true" size={17} />
                </a>
                <span>
                  {resource.sourceName} · {safeUrl.hostname} ·{' '}
                  {t(`content.resourceType.${resource.resourceType}`)} ·{' '}
                  {t(`content.resourceLanguage.${resource.language}`)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      );
    }

    if (block.variant === 'comparison') {
      const content = block.locales[locale];

      return (
        <aside aria-label={content.title} className="content-comparison-block" key={block.id}>
          <div className="result-reading-grid">
            {content.items.map((item, itemIndex) => (
              <div
                className={itemIndex > 0 ? 'is-active' : undefined}
                key={`${block.id}-outcome-${itemIndex}`}
              >
                <span>{item.label}</span>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
          <p>{content.body}</p>
        </aside>
      );
    }

    const content = block.locales[locale];

    return (
      <aside
        aria-label={content.title}
        className="lesson-insight content-callout-block"
        key={block.id}
        role="note"
      >
        <Lightbulb aria-hidden="true" size={21} />
        <div>
          <strong>{content.title}</strong>
          <p>{content.body}</p>
        </div>
      </aside>
    );
  });
}

function getOrderedContentBlocks(blocks: readonly unknown[], postId: string) {
  return blocks
    .filter((block): block is ContentBlock => isContentBlock(block, postId))
    .sort((left, right) => left.order - right.order);
}

function getNavigationTitle(block: ContentBlock, locale: Locale) {
  if (block.type === 'heading' || block.type === 'example' || block.type === 'source-list') {
    return block.locales[locale].navigationTitle;
  }

  return null;
}

function getSafeExternalUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== 'https:' || url.username || url.password) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function isContentBlock(value: unknown, postId: string): value is ContentBlock {
  if (!hasValidBase(value, postId)) {
    return false;
  }

  if (value.type === 'heading') {
    return value.activityId === null && hasLocalizedPayload(value.locales, isHeadingLocale);
  }

  if (value.type === 'markdown') {
    return value.activityId === null && hasLocalizedPayload(value.locales, isMarkdownLocale);
  }

  if (value.type === 'callout') {
    if (value.activityId !== null) {
      return false;
    }

    if (value.variant === 'insight') {
      return hasLocalizedPayload(value.locales, isCalloutLocale);
    }

    if (value.variant === 'comparison') {
      return hasLocalizedPayload(value.locales, isComparisonCalloutLocale);
    }

    return false;
  }

  if (value.type === 'formula') {
    return value.activityId === null && hasLocalizedPayload(value.locales, isFormulaLocale);
  }

  if (value.type === 'example') {
    return (
      value.activityId === `act-${postId}-example` &&
      hasLocalizedPayload(value.locales, isExampleLocale)
    );
  }

  if (value.type === 'source-list') {
    return (
      value.activityId === null &&
      hasLocalizedPayload(value.locales, isSourceListLocale) &&
      Array.isArray(value.resources) &&
      value.resources.every(isExternalResource) &&
      value.resources.every((resource) => value.sourceIds.includes(resource.sourceId))
    );
  }

  return false;
}

function hasValidBase(
  value: unknown,
  postId: string,
): value is Record<string, unknown> & {
  accessibility: { en: string | null; vi: string | null };
  activityId: string | null;
  assetIds: string[];
  id: string;
  locales: { en: unknown; vi: unknown };
  order: number;
  postId: string;
  required: boolean;
  schemaVersion: 1;
  sourceIds: string[];
  type: string;
} {
  if (!isRecord(value) || !isRecord(value.locales) || !isRecord(value.accessibility)) {
    return false;
  }

  return (
    value.schemaVersion === 1 &&
    value.postId === postId &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    Number.isInteger(value.order) &&
    Number(value.order) >= 1 &&
    Number(value.order) <= 12 &&
    typeof value.type === 'string' &&
    (value.activityId === null || typeof value.activityId === 'string') &&
    typeof value.required === 'boolean' &&
    isStringArray(value.assetIds) &&
    isStringArray(value.sourceIds) &&
    'vi' in value.locales &&
    'en' in value.locales &&
    isNullableString(value.accessibility.vi) &&
    isNullableString(value.accessibility.en)
  );
}

function hasLocalizedPayload(
  locales: { en: unknown; vi: unknown },
  validator: (value: unknown) => boolean,
) {
  return validator(locales.vi) && validator(locales.en);
}

function isHeadingLocale(value: unknown): value is HeadingLocale {
  return (
    isRecord(value) &&
    typeof value.lede === 'string' &&
    typeof value.navigationTitle === 'string' &&
    typeof value.title === 'string'
  );
}

function isMarkdownLocale(value: unknown): value is MarkdownLocale {
  return isRecord(value) && isStringArray(value.paragraphs);
}

function isCalloutLocale(value: unknown): value is CalloutLocale {
  return isRecord(value) && typeof value.body === 'string' && typeof value.title === 'string';
}

function isComparisonCalloutLocale(value: unknown): value is ComparisonCalloutLocale {
  return (
    isRecord(value) &&
    typeof value.body === 'string' &&
    typeof value.title === 'string' &&
    Array.isArray(value.items) &&
    value.items.length === 2 &&
    value.items.every(
      (item) =>
        isRecord(item) &&
        typeof item.body === 'string' &&
        typeof item.label === 'string' &&
        typeof item.title === 'string',
    )
  );
}

function isExampleLocale(value: unknown): value is ExampleLocale {
  return isRecord(value) && typeof value.navigationTitle === 'string';
}

function isFormulaLocale(value: unknown): value is FormulaLocale {
  return (
    isRecord(value) &&
    typeof value.bias === 'string' &&
    typeof value.description === 'string' &&
    typeof value.inputs === 'string' &&
    typeof value.score === 'string' &&
    typeof value.weights === 'string'
  );
}

function isSourceListLocale(value: unknown): value is SourceListLocale {
  return (
    isRecord(value) &&
    typeof value.heading === 'string' &&
    typeof value.intro === 'string' &&
    typeof value.navigationTitle === 'string'
  );
}

function isExternalResource(value: unknown): value is ExternalResource {
  return (
    isRecord(value) &&
    (value.language === 'en' || value.language === 'vi') &&
    (value.resourceType === 'article' ||
      value.resourceType === 'blog' ||
      value.resourceType === 'documentation' ||
      value.resourceType === 'video') &&
    typeof value.sourceId === 'string' &&
    typeof value.sourceName === 'string' &&
    typeof value.title === 'string' &&
    typeof value.url === 'string' &&
    isStringArray(value.relatedTopicIds)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}
