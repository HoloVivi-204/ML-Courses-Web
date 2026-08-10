import { describe, expect, it } from 'vitest';

import {
  API_ROUTE_CATALOG,
  BUILD_FEATURE_FLAGS,
  MUST_API_CONTRACT_ROUTE_IDS,
  MUST_API_CONTRACTS,
  MUST_API_ROUTES,
  RUNTIME_FEATURE_FLAGS,
} from './index.js';

describe('Release 1 API route catalog', () => {
  it('defines exactly the 35 Must product routes without treating health as a product route', () => {
    expect(MUST_API_ROUTES).toHaveLength(35);
    expect(API_ROUTE_CATALOG.filter((route) => route.scope === 'must')).toHaveLength(35);
    expect(API_ROUTE_CATALOG).not.toContainEqual(
      expect.objectContaining({ path: '/api/v1/health' }),
    );
  });

  it('keeps every optional route behind its TDD flag taxonomy', () => {
    expect(RUNTIME_FEATURE_FLAGS).toEqual([
      'pinRuns',
      'compareRuns',
      'targetScores',
      'guidedPrediction',
      'csvReports',
      'studentDetailReports',
      'lessonSearch',
      'quizMatching',
      'quizDragDrop',
      'demoAnimation',
      'additionalScenarioPairs',
    ]);
    expect(BUILD_FEATURE_FLAGS).toEqual([
      'capstones',
      'advancedCms',
      'genericDatasetUpload',
      'advancedAnalytics',
    ]);

    expect(API_ROUTE_CATALOG.filter((route) => route.path.includes('/capstones/'))).toEqual([
      expect.objectContaining({ buildFlag: 'capstones', scope: 'stretch' }),
      expect.objectContaining({ buildFlag: 'capstones', scope: 'stretch' }),
    ]);
    expect(
      API_ROUTE_CATALOG.filter((route) => route.scope === 'should').every(
        (route) => route.runtimeFlag !== undefined && !('buildFlag' in route),
      ),
    ).toBe(true);
  });

  it('gives every Must route one named request and response contract', () => {
    const mustRouteIds = MUST_API_ROUTES.map((route) => route.id).sort();

    expect(MUST_API_CONTRACT_ROUTE_IDS.sort()).toEqual(mustRouteIds);
    expect(Object.keys(MUST_API_CONTRACTS).sort()).toEqual(mustRouteIds);
    expect(
      Object.values(MUST_API_CONTRACTS).every(
        (contract) => contract.request !== undefined && contract.response !== undefined,
      ),
    ).toBe(true);
  });
});
