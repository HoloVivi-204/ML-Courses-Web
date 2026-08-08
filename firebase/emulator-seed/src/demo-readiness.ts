import { createServer } from 'node:net';

type DemoReadinessMode = 'launch' | 'verification';
type IsPortAvailable = (port: number) => Promise<boolean>;
type FetchEndpoint = (url: string) => Promise<{ ok: boolean }>;
type Wait = (milliseconds: number) => Promise<void>;

const DEMO_PORTS: Readonly<Record<DemoReadinessMode, readonly number[]>> = Object.freeze({
  launch: [4000, 4400, 5001, 5173, 8080, 9199],
  verification: [4000, 4173, 4400, 5001, 8080, 9099, 9199],
});

export function assertNode22Runtime(version: string): void {
  const majorVersion = Number(version.replace(/^v/, '').split('.')[0]);

  if (majorVersion === 22) {
    return;
  }

  throw new Error(`Node.js 22 is required for local demo commands. Current runtime: ${version}.`);
}

export function getDemoPorts(mode: DemoReadinessMode): readonly number[] {
  return DEMO_PORTS[mode];
}

export async function assertDemoPortsAvailable(
  mode: DemoReadinessMode,
  isPortAvailable: IsPortAvailable = canBindLocalPort,
): Promise<void> {
  const occupiedPorts = (
    await Promise.all(
      getDemoPorts(mode).map(async (port) => ({
        isAvailable: await isPortAvailable(port),
        port,
      })),
    )
  )
    .filter(({ isAvailable }) => !isAvailable)
    .map(({ port }) => port);

  if (occupiedPorts.length === 0) {
    return;
  }

  const ports = occupiedPorts.join(', ');
  throw new Error(
    `Local demo ports are already in use: ${ports}. Close existing ML Path windows or run ` +
      `Get-NetTCPConnection -LocalPort ${ports.replaceAll(', ', ',')} | ` +
      'Select-Object LocalPort, OwningProcess, then retry.',
  );
}

export async function waitForHttpEndpoint(
  url: string,
  maximumAttempts: number,
  fetchEndpoint: FetchEndpoint = fetchHttpEndpoint,
  wait: Wait = delay,
): Promise<void> {
  if (!Number.isSafeInteger(maximumAttempts) || maximumAttempts < 1) {
    throw new Error('The local HTTP readiness attempt count must be a positive integer.');
  }

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      const response = await fetchEndpoint(url);

      if (response.ok) {
        return;
      }
    } catch {
      // A local service can reject requests while it is still starting.
    }

    if (attempt < maximumAttempts) {
      await wait(1_000);
    }
  }

  throw new Error(
    `Local service did not become ready at ${url} within ${maximumAttempts} seconds.`,
  );
}

async function fetchHttpEndpoint(url: string): Promise<{ ok: boolean }> {
  return fetch(url, { signal: AbortSignal.timeout(3_000) });
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function canBindLocalPort(port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }

      reject(error);
    });

    server.listen({ exclusive: true, host: '127.0.0.1', port }, () => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(true);
      });
    });
  });
}
