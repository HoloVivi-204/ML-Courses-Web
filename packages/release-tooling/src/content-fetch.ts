import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

import { getLockedContentScope, type LockedContentScope } from './content-scope-validator.js';
import type { ContentSource } from './content-source-registry.js';

const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;

export type ContentFetcher = (input: string) => Promise<Response>;

export interface ContentSnapshotFile {
  byteSize: number;
  path: string;
  sha256: string;
  url: string;
}

export interface ContentSourceSnapshotManifest {
  accessedAt: string;
  content: readonly ContentSnapshotFile[];
  contentSnapshotHash: string;
  license: ContentSnapshotFile;
  manifestPath: string;
  reviewStatus: 'pending-operator-review';
  robots: ContentSnapshotFile & { status: 'allowed' | 'not-provided' };
  schemaVersion: 1;
  sourceId: string;
  terms: ContentSnapshotFile;
}

export interface ContentSourceSnapshotResult {
  artifactDirectory: string;
  manifest: ContentSourceSnapshotManifest;
  manifestPath: string;
}

interface FetchedPayload {
  body: Buffer;
  contentType: string;
  requestedUrl: string;
  resolvedUrl: string;
  status: number;
}

interface RobotsRule {
  path: string;
  type: 'allow' | 'disallow';
}

function createSha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function assertHttpsUrl(urlValue: string, allowedHostnames: readonly string[]): URL {
  let url: URL;

  try {
    url = new URL(urlValue);
  } catch {
    throw new Error(`Source URL is invalid: ${urlValue}`);
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !allowedHostnames.includes(url.hostname.toLowerCase())
  ) {
    throw new Error(`Source URL is outside its allowlist: ${urlValue}`);
  }

  return url;
}

function getRobotsUrl(contentUrl: string): string {
  const url = new URL(contentUrl);
  return new URL('/robots.txt', url).toString();
}

function parseRobotsRules(robotsText: string): readonly RobotsRule[] {
  const rules: RobotsRule[] = [];
  let appliesToWildcardAgent = false;

  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = rawLine.split('#', 1)[0]?.trim() ?? '';

    if (!line) {
      continue;
    }

    const separatorIndex = line.indexOf(':');
    if (separatorIndex < 0) {
      continue;
    }

    const field = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (field === 'user-agent') {
      appliesToWildcardAgent = value === '*';
      continue;
    }

    if (!appliesToWildcardAgent || (field !== 'allow' && field !== 'disallow')) {
      continue;
    }

    if (value) {
      rules.push({ path: value, type: field });
    }
  }

  return rules;
}

function isAllowedByRobots(robotsText: string, pathname: string): boolean {
  const matchingRules = parseRobotsRules(robotsText)
    .filter((rule) => pathname.startsWith(rule.path))
    .sort((first, second) => {
      if (second.path.length !== first.path.length) {
        return second.path.length - first.path.length;
      }

      return first.type === 'allow' ? -1 : 1;
    });

  return matchingRules[0]?.type !== 'disallow';
}

function getFileExtension(contentType: string, url: string): string {
  const normalizedType = contentType.toLowerCase();

  if (normalizedType.includes('html')) {
    return '.html';
  }

  if (normalizedType.includes('json')) {
    return '.json';
  }

  if (normalizedType.includes('markdown') || normalizedType.includes('text/plain')) {
    return '.md';
  }

  const urlExtension = extname(new URL(url).pathname).toLowerCase();
  return urlExtension || '.txt';
}

function assertSupportedContentType(contentType: string, sourceId: string, url: string): void {
  const normalizedType = contentType.toLowerCase();

  if (
    normalizedType &&
    !normalizedType.startsWith('text/') &&
    !normalizedType.includes('json') &&
    !normalizedType.includes('markdown')
  ) {
    throw new Error(
      `Source ${sourceId} returned unsupported content type for ${url}: ${contentType}`,
    );
  }
}

async function fetchPayload(input: {
  allowNotFound?: boolean;
  allowedHostnames: readonly string[];
  fetcher: ContentFetcher;
  sourceId: string;
  url: string;
}): Promise<FetchedPayload> {
  assertHttpsUrl(input.url, input.allowedHostnames);
  const response = await input.fetcher(input.url);

  if (!response.ok && !(input.allowNotFound && response.status === 404)) {
    throw new Error(
      `Source ${input.sourceId} request failed for ${input.url}: HTTP ${response.status}.`,
    );
  }

  const resolvedUrl = response.url || input.url;
  assertHttpsUrl(resolvedUrl, input.allowedHostnames);
  const body = Buffer.from(await response.arrayBuffer());

  if (body.byteLength > MAX_SNAPSHOT_BYTES) {
    throw new Error(
      `Source ${input.sourceId} exceeds the ${MAX_SNAPSHOT_BYTES} byte snapshot limit.`,
    );
  }

  return {
    body,
    contentType: response.headers.get('content-type') ?? '',
    requestedUrl: input.url,
    resolvedUrl,
    status: response.status,
  };
}

function createSnapshotHash(input: {
  content: readonly FetchedPayload[];
  license: FetchedPayload;
  robots: FetchedPayload;
  sourceId: string;
  terms: FetchedPayload;
}): string {
  return createSha256(
    JSON.stringify({
      content: input.content.map((item) => ({
        sha256: createSha256(item.body),
        url: item.resolvedUrl,
      })),
      license: { sha256: createSha256(input.license.body), url: input.license.resolvedUrl },
      robots: { sha256: createSha256(input.robots.body), url: input.robots.resolvedUrl },
      sourceId: input.sourceId,
      terms: { sha256: createSha256(input.terms.body), url: input.terms.resolvedUrl },
    }),
  );
}

async function writeSnapshotFile(input: {
  artifactDirectory: string;
  body: Buffer;
  fileName: string;
  url: string;
}): Promise<ContentSnapshotFile> {
  const path = join(input.artifactDirectory, input.fileName);
  await writeFile(path, input.body);

  return {
    byteSize: input.body.byteLength,
    path,
    sha256: createSha256(input.body),
    url: input.url,
  };
}

function assertSourceBelongsToLockedScope(source: ContentSource, scope: LockedContentScope): void {
  if (!scope.sourceIds.includes(source.sourceId)) {
    throw new Error(`Source ${source.sourceId} is not referenced by content-skeleton.yaml.`);
  }
}

export async function snapshotContentSource(input: {
  fetcher?: ContentFetcher;
  now?: () => string;
  outputRoot: string;
  scope?: LockedContentScope;
  source: ContentSource;
}): Promise<ContentSourceSnapshotResult> {
  const fetcher = input.fetcher ?? ((url: string) => fetch(url));
  const scope = input.scope ?? getLockedContentScope();

  assertSourceBelongsToLockedScope(input.source, scope);

  const robotsUrl = getRobotsUrl(input.source.contentUrls[0] ?? input.source.canonicalUrl);
  const robots = await fetchPayload({
    allowNotFound: true,
    allowedHostnames: input.source.allowedHostnames,
    fetcher,
    sourceId: input.source.sourceId,
    url: robotsUrl,
  });
  const robotsText = robots.body.toString('utf8');
  const robotsStatus = robots.status === 404 ? 'not-provided' : 'allowed';

  for (const contentUrl of input.source.contentUrls) {
    const url = assertHttpsUrl(contentUrl, input.source.allowedHostnames);

    if (robotsStatus === 'allowed' && !isAllowedByRobots(robotsText, url.pathname)) {
      throw new Error(`robots.txt disallows snapshotting ${url.pathname}.`);
    }
  }

  const terms = await fetchPayload({
    allowedHostnames: input.source.allowedHostnames,
    fetcher,
    sourceId: input.source.sourceId,
    url: input.source.termsUrl,
  });
  const license = await fetchPayload({
    allowedHostnames: input.source.allowedHostnames,
    fetcher,
    sourceId: input.source.sourceId,
    url: input.source.license.url,
  });
  const content = await Promise.all(
    input.source.contentUrls.map(async (url) => {
      const payload = await fetchPayload({
        allowedHostnames: input.source.allowedHostnames,
        fetcher,
        sourceId: input.source.sourceId,
        url,
      });
      assertSupportedContentType(payload.contentType, input.source.sourceId, payload.resolvedUrl);
      return payload;
    }),
  );
  const contentSnapshotHash = createSnapshotHash({
    content,
    license,
    robots,
    sourceId: input.source.sourceId,
    terms,
  });
  const artifactDirectory = join(
    input.outputRoot,
    'sources',
    input.source.sourceId,
    contentSnapshotHash,
  );

  await mkdir(artifactDirectory, { recursive: true });

  const robotsSnapshot = await writeSnapshotFile({
    artifactDirectory,
    body: robots.body,
    fileName: 'robots.txt',
    url: robots.resolvedUrl,
  });
  const termsSnapshot = await writeSnapshotFile({
    artifactDirectory,
    body: terms.body,
    fileName: `terms${getFileExtension(terms.contentType, terms.resolvedUrl)}`,
    url: terms.resolvedUrl,
  });
  const licenseSnapshot = await writeSnapshotFile({
    artifactDirectory,
    body: license.body,
    fileName: `license${getFileExtension(license.contentType, license.resolvedUrl)}`,
    url: license.resolvedUrl,
  });
  const contentSnapshots = await Promise.all(
    content.map((payload, index) =>
      writeSnapshotFile({
        artifactDirectory,
        body: payload.body,
        fileName: `content-${String(index + 1).padStart(2, '0')}${getFileExtension(
          payload.contentType,
          payload.resolvedUrl,
        )}`,
        url: payload.resolvedUrl,
      }),
    ),
  );
  const manifestPath = join(artifactDirectory, 'source-manifest.json');
  const manifest: ContentSourceSnapshotManifest = {
    accessedAt: (input.now ?? (() => new Date().toISOString()))(),
    content: contentSnapshots,
    contentSnapshotHash,
    license: licenseSnapshot,
    manifestPath,
    reviewStatus: 'pending-operator-review',
    robots: { ...robotsSnapshot, status: robotsStatus },
    schemaVersion: 1,
    sourceId: input.source.sourceId,
    terms: termsSnapshot,
  };

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return { artifactDirectory, manifest, manifestPath };
}
