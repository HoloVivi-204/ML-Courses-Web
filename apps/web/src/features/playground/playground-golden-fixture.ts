export function assertGoldenFixture(actual: unknown, expected: unknown, tolerance: number): void {
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new Error(
      `Golden fixture tolerance must be a non-negative finite number, received ${tolerance}.`,
    );
  }

  compareFixtureValue(actual, expected, tolerance, 'result');
}

function compareFixtureValue(
  actual: unknown,
  expected: unknown,
  tolerance: number,
  path: string,
): void {
  if (typeof expected === 'number') {
    if (typeof actual !== 'number' || !Number.isFinite(actual)) {
      throw new Error(`Golden fixture mismatch at ${path}: expected a finite number.`);
    }

    if (Math.abs(actual - expected) > tolerance) {
      throw new Error(
        `Golden fixture mismatch at ${path}: expected ${expected} ± ${tolerance}, received ${actual}.`,
      );
    }

    return;
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      throw new Error(`Golden fixture mismatch at ${path}: array shape differs.`);
    }

    expected.forEach((expectedValue, index) => {
      compareFixtureValue(actual[index], expectedValue, tolerance, `${path}[${index}]`);
    });
    return;
  }

  if (isRecord(expected)) {
    if (!isRecord(actual)) {
      throw new Error(`Golden fixture mismatch at ${path}: expected an object.`);
    }

    Object.entries(expected).forEach(([key, expectedValue]) => {
      compareFixtureValue(actual[key], expectedValue, tolerance, `${path}.${key}`);
    });
    return;
  }

  if (actual !== expected) {
    throw new Error(`Golden fixture mismatch at ${path}: expected ${String(expected)}.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
