import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export interface DraftContentDocumentStore {
  get(path: string): Promise<Readonly<Record<string, unknown>> | null>;
  set(path: string, value: Readonly<Record<string, unknown>>): Promise<void>;
}

type DraftContentEntityType = 'course' | 'demo' | 'module' | 'post' | 'quiz';

interface DraftProvenance {
  candidateSourceIds: readonly string[];
  contentReviewStatus: 'pending-operator-review';
  externalEvidenceStatus: 'not-collected';
  importStatus: 'draft-only';
}

export interface ReleaseContentDraftDocument {
  activityIds?: readonly string[];
  contentHash: string;
  courseId: string;
  demoProblemId?: string;
  entityId: string;
  entityType: DraftContentEntityType;
  moduleId?: string;
  postId?: string;
  provenance: DraftProvenance;
  publishedRevisionId?: never;
  quizKind?: 'module' | 'post';
  quizQuestionCount?: number;
  stableReferenceIds: readonly string[];
  storagePath: string;
}

export interface ReleaseContentDraftManifest {
  counts: {
    courses: number;
    demos: number;
    moduleQuizQuestions: number;
    modules: number;
    postQuizQuestions: number;
    posts: number;
    quizQuestions: number;
  };
  documents: readonly ReleaseContentDraftDocument[];
  inputHash: string;
  schemaVersion: 1;
}

export interface ContentDraftImportResult {
  created: number;
  dryRun: boolean;
  inputHash: string;
  jobId: string;
  unchanged: number;
  updated: number;
}

export interface ContentDraftDiff {
  document: ReleaseContentDraftDocument;
  status: 'create' | 'unchanged' | 'update';
}

interface ParsedPost {
  activityIds: readonly string[];
  postId: string;
  postQuizId: string;
  postQuizQuestionCount: number;
}

interface ParsedModule {
  demoId: string | null;
  demoProblemId: string | null;
  moduleId: string;
  moduleQuizId: string;
  moduleQuizQuestionCount: number;
  posts: ParsedPost[];
}

interface ParsedCourse {
  courseId: string;
  modules: ParsedModule[];
  sourceCandidateIds: readonly string[];
}

interface ParsedSkeleton {
  courses: ParsedCourse[];
  counts: ReleaseContentDraftManifest['counts'];
}

const CONTENT_DRAFT_COLLECTION = 'releaseContentDrafts';
const CONTENT_DRAFT_IMPORT_JOB_ID = 'release-1-content-draft-v1';

function createHashValue(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function createExpectedActivityIds(postId: string): readonly string[] {
  return [
    `act-${postId}-example`,
    `act-${postId}-quiz-01`,
    `act-${postId}-quiz-02`,
    `act-${postId}-quiz-03`,
  ];
}

function getInlineList(value: string): readonly string[] {
  const match = /^\[(.*)]$/.exec(value.trim());

  if (!match?.[1]) {
    return [];
  }

  return match[1]
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getRequiredNumber(lines: readonly string[], key: string): number {
  const match = lines.map((line) => new RegExp(`^\\s*${key}: (\\d+)$`).exec(line)).find(Boolean);

  if (!match?.[1]) {
    throw new Error(`content-skeleton.yaml is missing numeric ${key}.`);
  }

  return Number(match[1]);
}

function parseContentSkeleton(): ParsedSkeleton {
  const skeleton = readFileSync(new URL('../../../content-skeleton.yaml', import.meta.url), 'utf8');
  const lines = skeleton.split(/\r?\n/);
  const courses: ParsedCourse[] = [];
  let currentCourse: ParsedCourse | null = null;
  let currentModule: ParsedModule | null = null;
  let currentPost: ParsedPost | null = null;

  for (const line of lines) {
    const courseMatch = /^ {2}- courseId: ([a-z0-9-]+)$/.exec(line);

    if (courseMatch?.[1]) {
      currentCourse = {
        courseId: courseMatch[1],
        modules: [],
        sourceCandidateIds: [],
      };
      courses.push(currentCourse);
      currentModule = null;
      currentPost = null;
      continue;
    }

    const sourceCandidatesMatch = /^ {4}sourceCandidates: (\[.*])$/.exec(line);

    if (sourceCandidatesMatch?.[1] && currentCourse) {
      currentCourse.sourceCandidateIds = getInlineList(sourceCandidatesMatch[1]);
      continue;
    }

    const moduleMatch = /^ {6}- moduleId: ([a-z0-9-]+)$/.exec(line);

    if (moduleMatch?.[1]) {
      const course = currentCourse;

      if (!course) {
        throw new Error(`Module ${moduleMatch[1]} has no course.`);
      }

      currentModule = {
        demoId: null,
        demoProblemId: null,
        moduleId: moduleMatch[1],
        moduleQuizId: '',
        moduleQuizQuestionCount: 0,
        posts: [],
      };
      course.modules.push(currentModule);
      currentPost = null;
      continue;
    }

    const module = currentModule;

    if (!module) {
      continue;
    }

    const demoIdMatch = /^ {8}demoId: (null|[a-z0-9-]+)$/.exec(line);
    if (demoIdMatch?.[1]) {
      module.demoId = demoIdMatch[1] === 'null' ? null : demoIdMatch[1];
      continue;
    }

    const demoProblemIdMatch = /^ {8}demoProblemId: (null|[a-z0-9-]+)$/.exec(line);
    if (demoProblemIdMatch?.[1]) {
      module.demoProblemId = demoProblemIdMatch[1] === 'null' ? null : demoProblemIdMatch[1];
      continue;
    }

    const moduleQuizIdMatch = /^ {8}moduleQuizId: ([a-z0-9-]+)$/.exec(line);
    if (moduleQuizIdMatch?.[1]) {
      module.moduleQuizId = moduleQuizIdMatch[1];
      continue;
    }

    const moduleQuestionCountMatch = /^ {8}moduleQuizQuestionCount: (\d+)$/.exec(line);
    if (moduleQuestionCountMatch?.[1]) {
      module.moduleQuizQuestionCount = Number(moduleQuestionCountMatch[1]);
      continue;
    }

    const postMatch = /^ {10}- postId: ([a-z0-9-]+)$/.exec(line);
    if (postMatch?.[1]) {
      currentPost = {
        activityIds: [],
        postId: postMatch[1],
        postQuizId: '',
        postQuizQuestionCount: 0,
      };
      module.posts.push(currentPost);
      continue;
    }

    if (!currentPost) {
      continue;
    }

    const postQuizIdMatch = /^ {12}postQuizId: ([a-z0-9-]+)$/.exec(line);
    if (postQuizIdMatch?.[1]) {
      currentPost.postQuizId = postQuizIdMatch[1];
      continue;
    }

    const postQuestionCountMatch = /^ {12}postQuizQuestionCount: (\d+)$/.exec(line);
    if (postQuestionCountMatch?.[1]) {
      currentPost.postQuizQuestionCount = Number(postQuestionCountMatch[1]);
      continue;
    }

    const activityIdsMatch = /^ {12}activityIds: (\[.*])$/.exec(line);
    if (activityIdsMatch?.[1]) {
      currentPost.activityIds = getInlineList(activityIdsMatch[1]);
    }
  }

  const counts = {
    courses: getRequiredNumber(lines, 'courses'),
    demos: getRequiredNumber(lines, 'demos'),
    moduleQuizQuestions: getRequiredNumber(lines, 'moduleQuizQuestions'),
    modules: getRequiredNumber(lines, 'modules'),
    postQuizQuestions: getRequiredNumber(lines, 'postQuizQuestions'),
    posts: getRequiredNumber(lines, 'posts'),
    quizQuestions: getRequiredNumber(lines, 'quizQuestions'),
  };

  validateParsedSkeleton({ courses, counts });

  return { courses, counts };
}

function validateParsedSkeleton(input: ParsedSkeleton): void {
  const modules = input.courses.flatMap((course) => course.modules);
  const posts = modules.flatMap((module) => module.posts);
  const demos = modules.filter((module) => module.demoId !== null);
  const moduleQuizQuestions = modules.reduce(
    (total, module) => total + module.moduleQuizQuestionCount,
    0,
  );
  const postQuizQuestions = posts.reduce((total, post) => total + post.postQuizQuestionCount, 0);

  if (
    input.courses.length !== input.counts.courses ||
    modules.length !== input.counts.modules ||
    posts.length !== input.counts.posts ||
    demos.length !== input.counts.demos ||
    moduleQuizQuestions !== input.counts.moduleQuizQuestions ||
    postQuizQuestions !== input.counts.postQuizQuestions ||
    moduleQuizQuestions + postQuizQuestions !== input.counts.quizQuestions
  ) {
    throw new Error('content-skeleton.yaml does not match the locked Release 1 baseline counts.');
  }

  for (const course of input.courses) {
    if (course.sourceCandidateIds.length === 0) {
      throw new Error(`Course ${course.courseId} has no source candidates.`);
    }
  }

  for (const module of modules) {
    if (
      !module.moduleQuizId ||
      module.moduleQuizQuestionCount < 5 ||
      module.moduleQuizQuestionCount > 8 ||
      (module.demoId === null) !== (module.demoProblemId === null)
    ) {
      throw new Error(`Module ${module.moduleId} has an invalid stable reference.`);
    }
  }

  for (const post of posts) {
    if (
      !post.postQuizId ||
      post.postQuizQuestionCount !== 3 ||
      JSON.stringify(post.activityIds) !== JSON.stringify(createExpectedActivityIds(post.postId))
    ) {
      throw new Error(`Post ${post.postId} has invalid stable quiz or activity references.`);
    }
  }
}

function createProvenance(candidateSourceIds: readonly string[]): DraftProvenance {
  return {
    candidateSourceIds,
    contentReviewStatus: 'pending-operator-review',
    externalEvidenceStatus: 'not-collected',
    importStatus: 'draft-only',
  };
}

function createDraftDocument(
  input: Omit<ReleaseContentDraftDocument, 'contentHash' | 'storagePath'>,
) {
  const storagePath = `${CONTENT_DRAFT_COLLECTION}/${input.entityType}_${input.entityId}`;
  const document = { ...input, storagePath };

  return {
    ...document,
    contentHash: createHashValue(document),
  } satisfies ReleaseContentDraftDocument;
}

export function createReleaseContentDraftManifest(): ReleaseContentDraftManifest {
  const parsedSkeleton = parseContentSkeleton();
  const documents: ReleaseContentDraftDocument[] = [];

  for (const course of parsedSkeleton.courses) {
    const provenance = createProvenance(course.sourceCandidateIds);
    documents.push(
      createDraftDocument({
        courseId: course.courseId,
        entityId: course.courseId,
        entityType: 'course',
        provenance,
        stableReferenceIds: [course.courseId],
      }),
    );

    for (const module of course.modules) {
      documents.push(
        createDraftDocument({
          courseId: course.courseId,
          entityId: module.moduleId,
          entityType: 'module',
          moduleId: module.moduleId,
          provenance,
          stableReferenceIds: [
            course.courseId,
            module.moduleId,
            module.moduleQuizId,
            ...(module.demoId ? [module.demoId] : []),
          ],
        }),
      );
      documents.push(
        createDraftDocument({
          courseId: course.courseId,
          entityId: module.moduleQuizId,
          entityType: 'quiz',
          moduleId: module.moduleId,
          provenance,
          quizKind: 'module',
          quizQuestionCount: module.moduleQuizQuestionCount,
          stableReferenceIds: [course.courseId, module.moduleId, module.moduleQuizId],
        }),
      );

      if (module.demoId && module.demoProblemId) {
        documents.push(
          createDraftDocument({
            courseId: course.courseId,
            demoProblemId: module.demoProblemId,
            entityId: module.demoId,
            entityType: 'demo',
            moduleId: module.moduleId,
            provenance,
            stableReferenceIds: [
              course.courseId,
              module.moduleId,
              module.demoId,
              module.demoProblemId,
            ],
          }),
        );
      }

      for (const post of module.posts) {
        documents.push(
          createDraftDocument({
            activityIds: post.activityIds,
            courseId: course.courseId,
            entityId: post.postId,
            entityType: 'post',
            moduleId: module.moduleId,
            postId: post.postId,
            provenance,
            stableReferenceIds: [
              course.courseId,
              module.moduleId,
              post.postId,
              post.postQuizId,
              ...post.activityIds,
            ],
          }),
        );
        documents.push(
          createDraftDocument({
            courseId: course.courseId,
            entityId: post.postQuizId,
            entityType: 'quiz',
            moduleId: module.moduleId,
            postId: post.postId,
            provenance,
            quizKind: 'post',
            quizQuestionCount: post.postQuizQuestionCount,
            stableReferenceIds: [course.courseId, module.moduleId, post.postId, post.postQuizId],
          }),
        );
      }
    }
  }

  return {
    counts: parsedSkeleton.counts,
    documents,
    inputHash: createHashValue({ counts: parsedSkeleton.counts, documents }),
    schemaVersion: 1,
  };
}

export async function diffReleaseContentDrafts(input: {
  manifest?: ReleaseContentDraftManifest;
  store: DraftContentDocumentStore;
}): Promise<readonly ContentDraftDiff[]> {
  const manifest = input.manifest ?? createReleaseContentDraftManifest();

  return Promise.all(
    manifest.documents.map(async (document) => {
      const existing = await input.store.get(document.storagePath);
      const status =
        existing?.contentHash === document.contentHash && existing?.inputHash === manifest.inputHash
          ? 'unchanged'
          : existing
            ? 'update'
            : 'create';

      return { document, status };
    }),
  );
}

export async function importReleaseContentDrafts(input: {
  dryRun: boolean;
  manifest?: ReleaseContentDraftManifest;
  store: DraftContentDocumentStore;
}): Promise<ContentDraftImportResult> {
  const manifest = input.manifest ?? createReleaseContentDraftManifest();
  const changes = await diffReleaseContentDrafts({ manifest, store: input.store });
  let created = 0;
  let unchanged = 0;
  let updated = 0;

  for (const { document, status } of changes) {
    if (status === 'unchanged') {
      unchanged += 1;
      continue;
    }

    if (status === 'update') {
      updated += 1;
    } else {
      created += 1;
    }

    if (!input.dryRun) {
      await input.store.set(document.storagePath, {
        ...document,
        importJobId: CONTENT_DRAFT_IMPORT_JOB_ID,
        inputHash: manifest.inputHash,
      });
    }
  }

  return {
    created,
    dryRun: input.dryRun,
    inputHash: manifest.inputHash,
    jobId: CONTENT_DRAFT_IMPORT_JOB_ID,
    unchanged,
    updated,
  };
}
