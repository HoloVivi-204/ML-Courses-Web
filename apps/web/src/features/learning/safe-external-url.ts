export function getSafeExternalUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== 'https:' || url.username || url.password) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}
