import { fileURLToPath } from 'node:url';

export function getContentPipelineRoot(): string {
  return fileURLToPath(new URL('../../../.content-pipeline/', import.meta.url));
}
