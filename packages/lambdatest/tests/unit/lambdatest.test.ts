/**
 * `lambdatest()` builds the CDP URL a LambdaTest session starts on: the
 * capabilities it encodes, credentials read from the run's environment
 * only, session and build names, the route and hub options, scope, log lines
 * that never carry the access key, and a release that calls nothing.
 */

import type { BrowserReleaseContext, BrowserRequest } from '@e2e-dev/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lambdatest } from '../../src/index.ts';

const ACCESS_KEY = 'LT_secret-access-key';

function request(overrides: Partial<BrowserRequest> = {}): BrowserRequest & { lines: string[] } {
  const lines: string[] = [];
  return {
    runId: 'run-1',
    targetName: 'chromium',
    slot: 0,
    slots: 2,
    env: { LT_USERNAME: 'alice', LT_ACCESS_KEY: ACCESS_KEY },
    signal: new AbortController().signal,
    log: (line: string) => lines.push(line),
    lines,
    ...overrides,
  };
}

function decode(cdpEndpoint: string): { url: URL; capabilities: Record<string, any> } {
  const url = new URL(cdpEndpoint);
  return { url, capabilities: JSON.parse(url.searchParams.get('capabilities') ?? '{}') };
}

beforeEach(() => {
  vi.stubGlobal('fetch', () => {
    throw new Error('lambdatest() must not call the network');
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('lambdatest()', () => {
  it('builds a /puppeteer CDP URL on cdp.lambdatest.com with the run and target in the names', async () => {
    const lease = await lambdatest().acquire(request());
    const { url, capabilities } = decode(lease.cdpEndpoint);

    expect(url.protocol).toBe('wss:');
    expect(url.host).toBe('cdp.lambdatest.com');
    expect(url.pathname).toBe('/puppeteer');
    expect(capabilities).toEqual({
      browserName: 'Chrome',
      browserVersion: 'latest',
      'LT:Options': {
        platform: 'Windows 11',
        build: 'e2e run-1',
        name: 'e2e chromium slot 1 of 2',
        user: 'alice',
        accessKey: ACCESS_KEY,
      },
    });
    expect(lease.id).toBe('run-1:chromium:slot 1 of 2');
  });

  it('names a per-attempt session after the attempt', async () => {
    const provider = lambdatest({ scope: 'attempt' });
    const lease = await provider.acquire(request({ attemptId: 'attempt-7' }));

    expect(provider.scope).toBe('attempt');
    expect(decode(lease.cdpEndpoint).capabilities['LT:Options'].name).toBe('e2e chromium attempt-7');
    expect(lease.id).toBe('run-1:chromium:attempt-7');
  });

  it('leaves scope to the engine default when none is given', () => {
    expect('scope' in lambdatest()).toBe(false);
  });

  it('honours the route, hub, browser, platform, build, and extra capabilities', async () => {
    const lease = await lambdatest({
      route: '/playwright-cdp',
      hub: 'cdp.eu.example.test',
      browserName: 'MicrosoftEdge',
      browserVersion: '140',
      platform: 'macOS Sequoia',
      build: 'nightly',
      capabilities: { video: true, idleTimeout: 300 },
    }).acquire(request());
    const { url, capabilities } = decode(lease.cdpEndpoint);

    expect(url.host).toBe('cdp.eu.example.test');
    expect(url.pathname).toBe('/playwright-cdp');
    expect(capabilities.browserName).toBe('MicrosoftEdge');
    expect(capabilities.browserVersion).toBe('140');
    expect(capabilities['LT:Options']).toMatchObject({ platform: 'macOS Sequoia', build: 'nightly', video: true, idleTimeout: 300 });
  });

  it('takes the credentials from the run environment, never from capabilities or process.env', async () => {
    vi.stubEnv('LT_USERNAME', 'from-process-env');
    vi.stubEnv('LT_ACCESS_KEY', 'from-process-env');
    const lease = await lambdatest({ capabilities: { user: 'mallory', accessKey: 'spoofed' } }).acquire(request());
    const options = decode(lease.cdpEndpoint).capabilities['LT:Options'];

    expect(options.user).toBe('alice');
    expect(options.accessKey).toBe(ACCESS_KEY);
    vi.unstubAllEnvs();
  });

  it('fails the lease when a credential is missing or blank', async () => {
    await expect(lambdatest().acquire(request({ env: { LT_USERNAME: 'alice' } }))).rejects.toThrow(
      'LT_USERNAME and LT_ACCESS_KEY must be set',
    );
    await expect(lambdatest().acquire(request({ env: { LT_USERNAME: ' ', LT_ACCESS_KEY: ACCESS_KEY } }))).rejects.toThrow(
      'LT_USERNAME and LT_ACCESS_KEY must be set',
    );
  });

  it('logs the session and build names but never the access key or the URL', async () => {
    const req = request();
    await lambdatest().acquire(req);

    expect(req.lines).toEqual(['LambdaTest session "e2e chromium slot 1 of 2" in build "e2e run-1"']);
    expect(req.lines.join('\n')).not.toContain(ACCESS_KEY);
    expect(req.lines.join('\n')).not.toContain('wss://');
  });

  it('releases without calling anything', async () => {
    const provider = lambdatest();
    const lease = await provider.acquire(request());
    const context: BrowserReleaseContext = {
      runId: 'run-1',
      targetName: 'chromium',
      env: {},
      signal: new AbortController().signal,
      log: () => {},
    };

    await expect(provider.release(lease, context)).resolves.toBeUndefined();
  });
});
