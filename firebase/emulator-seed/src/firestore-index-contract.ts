export interface FirestoreCompositeIndexField {
  fieldPath: string;
  order: 'ASCENDING' | 'DESCENDING';
}

export interface FirestoreCompositeIndex {
  collectionGroup: string;
  fields: readonly FirestoreCompositeIndexField[];
  queryScope: 'COLLECTION' | 'COLLECTION_GROUP';
}

export interface FirestoreIndexConfiguration {
  fieldOverrides: readonly unknown[];
  indexes: readonly FirestoreCompositeIndex[];
}

export interface FirestoreIndexMigrationDryRunReport {
  actualIndexCount: number;
  expectedIndexCount: number;
  isValid: boolean;
  missing: readonly string[];
  unexpected: readonly string[];
}

export const RELEASE_ONE_REQUIRED_FIRESTORE_INDEXES = [
  {
    collectionGroup: 'playgroundRuns',
    fields: [
      { fieldPath: 'scenarioId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ],
    queryScope: 'COLLECTION',
  },
  {
    collectionGroup: 'quizAttempts',
    fields: [
      { fieldPath: 'quizId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ],
    queryScope: 'COLLECTION',
  },
  {
    collectionGroup: 'postProgress',
    fields: [
      { fieldPath: 'moduleId', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
    ],
    queryScope: 'COLLECTION',
  },
  {
    collectionGroup: 'moduleProgress',
    fields: [
      { fieldPath: 'courseId', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
    ],
    queryScope: 'COLLECTION',
  },
  {
    collectionGroup: 'learningEvents',
    fields: [
      { fieldPath: 'eventType', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ],
    queryScope: 'COLLECTION',
  },
  {
    collectionGroup: 'auditLogs',
    fields: [
      { fieldPath: 'actorId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ],
    queryScope: 'COLLECTION',
  },
] as const satisfies readonly FirestoreCompositeIndex[];

const PINNED_RUNS_INDEX = {
  collectionGroup: 'playgroundRuns',
  fields: [
    { fieldPath: 'scenarioId', order: 'ASCENDING' },
    { fieldPath: 'isPinned', order: 'ASCENDING' },
    { fieldPath: 'createdAt', order: 'DESCENDING' },
  ],
  queryScope: 'COLLECTION',
} as const satisfies FirestoreCompositeIndex;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseIndexField(value: unknown): FirestoreCompositeIndexField | null {
  if (
    !isRecord(value) ||
    typeof value.fieldPath !== 'string' ||
    (value.order !== 'ASCENDING' && value.order !== 'DESCENDING')
  ) {
    return null;
  }

  return { fieldPath: value.fieldPath, order: value.order };
}

function parseIndex(value: unknown): FirestoreCompositeIndex | null {
  if (
    !isRecord(value) ||
    typeof value.collectionGroup !== 'string' ||
    (value.queryScope !== 'COLLECTION' && value.queryScope !== 'COLLECTION_GROUP') ||
    !Array.isArray(value.fields)
  ) {
    return null;
  }

  const fields = value.fields.map(parseIndexField);

  if (fields.some((field) => field === null)) {
    return null;
  }

  return {
    collectionGroup: value.collectionGroup,
    fields: fields as FirestoreCompositeIndexField[],
    queryScope: value.queryScope,
  };
}

export function parseFirestoreIndexConfiguration(
  value: unknown,
): FirestoreIndexConfiguration | null {
  if (!isRecord(value) || !Array.isArray(value.indexes) || !Array.isArray(value.fieldOverrides)) {
    return null;
  }

  const indexes = value.indexes.map(parseIndex);

  if (indexes.some((index) => index === null)) {
    return null;
  }

  return {
    fieldOverrides: value.fieldOverrides,
    indexes: indexes as FirestoreCompositeIndex[],
  };
}

function serializeIndex(index: FirestoreCompositeIndex): string {
  return `${index.collectionGroup}|${index.queryScope}|${index.fields
    .map((field) => `${field.fieldPath}:${field.order}`)
    .join(',')}`;
}

export function validateFirestoreIndexMigrationDryRun(input: {
  configuration: unknown;
  pinRunsEnabled?: boolean | undefined;
}): FirestoreIndexMigrationDryRunReport {
  const configuration = parseFirestoreIndexConfiguration(input.configuration);
  const expectedIndexes = [
    ...RELEASE_ONE_REQUIRED_FIRESTORE_INDEXES,
    ...(input.pinRunsEnabled ? [PINNED_RUNS_INDEX] : []),
  ];

  if (!configuration) {
    return {
      actualIndexCount: 0,
      expectedIndexCount: expectedIndexes.length,
      isValid: false,
      missing: expectedIndexes.map(serializeIndex),
      unexpected: ['invalid Firestore index configuration'],
    };
  }

  const expected = new Set(expectedIndexes.map(serializeIndex));
  const actual = new Set(configuration.indexes.map(serializeIndex));
  const missing = [...expected].filter((index) => !actual.has(index));
  const unexpected = [
    ...[...actual].filter((index) => !expected.has(index)),
    ...(configuration.fieldOverrides.length === 0
      ? []
      : ['fieldOverrides must be empty for the current course']),
  ];

  return {
    actualIndexCount: configuration.indexes.length,
    expectedIndexCount: expectedIndexes.length,
    isValid: missing.length === 0 && unexpected.length === 0,
    missing,
    unexpected,
  };
}
