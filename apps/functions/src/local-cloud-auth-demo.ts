type Environment = Readonly<Record<string, string | undefined>>;

function normalizeEmail(email: string | undefined): string | undefined {
  const normalizedEmail = email?.trim().toLowerCase();

  return normalizedEmail ? normalizedEmail : undefined;
}

export function isLocalCloudAuthDemo(environment: Environment = process.env): boolean {
  return environment.FUNCTIONS_EMULATOR === 'true' && environment.LOCAL_CLOUD_AUTH_DEMO === 'true';
}

export function shouldCheckIdTokenRevocation(environment: Environment = process.env): boolean {
  return !isLocalCloudAuthDemo(environment);
}

export function hasLocalCloudAuthDemoAdminRole(
  email: string | undefined,
  environment: Environment = process.env,
): boolean {
  if (!isLocalCloudAuthDemo(environment)) {
    return false;
  }

  const configuredAdminEmail = normalizeEmail(environment.LOCAL_DEMO_ADMIN_EMAIL);
  const authenticatedEmail = normalizeEmail(email);

  return configuredAdminEmail !== undefined && configuredAdminEmail === authenticatedEmail;
}
