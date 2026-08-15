import { getReleaseLearningCatalog } from './release-learning-catalog.js';
import {
  getFixedDemo,
  getFixedDemoDeterministicProof,
  type FixedDemoManifest,
} from './release-demo-content.js';
import {
  getReadablePost,
  type TrialPost,
  vietnameseFirstUseTerminology,
} from './release-learning-content.js';
import {
  getReleaseQuizManifests,
  type QuizAnswerValue,
  type QuizManifest,
} from './quiz-manifest.js';

type ReleaseLearningCatalog = ReturnType<typeof getReleaseLearningCatalog>;

export interface ReleaseContentValidationFinding {
  code: string;
  message: string;
  path: string;
}

export interface ReleaseContentValidationInput {
  catalog: ReleaseLearningCatalog;
  demos: readonly FixedDemoManifest[];
  posts: readonly TrialPost[];
  quizzes: readonly QuizManifest[];
}

export interface ReleaseContentValidationReport {
  counts: {
    courses: number;
    demos: number;
    moduleQuizQuestions: number;
    modules: number;
    postQuizQuestions: number;
    posts: number;
    quizQuestions: number;
  };
  findings: readonly ReleaseContentValidationFinding[];
  status: 'invalid' | 'valid';
}

export interface ValidReleaseContentBaseline {
  counts: ReleaseContentValidationReport['counts'];
  status: 'valid';
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function addFinding(
  findings: ReleaseContentValidationFinding[],
  code: string,
  path: string,
  message: string,
): void {
  findings.push({ code, message, path });
}

function validateNonEmptyString(
  value: unknown,
  path: string,
  findings: ReleaseContentValidationFinding[],
): value is string {
  if (typeof value !== 'string' || !value.trim()) {
    addFinding(findings, 'TEXT_MISSING', path, 'Expected a non-empty string.');
    return false;
  }

  return true;
}

function collectStringLeaves(value: unknown, path = ''): Readonly<Record<string, unknown>> {
  if (typeof value === 'string') {
    return { [path]: value };
  }

  if (Array.isArray(value)) {
    return Object.assign(
      {},
      ...value.map((item, index) => collectStringLeaves(item, `${path}[${index}]`)),
    );
  }

  if (isRecord(value)) {
    return Object.assign(
      {},
      ...Object.entries(value).map(([key, nestedValue]) =>
        collectStringLeaves(nestedValue, path ? `${path}.${key}` : key),
      ),
    );
  }

  return {};
}

function validateLocalizedRecord(
  value: unknown,
  path: string,
  findings: ReleaseContentValidationFinding[],
): void {
  if (!isRecord(value) || !isRecord(value.en) || !isRecord(value.vi)) {
    addFinding(
      findings,
      'LOCALE_SHAPE_INVALID',
      path,
      'Expected both en and vi localized records.',
    );
    return;
  }

  const englishLeaves = collectStringLeaves(value.en);
  const vietnameseLeaves = collectStringLeaves(value.vi);
  const leafPaths = new Set([...Object.keys(englishLeaves), ...Object.keys(vietnameseLeaves)]);

  if (leafPaths.size === 0) {
    addFinding(findings, 'LOCALE_TEXT_MISSING', path, 'Localized content has no text leaves.');
  }

  for (const leafPath of leafPaths) {
    validateNonEmptyString(englishLeaves[leafPath], `${path}.en.${leafPath}`, findings);
    validateNonEmptyString(vietnameseLeaves[leafPath], `${path}.vi.${leafPath}`, findings);
  }
}

function validateLocalizedText(
  value: unknown,
  path: string,
  findings: ReleaseContentValidationFinding[],
): void {
  if (!isRecord(value)) {
    addFinding(findings, 'LOCALE_SHAPE_INVALID', path, 'Expected a localized text object.');
    return;
  }

  validateNonEmptyString(value.en, `${path}.en`, findings);
  validateNonEmptyString(value.vi, `${path}.vi`, findings);
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validateVietnameseFirstUseTerminology(
  post: TrialPost,
  path: string,
  findings: ReleaseContentValidationFinding[],
): void {
  const vietnameseLearnerText = [
    post.title.vi,
    post.description.vi,
    post.learningObjective.vi,
    ...post.blocks.flatMap((block) => Object.values(collectStringLeaves(block.locales.vi))),
  ]
    .filter((value): value is string => typeof value === 'string')
    .join('\n');

  for (const term of vietnameseFirstUseTerminology) {
    const expression = new RegExp(`\\b${escapeRegularExpression(term.english)}\\b`, 'i');
    const match = expression.exec(vietnameseLearnerText);

    if (!match || match.index === undefined) {
      continue;
    }

    const annotationPrefix = `${term.vietnamese} (`;
    const annotationStart = match.index - annotationPrefix.length;
    const annotationEnd = match.index + match[0].length + 1;
    const expectedAnnotation = `${annotationPrefix}${match[0]})`;

    if (
      vietnameseLearnerText.slice(annotationStart, annotationEnd).toLocaleLowerCase('vi-VN') !==
      expectedAnnotation.toLocaleLowerCase('vi-VN')
    ) {
      addFinding(
        findings,
        'TERMINOLOGY_FIRST_USE_INVALID',
        path,
        `The first Vietnamese use of ${term.english} must include its Vietnamese explanation.`,
      );
    }
  }
}

function validateTaskFingerprint(
  value: string,
  path: string,
  findings: ReleaseContentValidationFinding[],
): void {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    addFinding(
      findings,
      'TASK_FINGERPRINT_INVALID',
      path,
      'Task fingerprints must be canonical SHA-256 values.',
    );
  }
}

function validateNoGenericContentMarkers(
  value: unknown,
  path: string,
  findings: ReleaseContentValidationFinding[],
): void {
  const marker = /\b(?:generic|placeholder|lorem ipsum)\b/i;

  for (const [leafPath, text] of Object.entries(collectStringLeaves(value))) {
    if (marker.test(text as string)) {
      addFinding(
        findings,
        'GENERIC_CONTENT_FORBIDDEN',
        `${path}.${leafPath}`,
        'Release baseline units must contain topic-specific content, not generic or placeholder text.',
      );
    }
  }
}

function isSafeContentUrl(value: string): boolean {
  if (value.startsWith('/')) {
    return true;
  }

  try {
    const url = new URL(value);

    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

function validateUrls(
  value: unknown,
  path: string,
  findings: ReleaseContentValidationFinding[],
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateUrls(item, `${path}[${index}]`, findings));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = `${path}.${key}`;

    if (/(url|href|link)$/i.test(key) && nestedValue !== null && nestedValue !== undefined) {
      if (typeof nestedValue !== 'string' || !isSafeContentUrl(nestedValue)) {
        addFinding(
          findings,
          'URL_INVALID',
          nestedPath,
          'Content links must be safe HTTPS URLs without credentials or internal paths.',
        );
      }
    }

    validateUrls(nestedValue, nestedPath, findings);
  }
}

function hasExactValues(actual: readonly string[], expected: readonly string[]): boolean {
  return (
    actual.length === expected.length && actual.every((value, index) => value === expected[index])
  );
}

function validateUniqueStrings(
  values: readonly string[],
  path: string,
  findings: ReleaseContentValidationFinding[],
): void {
  if (values.some((value) => !value.trim())) {
    addFinding(findings, 'STABLE_ID_MISSING', path, 'Stable IDs must be non-empty.');
  }

  if (new Set(values).size !== values.length) {
    addFinding(findings, 'STABLE_ID_DUPLICATE', path, 'Stable IDs must be unique.');
  }
}

function expectedPostActivityIds(postId: string): readonly string[] {
  return [
    `act-${postId}-example`,
    `act-${postId}-quiz-01`,
    `act-${postId}-quiz-02`,
    `act-${postId}-quiz-03`,
  ];
}

function validatePinnedProvenance(
  provenance:
    | TrialPost['provenance']
    | FixedDemoManifest['draftProvenance']
    | QuizManifest['draftProvenance'],
  path: string,
  findings: ReleaseContentValidationFinding[],
): readonly string[] {
  if (
    !provenance ||
    provenance.contentReviewStatus !== 'pending-operator-review' ||
    provenance.externalEvidenceStatus !== 'not-collected' ||
    provenance.importStatus !== 'draft-only'
  ) {
    addFinding(
      findings,
      'REVIEW_STATE_INVALID',
      path,
      'Baseline content must remain pending-operator-review and draft-only.',
    );
  }

  if (!provenance?.sourceTrace || provenance.sourceTrace.kind !== 'snapshot-pinned') {
    addFinding(
      findings,
      'SOURCE_TRACE_MISSING',
      path,
      'Baseline content must use a snapshot-pinned source trace.',
    );
    return [];
  }

  const sourceIds = [
    ...new Set(provenance.sourceTrace.sourceSnapshots.map((source) => source.sourceId)),
  ];
  validateUniqueStrings(sourceIds, `${path}.sourceSnapshots`, findings);

  if (!hasExactValues([...provenance.candidateSourceIds].sort(), [...sourceIds].sort())) {
    addFinding(
      findings,
      'SOURCE_TRACE_CANDIDATE_MISMATCH',
      path,
      'Candidate source IDs must exactly match snapshot-pinned source IDs.',
    );
  }

  for (const source of provenance.sourceTrace.sourceSnapshots) {
    const sourcePath = `${path}.sourceSnapshots[${source.sourceId}]`;
    validateNonEmptyString(source.sourceName, `${sourcePath}.sourceName`, findings);
    validateLocalizedText(source.attribution, `${sourcePath}.attribution`, findings);
    validateNonEmptyString(source.license.id, `${sourcePath}.license.id`, findings);
    validateNonEmptyString(source.license.name, `${sourcePath}.license.name`, findings);

    if (!/^[a-f0-9]{64}$/.test(source.contentSnapshotHash)) {
      addFinding(
        findings,
        'SOURCE_CHECKSUM_INVALID',
        `${sourcePath}.contentSnapshotHash`,
        'Source snapshot hashes must be SHA-256 values.',
      );
    }

    for (const url of [...source.contentUrls, source.license.url]) {
      if (!isSafeContentUrl(url)) {
        addFinding(
          findings,
          'URL_INVALID',
          sourcePath,
          'Pinned source URLs must be safe HTTPS URLs.',
        );
      }
    }
  }

  return sourceIds;
}

function validateSourceIds(
  sourceIds: readonly string[],
  allowedSourceIds: readonly string[],
  path: string,
  findings: ReleaseContentValidationFinding[],
): void {
  if (sourceIds.length === 0) {
    addFinding(
      findings,
      'SOURCE_REFERENCE_MISSING',
      path,
      'Content units must reference a source.',
    );
    return;
  }

  validateUniqueStrings(sourceIds, path, findings);

  for (const sourceId of sourceIds) {
    if (!allowedSourceIds.includes(sourceId)) {
      addFinding(
        findings,
        'SOURCE_REFERENCE_UNPINNED',
        path,
        `Source ${sourceId} is not present in this unit's pinned source trace.`,
      );
    }
  }
}

function validateAnswerValue(
  answer: QuizAnswerValue,
  optionIds: readonly string[],
  path: string,
  findings: ReleaseContentValidationFinding[],
): void {
  const values = Array.isArray(answer) ? answer : [answer];

  if (values.length === 0 || values.some((value) => !optionIds.includes(value))) {
    addFinding(
      findings,
      'QUIZ_ANSWER_INVALID',
      path,
      'Correct answer values must reference available option IDs.',
    );
  }
}

export function createReleaseContentValidationInput(): ReleaseContentValidationInput {
  const catalog = getReleaseLearningCatalog();
  const posts = catalog.courses.flatMap((course) =>
    course.modules.flatMap((module) =>
      module.posts.map((post) => {
        const content = getReadablePost(course.courseId, post.postId, true);

        if (!content) {
          throw new Error(`Missing baseline post ${post.postId}.`);
        }

        return content;
      }),
    ),
  );
  const demos = catalog.courses.flatMap((course) =>
    course.modules.flatMap((module) => {
      if (!module.demoId) {
        return [];
      }

      const demo = getFixedDemo(module.demoId);

      if (!demo) {
        throw new Error(`Missing baseline demo ${module.demoId}.`);
      }

      return [demo];
    }),
  );

  return { catalog, demos, posts, quizzes: getReleaseQuizManifests() };
}

export function validateReleaseContentBaseline(
  input: ReleaseContentValidationInput = createReleaseContentValidationInput(),
): ReleaseContentValidationReport {
  const findings: ReleaseContentValidationFinding[] = [];
  const modules = input.catalog.courses.flatMap((course) => course.modules);
  const catalogPosts = modules.flatMap((module) => module.posts);
  const expectedDemoIds = modules
    .map((module) => module.demoId)
    .filter((demoId): demoId is string => demoId !== null);
  const expectedQuizIds = [
    ...modules.map((module) => module.moduleQuizId),
    ...catalogPosts.map((post) => post.postQuizId),
  ].sort();
  const counts = {
    courses: input.catalog.courses.length,
    demos: input.demos.length,
    moduleQuizQuestions: input.quizzes
      .filter((quiz) => quiz.quizKind === 'module')
      .reduce((total, quiz) => total + quiz.questions.length, 0),
    modules: modules.length,
    postQuizQuestions: input.quizzes
      .filter((quiz) => quiz.quizKind === 'post')
      .reduce((total, quiz) => total + quiz.questions.length, 0),
    posts: input.posts.length,
    quizQuestions: input.quizzes.reduce((total, quiz) => total + quiz.questions.length, 0),
  };

  const expectedCounts = {
    courses: 2,
    demos: 10,
    moduleQuizQuestions: 72,
    modules: 12,
    postQuizQuestions: 54,
    posts: 18,
    quizQuestions: 126,
  };

  if (JSON.stringify(counts) !== JSON.stringify(expectedCounts)) {
    addFinding(
      findings,
      'BASELINE_COUNT_MISMATCH',
      'baseline.counts',
      'Course content must preserve the exact locked baseline counts.',
    );
  }

  validateUniqueStrings(
    input.posts.map((post) => post.id),
    'posts',
    findings,
  );
  validateUniqueStrings(
    input.demos.map((demo) => demo.demoId),
    'demos',
    findings,
  );
  validateUniqueStrings(
    input.quizzes.map((quiz) => quiz.quizId),
    'quizzes',
    findings,
  );

  if (
    !hasExactValues(
      input.posts.map((post) => post.id).sort(),
      catalogPosts.map((post) => post.postId).sort(),
    )
  ) {
    addFinding(
      findings,
      'POST_SCOPE_MISMATCH',
      'posts',
      'Posts must exactly match the locked catalog.',
    );
  }

  if (!hasExactValues(input.demos.map((demo) => demo.demoId).sort(), expectedDemoIds.sort())) {
    addFinding(
      findings,
      'DEMO_SCOPE_MISMATCH',
      'demos',
      'Demos must exactly match the locked catalog.',
    );
  }

  if (!hasExactValues(input.quizzes.map((quiz) => quiz.quizId).sort(), expectedQuizIds)) {
    addFinding(
      findings,
      'QUIZ_SCOPE_MISMATCH',
      'quizzes',
      'Quizzes must exactly match the locked catalog.',
    );
  }

  const catalogPostById = new Map(catalogPosts.map((post) => [post.postId, post]));
  const moduleById = new Map(modules.map((module) => [module.moduleId, module]));
  const postFingerprints = input.posts.map((post) => post.taskFingerprint);
  const demoFingerprints = input.demos.map((demo) => demo.taskFingerprint);
  const quizFingerprints = input.quizzes.map((quiz) => quiz.taskFingerprint);
  const questionFingerprints = input.quizzes.flatMap((quiz) =>
    quiz.questions.map((question) => question.taskFingerprint),
  );

  validateUniqueStrings(postFingerprints, 'posts.taskFingerprint', findings);
  validateUniqueStrings(demoFingerprints, 'demos.taskFingerprint', findings);
  validateUniqueStrings(quizFingerprints, 'quizzes.taskFingerprint', findings);
  validateUniqueStrings(questionFingerprints, 'questions.taskFingerprint', findings);

  if (new Set(postFingerprints).size !== input.posts.length) {
    addFinding(
      findings,
      'TASK_FINGERPRINT_DUPLICATE',
      'posts',
      'Posts require unique semantic fingerprints.',
    );
  }

  if (new Set(demoFingerprints).size !== input.demos.length) {
    addFinding(
      findings,
      'TASK_FINGERPRINT_DUPLICATE',
      'demos',
      'Demos require unique semantic fingerprints.',
    );
  }

  if (new Set(quizFingerprints).size !== input.quizzes.length) {
    addFinding(
      findings,
      'TASK_FINGERPRINT_DUPLICATE',
      'quizzes',
      'Quizzes require unique semantic fingerprints.',
    );
  }

  if (new Set(questionFingerprints).size !== counts.quizQuestions) {
    addFinding(
      findings,
      'TASK_FINGERPRINT_DUPLICATE',
      'questions',
      'Quiz questions require unique semantic fingerprints.',
    );
  }

  for (const post of input.posts) {
    const path = `posts[${post.id}]`;
    const catalogPost = catalogPostById.get(post.id);
    const module = moduleById.get(post.moduleId);
    const sourceIds = validatePinnedProvenance(post.provenance, `${path}.provenance`, findings);

    if (!catalogPost || !module || post.postQuizId !== catalogPost.postQuizId) {
      addFinding(
        findings,
        'POST_REFERENCE_INVALID',
        path,
        'Post references must match the locked catalog.',
      );
    }

    validateLocalizedText(post.title, `${path}.title`, findings);
    validateLocalizedText(post.description, `${path}.description`, findings);
    validateLocalizedText(post.learningObjective, `${path}.learningObjective`, findings);
    validateTaskFingerprint(post.taskFingerprint, `${path}.taskFingerprint`, findings);
    validateVietnameseFirstUseTerminology(post, path, findings);
    validateNoGenericContentMarkers(post, path, findings);

    if (post.blocks.length === 0 || post.blocks.length > 12) {
      addFinding(
        findings,
        'POST_BLOCK_COUNT_INVALID',
        `${path}.blocks`,
        'Posts require 1-12 blocks.',
      );
    }

    validateUniqueStrings(
      post.blocks.map((block) => block.id),
      `${path}.blocks`,
      findings,
    );
    const examples = post.blocks.filter((block) => block.type === 'example');

    if (
      examples.length !== 1 ||
      examples[0]?.activityId !== expectedPostActivityIds(post.id)[0] ||
      post.blocks.some((block) => block.type !== 'example' && block.activityId !== null)
    ) {
      addFinding(
        findings,
        'POST_ACTIVITY_REFERENCE_INVALID',
        `${path}.blocks`,
        'Posts must contain exactly one expected example activity and no other block activity IDs.',
      );
    }

    for (const block of post.blocks) {
      const blockPath = `${path}.blocks[${block.id}]`;
      validateLocalizedRecord(block.locales, `${blockPath}.locales`, findings);
      validateSourceIds(block.sourceIds, sourceIds, `${blockPath}.sourceIds`, findings);
      validateUniqueStrings(block.assetIds, `${blockPath}.assetIds`, findings);
      validateUrls(block, blockPath, findings);
    }
  }

  const demoProblemIds = input.demos.map((demo) => demo.problemId);
  validateUniqueStrings(demoProblemIds, 'demos.problemId', findings);

  for (const demo of input.demos) {
    const path = `demos[${demo.demoId}]`;
    const module = modules.find((candidate) => candidate.demoId === demo.demoId);
    const sourceIds = validatePinnedProvenance(
      demo.draftProvenance,
      `${path}.provenance`,
      findings,
    );

    if (!module || demo.problemId !== module.demoProblemId || demo.moduleId !== module.moduleId) {
      addFinding(
        findings,
        'DEMO_REFERENCE_INVALID',
        path,
        'Demo references must match the locked catalog.',
      );
    }

    if (!/^problem-demo-[a-z0-9-]+$/.test(demo.problemId)) {
      addFinding(
        findings,
        'DEMO_PROBLEM_ID_INVALID',
        `${path}.problemId`,
        'Demo problem IDs require the demo namespace.',
      );
    }

    if (!/^[a-z0-9-]+-v\d+$/.test(demo.adapterVersion)) {
      addFinding(
        findings,
        'DEMO_ADAPTER_VERSION_INVALID',
        `${path}.adapterVersion`,
        'Demo adapter versions must be versioned stable IDs.',
      );
    }

    if (!/^[a-f0-9]{64}$/.test(demo.resultHash)) {
      addFinding(
        findings,
        'DEMO_RESULT_HASH_INVALID',
        `${path}.resultHash`,
        'Demo result hashes must be SHA-256 values.',
      );
    }

    const expectedDeterministicProof = getFixedDemoDeterministicProof(demo);

    if (demo.resultHash !== expectedDeterministicProof.resultHash) {
      addFinding(
        findings,
        'DEMO_RESULT_HASH_MISMATCH',
        `${path}.resultHash`,
        'Demo result hashes must match the fixed run, adapter, and visualization payload.',
      );
    }

    validateTaskFingerprint(demo.taskFingerprint, `${path}.taskFingerprint`, findings);
    validateNoGenericContentMarkers(demo, path, findings);

    validateSourceIds(demo.sourceIds, sourceIds, `${path}.sourceIds`, findings);
    validateLocalizedText(demo.title, `${path}.title`, findings);
    validateLocalizedText(demo.learningObjective, `${path}.learningObjective`, findings);

    const requiredStepIds = demo.steps.filter((step) => step.required).map((step) => step.id);

    if (!hasExactValues(demo.requiredStepIds, requiredStepIds)) {
      addFinding(
        findings,
        'DEMO_REQUIRED_STEPS_INVALID',
        `${path}.requiredStepIds`,
        'Required demo step IDs must exactly match required steps.',
      );
    }

    validateUniqueStrings(
      demo.steps.map((step) => step.id),
      `${path}.steps`,
      findings,
    );

    for (const step of demo.steps) {
      const stepPath = `${path}.steps[${step.id}]`;

      if (!Number.isInteger(step.durationMs) || step.durationMs <= 0) {
        addFinding(
          findings,
          'DEMO_DURATION_INVALID',
          `${stepPath}.durationMs`,
          'Demo steps require a positive duration.',
        );
      }

      validateLocalizedText(step.narration, `${stepPath}.narration`, findings);
      validateLocalizedText(step.textAlternative, `${stepPath}.textAlternative`, findings);
      validateLocalizedText(step.title, `${stepPath}.title`, findings);
    }

    const totalDurationMs = demo.steps.reduce((total, step) => total + step.durationMs, 0);

    if (
      demo.visualFixture.version !== 'release-fixed-demo-visual-v1' ||
      !/^[a-f0-9]{64}$/.test(demo.visualFixture.hash) ||
      demo.visualFixture.totalDurationMs !== totalDurationMs
    ) {
      addFinding(
        findings,
        'DEMO_VISUAL_FIXTURE_INVALID',
        `${path}.visualFixture`,
        'Demo visual fixtures must carry a matching deterministic proof.',
      );
    }

    if (demo.visualFixture.hash !== expectedDeterministicProof.visualFixture.hash) {
      addFinding(
        findings,
        'DEMO_VISUAL_FIXTURE_MISMATCH',
        `${path}.visualFixture.hash`,
        'Demo visual fixture hashes must match the fixed visual payload.',
      );
    }

    if (
      !demo.fixedRun ||
      demo.visualization.boundary.length === 0 ||
      demo.visualization.points.length === 0
    ) {
      addFinding(
        findings,
        'DEMO_FIXED_OUTPUT_MISSING',
        path,
        'Demos require a fixed run and visual fixture data.',
      );
    }
  }

  for (const quiz of input.quizzes) {
    const path = `quizzes[${quiz.quizId}]`;
    const module = moduleById.get(quiz.moduleId);
    const sourceIds = validatePinnedProvenance(
      quiz.draftProvenance,
      `${path}.provenance`,
      findings,
    );
    const expectedQuestionCount = quiz.quizKind === 'post' ? 3 : 6;

    validateNoGenericContentMarkers(quiz, path, findings);

    if (
      !module ||
      quiz.questions.length !== expectedQuestionCount ||
      quiz.questionCount !== expectedQuestionCount
    ) {
      addFinding(
        findings,
        'QUIZ_COUNT_INVALID',
        path,
        'Quiz question counts must match the locked baseline.',
      );
    }

    if (quiz.quizKind === 'post') {
      const catalogPost = quiz.postId ? catalogPostById.get(quiz.postId) : undefined;

      if (!catalogPost || quiz.quizId !== catalogPost.postQuizId) {
        addFinding(
          findings,
          'QUIZ_REFERENCE_INVALID',
          path,
          'Post quiz references must match the locked post.',
        );
      }
    } else if (quiz.postId !== null || quiz.quizId !== module?.moduleQuizId) {
      addFinding(
        findings,
        'QUIZ_REFERENCE_INVALID',
        path,
        'Module quiz references must match the locked module.',
      );
    }

    validateLocalizedText(quiz.mastery, `${path}.mastery`, findings);
    validateUniqueStrings(
      quiz.questions.map((question) => question.questionId),
      `${path}.questions`,
      findings,
    );

    for (const [index, question] of quiz.questions.entries()) {
      const questionPath = `${path}.questions[${question.questionId}]`;
      const optionIds = question.options.map((option) => option.optionId);

      validateTaskFingerprint(
        question.taskFingerprint,
        `${questionPath}.taskFingerprint`,
        findings,
      );

      if ('problemId' in question) {
        addFinding(
          findings,
          'QUIZ_PROBLEM_ID_FORBIDDEN',
          questionPath,
          'Quiz questions cannot reuse demo or Playground problem IDs.',
        );
      }

      if (quiz.quizKind === 'post') {
        const expectedActivityId = `act-${quiz.postId}-quiz-${String(index + 1).padStart(2, '0')}`;

        if (question.activityId !== expectedActivityId) {
          addFinding(
            findings,
            'QUIZ_ACTIVITY_REFERENCE_INVALID',
            `${questionPath}.activityId`,
            'Post quiz questions must use the locked activity ID in order.',
          );
        }
      } else if ('activityId' in question) {
        addFinding(
          findings,
          'MODULE_QUIZ_ACTIVITY_FORBIDDEN',
          questionPath,
          'Module quiz questions must not create global activity IDs.',
        );
      }

      validateLocalizedText(question.prompt, `${questionPath}.prompt`, findings);
      validateLocalizedText(question.explanation, `${questionPath}.explanation`, findings);
      validateLocalizedText(question.hints[0], `${questionPath}.hints[0]`, findings);
      validateLocalizedText(question.hints[1], `${questionPath}.hints[1]`, findings);
      validateSourceIds(
        question.sourceIds ?? [question.sourceId],
        sourceIds,
        `${questionPath}.sourceIds`,
        findings,
      );
      validateUniqueStrings(optionIds, `${questionPath}.options`, findings);
      validateAnswerValue(
        question.correctAnswer,
        optionIds,
        `${questionPath}.correctAnswer`,
        findings,
      );

      for (const option of question.options) {
        validateLocalizedText(
          option.text,
          `${questionPath}.options[${option.optionId}].text`,
          findings,
        );
      }
    }

    validateTaskFingerprint(quiz.taskFingerprint, `${path}.taskFingerprint`, findings);
  }

  validateUrls(
    { demos: input.demos, posts: input.posts, quizzes: input.quizzes },
    'baseline',
    findings,
  );

  return {
    counts,
    findings,
    status: findings.length === 0 ? 'valid' : 'invalid',
  };
}

export function assertReleaseContentBaseline(
  input: ReleaseContentValidationInput = createReleaseContentValidationInput(),
): ValidReleaseContentBaseline {
  const report = validateReleaseContentBaseline(input);

  if (report.status === 'invalid') {
    throw new Error(
      `Release content baseline validation failed:\n${report.findings
        .map((finding) => `- [${finding.code}] ${finding.path}: ${finding.message}`)
        .join('\n')}`,
    );
  }

  return { counts: report.counts, status: 'valid' };
}
