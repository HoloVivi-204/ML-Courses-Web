export function getSafeAuthReturnPath(search: string): string {
  const rawReturnPath = new URLSearchParams(search).get('returnTo');

  if (
    !rawReturnPath ||
    !rawReturnPath.startsWith('/') ||
    rawReturnPath.startsWith('//') ||
    rawReturnPath.includes('\\')
  ) {
    return '/';
  }

  try {
    const returnUrl = new URL(rawReturnPath, window.location.origin);
    const returnPath = `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`;

    if (
      returnUrl.origin !== window.location.origin ||
      returnUrl.protocol !== window.location.protocol ||
      returnUrl.pathname === '/login' ||
      returnUrl.pathname === '/register'
    ) {
      return '/';
    }

    return returnPath;
  } catch {
    return '/';
  }
}
