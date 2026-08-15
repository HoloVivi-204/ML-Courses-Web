const DEFAULT_FUNCTIONS_EMULATOR_PROJECT_ID = 'demo-ml-learning-local';
const FIREBASE_PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,62}$/;

export function getFunctionsEmulatorTarget(projectId?: string): string {
  const resolvedProjectId = projectId?.trim() || DEFAULT_FUNCTIONS_EMULATOR_PROJECT_ID;

  if (!FIREBASE_PROJECT_ID_PATTERN.test(resolvedProjectId)) {
    throw new Error('The Functions emulator project identifier is invalid.');
  }

  return `http://localhost:5001/${resolvedProjectId}/asia-southeast1/api`;
}
