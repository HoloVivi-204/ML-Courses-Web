import type {
  CalloutLocale,
  ComparisonCalloutLocale,
  ContentBlock,
  ExampleLocale,
  ExternalResource,
  FormulaLocale,
  HeadingLocale,
  MarkdownLocale,
  SourceListLocale,
} from './content-block-types';

const MAX_BLOCKS_PER_POST = 12;

export function parseContentBlockCollection(
  values: readonly unknown[],
  postId: string,
): ContentBlock[] | null {
  if (values.length > MAX_BLOCKS_PER_POST) {
    return null;
  }

  const blocks: ContentBlock[] = [];

  for (const value of values) {
    if (!isContentBlock(value, postId)) {
      return null;
    }
    blocks.push(value);
  }

  if (!hasUniqueValues(blocks.map((block) => block.id))) {
    return null;
  }

  if (!hasUniqueValues(blocks.map((block) => block.order))) {
    return null;
  }

  return [...blocks].sort((left, right) => left.order - right.order);
}

function isContentBlock(value: unknown, postId: string): value is ContentBlock {
  if (!hasValidBase(value, postId)) {
    return false;
  }

  switch (value.type) {
    case 'heading':
      return value.activityId === null && hasLocalizedPayload(value.locales, isHeadingLocale);
    case 'markdown':
      return value.activityId === null && hasLocalizedPayload(value.locales, isMarkdownLocale);
    case 'callout':
      return isCalloutBlock(value);
    case 'formula':
      return value.activityId === null && hasLocalizedPayload(value.locales, isFormulaLocale);
    case 'example':
      return isExampleBlock(value, postId);
    case 'source-list':
      return isSourceListBlock(value);
    default:
      return false;
  }
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
    isNonEmptyString(value.id) &&
    Number.isInteger(value.order) &&
    Number(value.order) >= 1 &&
    Number(value.order) <= MAX_BLOCKS_PER_POST &&
    typeof value.type === 'string' &&
    (value.activityId === null || typeof value.activityId === 'string') &&
    typeof value.required === 'boolean' &&
    isUniqueStringArray(value.assetIds) &&
    isUniqueStringArray(value.sourceIds) &&
    'vi' in value.locales &&
    'en' in value.locales &&
    isNullableString(value.accessibility.vi) &&
    isNullableString(value.accessibility.en)
  );
}

function isCalloutBlock(
  value: Record<string, unknown> & {
    activityId: string | null;
    locales: { en: unknown; vi: unknown };
  },
) {
  if (value.activityId !== null) {
    return false;
  }

  if (value.variant === 'insight') {
    return hasLocalizedPayload(value.locales, isCalloutLocale);
  }

  return (
    value.variant === 'comparison' && hasLocalizedPayload(value.locales, isComparisonCalloutLocale)
  );
}

function isExampleBlock(
  value: Record<string, unknown> & {
    activityId: string | null;
    locales: { en: unknown; vi: unknown };
  },
  postId: string,
) {
  return (
    value.activityId === `act-${postId}-example` &&
    hasLocalizedPayload(value.locales, isExampleLocale)
  );
}

function isSourceListBlock(
  value: Record<string, unknown> & {
    activityId: string | null;
    locales: { en: unknown; vi: unknown };
    sourceIds: string[];
  },
) {
  return (
    value.activityId === null &&
    hasLocalizedPayload(value.locales, isSourceListLocale) &&
    Array.isArray(value.resources) &&
    value.resources.length > 0 &&
    value.resources.every(isExternalResource) &&
    value.resources.every((resource) => value.sourceIds.includes(resource.sourceId)) &&
    hasUniqueValues(value.resources.map((resource) => resource.sourceId))
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
    isNonEmptyString(value.lede) &&
    isNonEmptyString(value.navigationTitle) &&
    isNonEmptyString(value.title)
  );
}

function isMarkdownLocale(value: unknown): value is MarkdownLocale {
  return isRecord(value) && isNonEmptyString(value.markdown);
}

function isCalloutLocale(value: unknown): value is CalloutLocale {
  return isRecord(value) && isNonEmptyString(value.body) && isNonEmptyString(value.title);
}

function isComparisonCalloutLocale(value: unknown): value is ComparisonCalloutLocale {
  return (
    isRecord(value) &&
    isNonEmptyString(value.body) &&
    isNonEmptyString(value.title) &&
    Array.isArray(value.items) &&
    value.items.length === 2 &&
    value.items.every(isComparisonItem)
  );
}

function isComparisonItem(value: unknown) {
  return (
    isRecord(value) &&
    isNonEmptyString(value.body) &&
    isNonEmptyString(value.label) &&
    isNonEmptyString(value.title)
  );
}

function isExampleLocale(value: unknown): value is ExampleLocale {
  return isRecord(value) && isNonEmptyString(value.navigationTitle);
}

function isFormulaLocale(value: unknown): value is FormulaLocale {
  return (
    isRecord(value) &&
    isNonEmptyString(value.bias) &&
    isNonEmptyString(value.description) &&
    isNonEmptyString(value.inputs) &&
    isNonEmptyString(value.score) &&
    isNonEmptyString(value.weights)
  );
}

function isSourceListLocale(value: unknown): value is SourceListLocale {
  return (
    isRecord(value) &&
    isNonEmptyString(value.heading) &&
    isNonEmptyString(value.intro) &&
    isNonEmptyString(value.navigationTitle)
  );
}

function isExternalResource(value: unknown): value is ExternalResource {
  return (
    isRecord(value) &&
    isLocalizedString(value.attribution) &&
    (value.language === 'en' || value.language === 'vi') &&
    isLicense(value.license) &&
    isUniqueStringArray(value.relatedTopicIds) &&
    isResourceType(value.resourceType) &&
    isNonEmptyString(value.sourceId) &&
    isNonEmptyString(value.sourceName) &&
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.url)
  );
}

function isResourceType(value: unknown) {
  return value === 'article' || value === 'blog' || value === 'documentation' || value === 'video';
}

function isLocalizedString(value: unknown) {
  return isRecord(value) && isNonEmptyString(value.en) && isNonEmptyString(value.vi);
}

function isLicense(value: unknown) {
  return isRecord(value) && isNonEmptyString(value.name) && isNonEmptyString(value.url);
}

function hasUniqueValues(values: readonly (number | string)[]) {
  return new Set(values).size === values.length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUniqueStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string') &&
    hasUniqueValues(value)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}
