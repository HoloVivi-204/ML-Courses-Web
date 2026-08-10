import { deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { getFirebaseAdminApp } from './firebase-admin-app.js';
import { runLocalAnalyticsAggregation } from './admin-report-repository.js';

const app = getFirebaseAdminApp();

try {
  const summary = await runLocalAnalyticsAggregation(getFirestore(app));

  console.log(
    JSON.stringify({
      generatedAt: summary.generatedAt,
      learningVerified: summary.learningVerified,
      playgroundClientReported: summary.playgroundClientReported,
      success: true,
    }),
  );
} finally {
  await deleteApp(app);
}
