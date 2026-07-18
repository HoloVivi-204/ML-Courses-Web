import { onRequest } from 'firebase-functions/v2/https';

import { createApiApp } from './api-app.js';
import { FIREBASE_REGION } from './runtime-config.js';

export const api = onRequest(
  {
    minInstances: 0,
    region: FIREBASE_REGION,
  },
  createApiApp(),
);
