import { randomBytes } from 'node:crypto';

import type { Auth } from 'firebase-admin/auth';

const LOCAL_DEMO_ADMIN_EMAIL = 'admin@example.test';
const LOCAL_DEMO_STUDENT_EMAIL = 'student@example.test';

export interface LocalDemoAccountCredentials {
  admin: {
    email: string;
    password: string;
  };
  student: {
    email: string;
    password: string;
  };
}

function createLocalDemoPassword(): string {
  return `demo-${randomBytes(18).toString('base64url')}`;
}

export async function seedLocalDemoAccounts(auth: Auth): Promise<LocalDemoAccountCredentials> {
  const studentPassword = createLocalDemoPassword();
  const adminPassword = createLocalDemoPassword();

  await auth.updateUser('local-student', {
    displayName: 'Demo Student',
    email: LOCAL_DEMO_STUDENT_EMAIL,
    emailVerified: true,
    password: studentPassword,
  });

  const admin = await auth.createUser({
    displayName: 'Demo Administrator',
    email: LOCAL_DEMO_ADMIN_EMAIL,
    emailVerified: true,
    password: adminPassword,
    uid: 'local-admin',
  });

  await auth.setCustomUserClaims(admin.uid, { role: 'admin' });

  return {
    admin: {
      email: LOCAL_DEMO_ADMIN_EMAIL,
      password: adminPassword,
    },
    student: {
      email: LOCAL_DEMO_STUDENT_EMAIL,
      password: studentPassword,
    },
  };
}
