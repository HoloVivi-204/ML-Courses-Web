import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface LockedContentCounts {
  courses: number;
  demos: number;
  moduleQuizQuestions: number;
  modules: number;
  postQuizQuestions: number;
  posts: number;
  quizQuestions: number;
}

export interface LockedContentPost {
  activityIds: readonly string[];
  postId: string;
  postQuizId: string;
  postQuizQuestionCount: number;
}

export interface LockedContentModule {
  demoId: string | null;
  demoProblemId: string | null;
  moduleId: string;
  moduleQuizId: string;
  moduleQuizQuestionCount: number;
  posts: readonly LockedContentPost[];
}

export interface LockedContentCourse {
  courseId: string;
  modules: readonly LockedContentModule[];
  sourceIds: readonly string[];
}

export interface LockedContentScope {
  counts: LockedContentCounts;
  courses: readonly LockedContentCourse[];
  modules: readonly LockedContentModule[];
  posts: readonly LockedContentPost[];
  rawSkeleton: string;
  sourceIds: readonly string[];
}

const LOCKED_COUNTS: LockedContentCounts = {
  courses: 2,
  demos: 10,
  moduleQuizQuestions: 72,
  modules: 12,
  postQuizQuestions: 54,
  posts: 18,
  quizQuestions: 126,
};

function getRepositoryFilePath(fileName: string): string {
  return fileURLToPath(new URL(`../../../${fileName}`, import.meta.url));
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

function getRequiredNumber(lines: readonly string[], key: keyof LockedContentCounts): number {
  const expression = new RegExp(`^\\s*${key}: (\\d+)$`);
  const match = lines.map((line) => expression.exec(line)).find(Boolean);

  if (!match?.[1]) {
    throw new Error(`content-skeleton.yaml is missing numeric ${key}.`);
  }

  return Number(match[1]);
}

function createExpectedActivityIds(postId: string): readonly string[] {
  return [
    `act-${postId}-example`,
    `act-${postId}-quiz-01`,
    `act-${postId}-quiz-02`,
    `act-${postId}-quiz-03`,
  ];
}

function assertUnique(values: readonly string[], subject: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`${subject} contains duplicate stable IDs.`);
  }
}

function assertLockedCounts(counts: LockedContentCounts): void {
  for (const [key, expectedValue] of Object.entries(LOCKED_COUNTS) as [
    keyof LockedContentCounts,
    number,
  ][]) {
    if (counts[key] !== expectedValue) {
      throw new Error(
        `content-skeleton.yaml must lock ${key} to ${expectedValue}, received ${counts[key]}.`,
      );
    }
  }
}

function parseContentSkeleton(rawSkeleton: string): {
  counts: LockedContentCounts;
  courses: LockedContentCourse[];
} {
  const lines = rawSkeleton.split(/\r?\n/);
  const courses: LockedContentCourse[] = [];
  let currentCourse: {
    courseId: string;
    modules: LockedContentModule[];
    sourceIds: readonly string[];
  } | null = null;
  let currentModule: {
    demoId: string | null;
    demoProblemId: string | null;
    moduleId: string;
    moduleQuizId: string;
    moduleQuizQuestionCount: number;
    posts: LockedContentPost[];
  } | null = null;
  let currentPost: {
    activityIds: readonly string[];
    postId: string;
    postQuizId: string;
    postQuizQuestionCount: number;
  } | null = null;

  for (const line of lines) {
    const courseMatch = /^ {2}- courseId: ([a-z0-9-]+)$/.exec(line);

    if (courseMatch?.[1]) {
      currentCourse = {
        courseId: courseMatch[1],
        modules: [],
        sourceIds: [],
      };
      courses.push(currentCourse);
      currentModule = null;
      currentPost = null;
      continue;
    }

    const sourceIdsMatch = /^ {4}sourceCandidates: (\[.*])$/.exec(line);

    if (sourceIdsMatch?.[1] && currentCourse) {
      currentCourse.sourceIds = getInlineList(sourceIdsMatch[1]);
      continue;
    }

    const moduleMatch = /^ {6}- moduleId: ([a-z0-9-]+)$/.exec(line);

    if (moduleMatch?.[1]) {
      if (!currentCourse) {
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
      currentCourse.modules.push(currentModule);
      currentPost = null;
      continue;
    }

    if (!currentModule) {
      continue;
    }

    const demoIdMatch = /^ {8}demoId: (null|[a-z0-9-]+)$/.exec(line);
    if (demoIdMatch?.[1]) {
      currentModule.demoId = demoIdMatch[1] === 'null' ? null : demoIdMatch[1];
      continue;
    }

    const demoProblemIdMatch = /^ {8}demoProblemId: (null|[a-z0-9-]+)$/.exec(line);
    if (demoProblemIdMatch?.[1]) {
      currentModule.demoProblemId = demoProblemIdMatch[1] === 'null' ? null : demoProblemIdMatch[1];
      continue;
    }

    const moduleQuizIdMatch = /^ {8}moduleQuizId: ([a-z0-9-]+)$/.exec(line);
    if (moduleQuizIdMatch?.[1]) {
      currentModule.moduleQuizId = moduleQuizIdMatch[1];
      continue;
    }

    const moduleQuizQuestionCountMatch = /^ {8}moduleQuizQuestionCount: (\d+)$/.exec(line);
    if (moduleQuizQuestionCountMatch?.[1]) {
      currentModule.moduleQuizQuestionCount = Number(moduleQuizQuestionCountMatch[1]);
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
      currentModule.posts.push(currentPost);
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

    const postQuizQuestionCountMatch = /^ {12}postQuizQuestionCount: (\d+)$/.exec(line);
    if (postQuizQuestionCountMatch?.[1]) {
      currentPost.postQuizQuestionCount = Number(postQuizQuestionCountMatch[1]);
      continue;
    }

    const activityIdsMatch = /^ {12}activityIds: (\[.*])$/.exec(line);
    if (activityIdsMatch?.[1]) {
      currentPost.activityIds = getInlineList(activityIdsMatch[1]);
    }
  }

  return {
    counts: {
      courses: getRequiredNumber(lines, 'courses'),
      demos: getRequiredNumber(lines, 'demos'),
      moduleQuizQuestions: getRequiredNumber(lines, 'moduleQuizQuestions'),
      modules: getRequiredNumber(lines, 'modules'),
      postQuizQuestions: getRequiredNumber(lines, 'postQuizQuestions'),
      posts: getRequiredNumber(lines, 'posts'),
      quizQuestions: getRequiredNumber(lines, 'quizQuestions'),
    },
    courses,
  };
}

export function validateLockedContentScope(rawSkeleton: string): LockedContentScope {
  const { counts, courses } = parseContentSkeleton(rawSkeleton);
  const modules = courses.flatMap((course) => course.modules);
  const posts = modules.flatMap((module) => module.posts);
  const demos = modules.filter((module) => module.demoId !== null);
  const sourceIds = [...new Set(courses.flatMap((course) => course.sourceIds))].sort();
  const moduleQuizQuestions = modules.reduce(
    (total, module) => total + module.moduleQuizQuestionCount,
    0,
  );
  const postQuizQuestions = posts.reduce((total, post) => total + post.postQuizQuestionCount, 0);

  assertLockedCounts(counts);

  if (
    courses.length !== counts.courses ||
    modules.length !== counts.modules ||
    posts.length !== counts.posts ||
    demos.length !== counts.demos ||
    moduleQuizQuestions !== counts.moduleQuizQuestions ||
    postQuizQuestions !== counts.postQuizQuestions ||
    moduleQuizQuestions + postQuizQuestions !== counts.quizQuestions
  ) {
    throw new Error('content-skeleton.yaml does not match the locked Release 1 baseline counts.');
  }

  assertUnique(
    courses.map((course) => course.courseId),
    'Courses',
  );
  assertUnique(
    modules.map((module) => module.moduleId),
    'Modules',
  );
  assertUnique(
    posts.map((post) => post.postId),
    'Posts',
  );
  assertUnique(
    modules.flatMap((module) => [module.moduleQuizId, ...(module.demoId ? [module.demoId] : [])]),
    'Module quiz and demo',
  );
  assertUnique(
    posts.map((post) => post.postQuizId),
    'Post quizzes',
  );

  for (const course of courses) {
    if (course.sourceIds.length === 0) {
      throw new Error(`Course ${course.courseId} has no source candidates.`);
    }

    assertUnique(course.sourceIds, `Course ${course.courseId} source candidates`);
  }

  for (const module of modules) {
    if (
      !module.moduleQuizId ||
      module.moduleQuizQuestionCount !== 6 ||
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

  return {
    counts,
    courses,
    modules,
    posts,
    rawSkeleton,
    sourceIds,
  };
}

export function getLockedContentScope(): LockedContentScope {
  return validateLockedContentScope(
    readFileSync(getRepositoryFilePath('content-skeleton.yaml'), 'utf8'),
  );
}
