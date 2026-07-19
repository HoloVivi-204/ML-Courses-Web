interface LearningAccessGrant {
  courseId: string;
  moduleId: string;
  postId: string;
  uid: string;
}

const STORAGE_KEY = 'ml-path-learning-access-grants';

export function rememberLearningAccessGrant(grant: LearningAccessGrant) {
  try {
    const grants = readLearningAccessGrants();
    const nextGrants = [
      ...grants.filter(
        (item) =>
          item.courseId !== grant.courseId ||
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

function isLearningAccessGrant(value: unknown): value is LearningAccessGrant {
  return (
    typeof value === 'object' &&
    value !== null &&
    'courseId' in value &&
    'moduleId' in value &&
    'postId' in value &&
    'uid' in value &&
    typeof value.courseId === 'string' &&
    typeof value.moduleId === 'string' &&
    typeof value.postId === 'string' &&
    typeof value.uid === 'string'
  );
}
