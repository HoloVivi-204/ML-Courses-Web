interface LearningAccessGrant {
  courseId: string;
  demoId?: string;
  moduleId?: string;
  postId?: string;
  uid: string;
}

interface LearningContentAccessItem {
  contentType: 'demo' | 'module' | 'post';
  entityId: string;
}

const STORAGE_KEY = 'ml-path-learning-access-grants';

export function rememberLearningAccessGrant(grant: LearningAccessGrant) {
  try {
    if (!isLearningAccessGrant(grant)) {
      return;
    }

    const grants = readLearningAccessGrants();
    const nextGrants = [
      ...grants.filter(
        (item) =>
          item.courseId !== grant.courseId ||
          item.demoId !== grant.demoId ||
          item.moduleId !== grant.moduleId ||
          item.postId !== grant.postId ||
          item.uid !== grant.uid,
      ),
      grant,
    ];

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextGrants));
  } catch {
    return;
  }
}

export function rememberLearningContentAccessGrants(input: {
  contentAccess: readonly LearningContentAccessItem[];
  courseId: string;
  uid: string;
}) {
  for (const item of input.contentAccess) {
    const stableItem = toStableContentAccessItem(item);

    if (!stableItem) {
      continue;
    }

    rememberLearningAccessGrant({
      courseId: input.courseId,
      uid: input.uid,
      ...(stableItem.contentType === 'demo' ? { demoId: stableItem.entityId } : {}),
      ...(stableItem.contentType === 'module' ? { moduleId: stableItem.entityId } : {}),
      ...(stableItem.contentType === 'post' ? { postId: stableItem.entityId } : {}),
    });
  }
}

export function hasLearningPostAccess(
  courseId: string | undefined,
  postId: string | undefined,
  uid: string | undefined,
) {
  if (!courseId || !postId || !uid) {
    return false;
  }

  return readLearningAccessGrants().some(
    (grant) => grant.courseId === courseId && grant.postId === postId && grant.uid === uid,
  );
}

export function hasLearningModuleAccess(
  courseId: string | undefined,
  moduleId: string | undefined,
  uid: string | undefined,
) {
  if (!courseId || !moduleId || !uid) {
    return false;
  }

  return readLearningAccessGrants().some(
    (grant) => grant.courseId === courseId && grant.moduleId === moduleId && grant.uid === uid,
  );
}

export function hasLearningDemoAccess(
  courseId: string | undefined,
  demoId: string | undefined,
  uid: string | undefined,
) {
  if (!courseId || !demoId || !uid) {
    return false;
  }

  return readLearningAccessGrants().some(
    (grant) => grant.courseId === courseId && grant.demoId === demoId && grant.uid === uid,
  );
}

function readLearningAccessGrants(): LearningAccessGrant[] {
  try {
    const rawValue = sessionStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isLearningAccessGrant);
  } catch {
    return [];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasRevisionPinField(value: object): boolean {
  return Object.keys(value).some(
    (fieldName) => fieldName === 'revisionId' || fieldName.endsWith('RevisionId'),
  );
}

function toStableContentAccessItem(value: unknown): LearningContentAccessItem | null {
  if (!isRecord(value) || hasRevisionPinField(value)) {
    return null;
  }

  if (
    value.contentType !== 'demo' &&
    value.contentType !== 'module' &&
    value.contentType !== 'post'
  ) {
    return null;
  }

  if (typeof value.entityId !== 'string' || !value.entityId.trim()) {
    return null;
  }

  return {
    contentType: value.contentType,
    entityId: value.entityId.trim(),
  };
}

function isLearningAccessGrant(value: unknown): value is LearningAccessGrant {
  if (!isRecord(value) || hasRevisionPinField(value)) {
    return false;
  }

  return (
    'courseId' in value &&
    'uid' in value &&
    typeof value.courseId === 'string' &&
    typeof value.uid === 'string' &&
    ('moduleId' in value || 'postId' in value || 'demoId' in value) &&
    (!('moduleId' in value) || typeof value.moduleId === 'string') &&
    (!('postId' in value) || typeof value.postId === 'string') &&
    (!('demoId' in value) || typeof value.demoId === 'string')
  );
}
