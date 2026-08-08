import {
  assertDemoPortsAvailable,
  assertNode22Runtime,
  waitForHttpEndpoint,
} from './demo-readiness.js';

function getReadinessMode(argument: string | undefined): 'launch' | 'verification' {
  if (argument === 'launch' || argument === 'verification') {
    return argument;
  }

  throw new Error('Expected readiness mode to be launch or verification.');
}

function getMaximumAttempts(argument: string | undefined): number {
  const maximumAttempts = Number(argument);

  if (!Number.isSafeInteger(maximumAttempts) || maximumAttempts < 1) {
    throw new Error('Expected a positive integer number of readiness attempts.');
  }

  return maximumAttempts;
}

async function run(): Promise<void> {
  assertNode22Runtime(process.version);

  const command = process.argv[2];

  if (command === 'check-runtime') {
    console.log(`READY: Node.js ${process.version} is supported.`);
    return;
  }

  if (command === 'check-ports') {
    const mode = getReadinessMode(process.argv[3]);
    await assertDemoPortsAvailable(mode);
    console.log(`READY: Required ${mode} ports are available.`);
    return;
  }

  if (command === 'wait-for-http') {
    const url = process.argv[3];

    if (!url) {
      throw new Error('Expected a local HTTP URL to wait for.');
    }

    await waitForHttpEndpoint(url, getMaximumAttempts(process.argv[4]));
    console.log(`READY: Local service responded at ${url}.`);
    return;
  }

  throw new Error(
    'Expected demo readiness command to be check-runtime, check-ports, or wait-for-http.',
  );
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unexpected demo readiness failure.';

  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
});
