import { BookOpenText, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Locale } from '../catalog/course-data';
import { parseContentBlockCollection } from './content-block-validation';
import type {
  CalloutBlock,
  ContentBlock,
  ExampleBlock,
  FormulaBlock,
  HeadingBlock,
  MarkdownBlock,
} from './content-block-types';
import { MarkdownContent } from './markdown-content';
import { NeuronDecisionLab } from './neuron-decision-lab';
import { SourceListBlockView } from './source-list-block';

export type { ContentBlock } from './content-block-types';

interface ContentBlockRendererProps {
  blocks: readonly unknown[];
  locale: Locale;
  postId: string;
}

export function ContentBlockNavigation({ blocks, locale, postId }: ContentBlockRendererProps) {
  const { t } = useTranslation();
  const validBlocks = parseContentBlockCollection(blocks, postId) ?? [];
  const items = validBlocks.flatMap((block) => {
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
        {items.map((item) => (
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
  const validBlocks = parseContentBlockCollection(blocks, postId);

  if (!validBlocks) {
    return (
      <div className="content-block-error" role="status">
        {t('content.invalidBlock')}
      </div>
    );
  }

  const displayIndexes = getDisplayIndexes(validBlocks, locale);

  return validBlocks.map((block) => (
    <div className="content-block" data-content-block-id={block.id} id={block.id} key={block.id}>
      <ContentBlockView
        block={block}
        displayIndex={displayIndexes.get(block.id) ?? null}
        locale={locale}
      />
    </div>
  ));
}

interface ContentBlockViewProps {
  block: ContentBlock;
  displayIndex: string | null;
  locale: Locale;
}

function ContentBlockView({ block, displayIndex, locale }: ContentBlockViewProps) {
  switch (block.type) {
    case 'heading':
      return <HeadingBlockView block={block} displayIndex={displayIndex} locale={locale} />;
    case 'markdown':
      return <MarkdownBlockView block={block} locale={locale} />;
    case 'formula':
      return <FormulaBlockView block={block} locale={locale} />;
    case 'example':
      return <ExampleBlockView block={block} displayIndex={displayIndex} locale={locale} />;
    case 'source-list':
      return <SourceListBlockView block={block} displayIndex={displayIndex} locale={locale} />;
    case 'callout':
      return <CalloutBlockView block={block} locale={locale} />;
  }
}

function ExampleBlockView({
  block,
  displayIndex,
  locale,
}: {
  block: ExampleBlock;
  displayIndex: string | null;
  locale: Locale;
}) {
  if (isNeuronDecisionLabExample(block)) {
    return (
      <div className="lesson-section lesson-lab-section">
        <span className="lesson-section-index">{displayIndex}</span>
        <NeuronDecisionLab activityId={block.activityId} />
      </div>
    );
  }

  const headingId = `${block.id}-title`;

  return (
    <section aria-labelledby={headingId} className="lesson-section content-example-block">
      <span className="lesson-section-index">{displayIndex}</span>
      <h2 id={headingId}>{block.locales[locale].navigationTitle}</h2>
      <p>{formatGenericExampleGuidance(locale)}</p>
      <code>{block.activityId}</code>
    </section>
  );
}

function HeadingBlockView({
  block,
  displayIndex,
  locale,
}: {
  block: HeadingBlock;
  displayIndex: string | null;
  locale: Locale;
}) {
  const content = block.locales[locale];

  return (
    <div className="lesson-section content-heading-block">
      <span className="lesson-section-index">{displayIndex}</span>
      <h2>{content.title}</h2>
      <p className="lesson-lede">{content.lede}</p>
    </div>
  );
}

function MarkdownBlockView({ block, locale }: { block: MarkdownBlock; locale: Locale }) {
  return (
    <div className="content-markdown-block">
      <MarkdownContent markdown={block.locales[locale].markdown} />
    </div>
  );
}

function FormulaBlockView({ block, locale }: { block: FormulaBlock; locale: Locale }) {
  const content = block.locales[locale];
  const accessibility = block.accessibility[locale] ?? content.description;

  return (
    <section className="content-formula-block">
      <div className="equation-strip" aria-label={accessibility} role="img">
        <FormulaTerm label={content.inputs}>x₁, x₂</FormulaTerm>
        <b aria-hidden="true">×</b>
        <FormulaTerm label={content.weights}>w₁, w₂</FormulaTerm>
        <b aria-hidden="true">+</b>
        <FormulaTerm label={content.bias}>b</FormulaTerm>
        <b aria-hidden="true">=</b>
        <FormulaTerm isResult label={content.score}>
          z
        </FormulaTerm>
      </div>
      <p>{content.description}</p>
    </section>
  );
}

function FormulaTerm({
  children,
  isResult = false,
  label,
}: {
  children: string;
  isResult?: boolean;
  label: string;
}) {
  return (
    <span className={isResult ? 'is-result' : undefined}>
      <small>{label}</small>
      {children}
    </span>
  );
}

function CalloutBlockView({ block, locale }: { block: CalloutBlock; locale: Locale }) {
  return block.variant === 'comparison' ? (
    <ComparisonCallout block={block} locale={locale} />
  ) : (
    <InsightCallout block={block} locale={locale} />
  );
}

function ComparisonCallout({
  block,
  locale,
}: {
  block: Extract<CalloutBlock, { variant: 'comparison' }>;
  locale: Locale;
}) {
  const content = block.locales[locale];

  return (
    <aside aria-label={content.title} className="content-comparison-block">
      <div className="result-reading-grid">
        {content.items.map((item, index) => (
          <div className={index > 0 ? 'is-active' : undefined} key={item.label}>
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

function InsightCallout({
  block,
  locale,
}: {
  block: Extract<CalloutBlock, { variant: 'insight' }>;
  locale: Locale;
}) {
  const content = block.locales[locale];

  return (
    <aside aria-label={content.title} className="lesson-insight content-callout-block" role="note">
      <Lightbulb aria-hidden="true" size={21} />
      <div>
        <strong>{content.title}</strong>
        <p>{content.body}</p>
      </div>
    </aside>
  );
}

function isNeuronDecisionLabExample(block: ExampleBlock): boolean {
  return (
    block.postId === 'dl-p01-neuron-perceptron' &&
    block.activityId === 'act-dl-p01-neuron-perceptron-example'
  );
}

function formatGenericExampleGuidance(locale: Locale): string {
  if (locale === 'vi') {
    return (
      'Đọc ví dụ này theo chuỗi: tín hiệu đầu vào thay đổi, mô hình phản ứng, ' +
      'rồi metric kiểm tra lỗi.'
    );
  }

  return (
    'Read this example as a chain: the input signal changes, the model responds, ' +
    'then the metric checks the error.'
  );
}

function getDisplayIndexes(blocks: readonly ContentBlock[], locale: Locale) {
  const result = new Map<string, string>();
  let index = 0;

  for (const block of blocks) {
    if (getNavigationTitle(block, locale)) {
      result.set(block.id, String(++index).padStart(2, '0'));
    }
  }

  return result;
}

function getNavigationTitle(block: ContentBlock, locale: Locale) {
  if (block.type === 'heading' || block.type === 'example' || block.type === 'source-list') {
    return block.locales[locale].navigationTitle;
  }

  return null;
}
