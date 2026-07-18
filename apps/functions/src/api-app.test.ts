import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApiApp } from './api-app.js';

describe('API foundation', () => {
  it('returns the canonical success envelope from the public health endpoint', async () => {
    const response = await request(createApiApp()).get('/api/v1/health').expect(200);

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(response.body).toEqual({
      success: true,
      data: {
        service: 'api',
        status: 'ok',
      },
      requestId: response.headers['x-request-id'],
    });
  });

  it('fails closed with the canonical error envelope for unknown routes', async () => {
    const response = await request(createApiApp()).get('/api/v1/unknown').expect(404);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found.',
        details: [],
      },
      requestId: response.headers['x-request-id'],
    });
  });
});
