/** LambdaTest's hosted Chrome and Edge as a `BrowserProvider` for the web engine. */

import type { BrowserLease, BrowserProvider, BrowserProviderScope, BrowserRequest } from '@e2e-dev/web';
import { envValue } from './env.ts';

const LT_USERNAME = 'LT_USERNAME';
const LT_ACCESS_KEY = 'LT_ACCESS_KEY';

/**
 * The LambdaTest route that serves a raw CDP endpoint. `/puppeteer` serves it
 * today. `/playwright-cdp` is LambdaTest's route for Playwright's
 * `connectOverCDP` clients and labels sessions as Playwright; use it once
 * LambdaTest serves raw CDP on it for your account.
 */
export type LambdaTestRoute = '/puppeteer' | '/playwright-cdp';

export interface LambdaTestOptions {
  /**
   * `worker` (default): one LambdaTest session per worker slot for the run.
   * `attempt`: a fresh session per test attempt, so each test is its own
   * LambdaTest session; rules out `headers`, `basicAuth`, and `userAgent`.
   */
  readonly scope?: BrowserProviderScope | undefined;
  /** CDP route on the hub; `/puppeteer` when absent. */
  readonly route?: LambdaTestRoute | undefined;
  /** The hub host; `cdp.lambdatest.com` when absent. */
  readonly hub?: string | undefined;
  /** `Chrome` (default) or `MicrosoftEdge`: CDP needs a Chromium browser. */
  readonly browserName?: string | undefined;
  /** `latest` when absent. */
  readonly browserVersion?: string | undefined;
  /** LambdaTest platform name, such as `Windows 11` (default) or `macOS Sequoia`. */
  readonly platform?: string | undefined;
  /** LambdaTest build name; `e2e <run id>` when absent, so one run is one build. */
  readonly build?: string | undefined;
  /**
   * Further `LT:Options` capabilities (`video`, `network`, `console`,
   * `idleTimeout`, `tunnel`, ...). `user` and `accessKey` always come from
   * the run's environment.
   */
  readonly capabilities?: Readonly<Record<string, unknown>> | undefined;
}

const DEFAULT_HUB = 'cdp.lambdatest.com';
const DEFAULT_ROUTE: LambdaTestRoute = '/puppeteer';

/**
 * LambdaTest browsers for `web({ browser: lambdatest() })`. A LambdaTest
 * session is its websocket: connecting to the CDP URL starts it and closing
 * the connection ends it, so `acquire` only builds the URL and `release` has
 * nothing to call. Every session is named after the target and the slot or
 * attempt, inside one build per run. `LT_USERNAME` and `LT_ACCESS_KEY` come
 * from the run's environment and never appear in a log line.
 */
export function lambdatest(options: LambdaTestOptions = {}): BrowserProvider {
  const { scope, route = DEFAULT_ROUTE, hub = DEFAULT_HUB } = options;
  return {
    name: 'lambdatest',
    ...(scope === undefined ? {} : { scope }),
    async acquire(request: BrowserRequest): Promise<BrowserLease> {
      const user = envValue(request.env, LT_USERNAME);
      const accessKey = envValue(request.env, LT_ACCESS_KEY);
      if (user === undefined || accessKey === undefined) {
        throw new Error(`${LT_USERNAME} and ${LT_ACCESS_KEY} must be set`);
      }
      const label = request.attemptId ?? `slot ${request.slot + 1} of ${request.slots}`;
      const build = options.build ?? `e2e ${request.runId}`;
      const name = `e2e ${request.targetName} ${label}`;
      const capabilities = {
        browserName: options.browserName ?? 'Chrome',
        browserVersion: options.browserVersion ?? 'latest',
        'LT:Options': {
          platform: options.platform ?? 'Windows 11',
          ...options.capabilities,
          build,
          name,
          user,
          accessKey,
        },
      };
      request.log(`LambdaTest session "${name}" in build "${build}"`);
      return {
        id: `${request.runId}:${request.targetName}:${label}`,
        cdpEndpoint: `wss://${hub}${route}?capabilities=${encodeURIComponent(JSON.stringify(capabilities))}`,
      };
    },
    async release(): Promise<void> {
      // Closing the CDP connection, which the engine does, ends the LambdaTest session.
    },
  };
}
