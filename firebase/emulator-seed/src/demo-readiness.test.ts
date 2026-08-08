import { describe, expect, it, vi } from 'vitest';

import {
  assertDemoPortsAvailable,
  assertNode22Runtime,
  getDemoPorts,
  waitForHttpEndpoint,
} from './demo-readiness.js';

describe('local demo readiness', () => {
  it('reserves every hybrid service and web port before a friend demo starts', () => {
    expect(getDemoPorts('launch')).toEqual([4000, 4400, 5001, 5173, 8080, 9199]);
  });

  it('stops with an actionable error when a required demo port is already occupied', async () => {
    await expect(assertDemoPortsAvailable('launch', async (port) => port !== 5001)).rejects.toThrow(
      '5001',
    );
  });

  it('includes Auth and Playwright ports in the non-interactive verification gate', () => {
    expect(getDemoPorts('verification')).toEqual([4000, 4173, 4400, 5001, 8080, 9099, 9199]);
  });

  it('allows only Node.js 22 for local demo commands', () => {
    expect(() => assertNode22Runtime('v22.23.1')).not.toThrow();
    expect(() => assertNode22Runtime('v24.18.0')).toThrow('Node.js 22');
  });

  it('waits for a local HTTP endpoint to become ready', async () => {
    const fetchEndpoint = vi
      .fn<() => Promise<{ ok: boolean }>>()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    const wait = vi.fn(async () => undefined);

    await expect(
      waitForHttpEndpoint('http://127.0.0.1:5173', 3, fetchEndpoint, wait),
    ).resolves.toBeUndefined();

    expect(fetchEndpoint).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(1_000);
  });
});
