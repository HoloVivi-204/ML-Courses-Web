import { HEALTH_ROUTE, MUST_API_ROUTES, type ApiRouteMethod } from '@ml-path/contracts';
import { describe, expect, it } from 'vitest';

import { createApiApp } from './api-app.js';

interface ExpressRouteLayer {
  route?: {
    methods: Partial<Record<Lowercase<ApiRouteMethod>, boolean>>;
    path: string;
  };
}

function getRegisteredProductRoutes(): readonly { method: ApiRouteMethod; path: string }[] {
  const app = createApiApp();
  const router = (app as unknown as { router?: { stack?: readonly ExpressRouteLayer[] } }).router;

  if (!router?.stack) {
    throw new Error('Express route registry is unavailable for contract verification.');
  }

  return router.stack.flatMap((layer) => {
    const route = layer.route;

    if (!route) {
      return [];
    }

    return (Object.entries(route.methods) as [Lowercase<ApiRouteMethod>, boolean][])
      .filter(([, enabled]) => enabled)
      .map(([method]) => ({ method: method.toUpperCase() as ApiRouteMethod, path: route.path }));
  });
}

function sortRoutes<T extends { method: string; path: string }>(routes: readonly T[]): T[] {
  return [...routes].sort((left, right) => {
    const leftKey = `${left.method} ${left.path}`;
    const rightKey = `${right.method} ${right.path}`;

    return leftKey.localeCompare(rightKey);
  });
}

describe('Release 1 Functions route registry', () => {
  it('registers exactly 35 Must APIs plus the liveness-only health exception', () => {
    const registeredRoutes = getRegisteredProductRoutes();
    const expectedRoutes = [HEALTH_ROUTE, ...MUST_API_ROUTES].map(({ method, path }) => ({
      method,
      path,
    }));

    expect(MUST_API_ROUTES).toHaveLength(35);
    expect(registeredRoutes).toHaveLength(36);
    expect(sortRoutes(registeredRoutes)).toEqual(sortRoutes(expectedRoutes));
  });
});
