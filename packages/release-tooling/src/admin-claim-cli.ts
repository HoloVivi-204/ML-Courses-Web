import { randomUUID } from 'node:crypto';

import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

import {
  assertProjectConfirmation,
  assertTrustedMutationTarget,
  parseTrustedCommand,
} from './trusted-command.js';

const command = parseTrustedCommand(process.argv.slice(2));
assertTrustedMutationTarget(command);
assertProjectConfirmation(command);

if (!command.isApply) {
  throw new Error('Admin claim requires --apply.');
}

if (!command.uid) {
  throw new Error('--uid is required for an Admin claim.');
}

const app = initializeApp({ projectId: command.projectId }, `admin-claim-${randomUUID()}`);

try {
  const auth = getAuth(app);
  const user = await auth.getUser(command.uid);

  if (user.customClaims?.role !== undefined) {
    throw new Error('Admin claim helper only grants a role once per UID.');
  }

  await auth.setCustomUserClaims(command.uid, {
    ...user.customClaims,
    role: 'admin',
  });

  console.log(
    JSON.stringify({
      granted: true,
      projectId: command.projectId,
    }),
  );
} finally {
  await deleteApp(app);
}
