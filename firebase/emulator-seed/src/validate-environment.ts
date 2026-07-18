import { LOCAL_FIREBASE_PROJECT_ID, assertSafeLocalEnvironment } from './environment.js';

const environment = {
  ...process.env,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ?? LOCAL_FIREBASE_PROJECT_ID,
};
const { projectId } = assertSafeLocalEnvironment(environment);

console.log(JSON.stringify({ success: true, projectId, cloudCredentials: false }));
