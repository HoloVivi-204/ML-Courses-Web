import { ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Locale } from '../catalog/course-data';
import type { ExternalResource, SourceListBlock } from './content-block-types';
import { getSafeExternalUrl } from './safe-external-url';

interface SourceListBlockViewProps {
  block: SourceListBlock;
  displayIndex: string | null;
  locale: Locale;
  onOpenResource?: ((resource: ExternalResource) => void) | undefined;
}

const pendingSourceReviewSuffix =
  /\s*(?:[;,—-]\s*)?(?:review nguồn vẫn đang chờ|đang chờ review nguồn|source review (?:is )?(?:still )?pending)\.?\s*$/iu;

function getLearnerSourceIntro(intro: string): string {
  return intro.replace(pendingSourceReviewSuffix, '.').trim();
}

export function SourceListBlockView({
  block,
  displayIndex,
  locale,
  onOpenResource,
}: SourceListBlockViewProps) {
  const { t } = useTranslation();
  const content = block.locales[locale];
  const sourceIntro = getLearnerSourceIntro(content.intro) || t('content.sourceListIntro');
  const resources = block.resources.flatMap((resource) => {
    const safeLicenseUrl = getSafeExternalUrl(resource.license.url);
    const safeResourceUrl = getSafeExternalUrl(resource.url);

    return safeLicenseUrl && safeResourceUrl ? [{ resource, safeLicenseUrl, safeResourceUrl }] : [];
  });

  return (
    <section className="content-source-list" id={block.id}>
      <span className="lesson-section-index">{displayIndex}</span>
      <h2>{content.heading}</h2>
      <p>{sourceIntro}</p>
      <ul>
        {resources.map(({ resource, safeLicenseUrl, safeResourceUrl }) => (
          <li key={resource.url}>
            <a
              href={safeResourceUrl.href}
              onClick={() => onOpenResource?.(resource)}
              rel="noopener noreferrer"
              target="_blank"
            >
              {resource.title}
              <ArrowUpRight aria-hidden="true" size={17} />
            </a>
            <span className="content-source-meta">
              {resource.sourceName} · {safeResourceUrl.hostname} ·{' '}
              {t(`content.resourceType.${resource.resourceType}`)} ·{' '}
              {t(`content.resourceLanguage.${resource.language}`)}
            </span>
            <span className="content-source-attribution">
              <a
                href={safeResourceUrl.href}
                onClick={() => onOpenResource?.(resource)}
                rel="noopener noreferrer"
                target="_blank"
              >
                {t('content.referenceLink')}
              </a>{' '}
              <a href={safeLicenseUrl.href} rel="noopener noreferrer" target="_blank">
                {resource.license.name}
              </a>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
