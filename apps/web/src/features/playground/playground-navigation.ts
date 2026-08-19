export interface PlaygroundLocationLike {
  hash: string;
  pathname: string;
  search: string;
}

export interface PlaygroundNavigationState {
  from?: string;
}

export function getPlaygroundLocationPath(location: PlaygroundLocationLike): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

export function getPlaygroundBackPath(state: unknown): string {
  if (!state || typeof state !== 'object') {
    return '/playground';
  }

  const from = (state as PlaygroundNavigationState).from;

  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
    ? from
    : '/playground';
}
