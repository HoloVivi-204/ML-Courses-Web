import { randomUUID } from 'node:crypto';

export interface LocalE2eAdminAuth {
  createUser(input: {
    email: string;
    emailVerified: boolean;
    password: string;
    uid: string;
  }): Promise<{ uid: string }>;
  setCustomUserClaims(uid: string, claims: { role: 'admin' }): Promise<void>;
}

export interface LocalE2eAdminCredentials {
  LOCAL_DEMO_ADMIN_EMAIL: string;
  LOCAL_DEMO_ADMIN_PASSWORD: string;
}

export async function provisionLocalE2eAdmin(
  auth: LocalE2eAdminAuth,
  createIdentifier: () => string = randomUUID,
): Promise<LocalE2eAdminCredentials> {
  const identifier = createIdentifier();
  const email = `e2e-admin-${identifier}@example.test`;
  const password = `local-e2e-${createIdentifier()}`;
  const user = await auth.createUser({
    email,
    emailVerified: true,
    password,
    uid: `e2e-admin-${identifier}`,
  });

  await auth.setCustomUserClaims(user.uid, { role: 'admin' });

  return {
    LOCAL_DEMO_ADMIN_EMAIL: email,
    LOCAL_DEMO_ADMIN_PASSWORD: password,
  };
}
