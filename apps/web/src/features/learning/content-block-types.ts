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

export interface HeadingLocale {
  lede: string;
  navigationTitle: string;
  title: string;
}

export interface MarkdownLocale {
  markdown: string;
}

export interface CalloutLocale {
  body: string;
  title: string;
}

export interface ComparisonCalloutLocale {
  body: string;
  items: ReadonlyArray<{ body: string; label: string; title: string }>;
  title: string;
}

export interface ExampleLocale {
  description?: string;
  navigationTitle: string;
}

export interface SourceListLocale {
  heading: string;
  intro: string;
  navigationTitle: string;
}

export interface FormulaLocale {
  bias: string;
  description: string;
  inputs: string;
  score: string;
  weights: string;
}

export type ResourceType = 'article' | 'blog' | 'documentation' | 'video';

export interface ExternalResource {
  attribution: { en: string; vi: string };
  language: 'en' | 'vi';
  license: { name: string; url: string };
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
