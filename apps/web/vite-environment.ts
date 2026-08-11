import { resolve } from 'node:path';

const FRIEND_DEMO_MODE = 'friend-demo';

export function getViteEnvironmentDirectory(mode: string, webRoot: string): string {
  if (mode !== FRIEND_DEMO_MODE) {
    return webRoot;
  }

  return resolve(webRoot, '../../.runtime/friend-demo-web');
}
