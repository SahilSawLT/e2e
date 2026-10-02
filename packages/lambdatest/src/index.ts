/**
 * `@e2e-dev/lambdatest` public surface: `lambdatest()`, a browser provider
 * that runs `@e2e-dev/web` targets in LambdaTest's hosted Chrome and Edge.
 * LambdaTest creates a session when its CDP websocket is opened, so the
 * provider needs no SDK and makes no API calls.
 */

export { lambdatest } from './provider.ts';
export type { LambdaTestOptions, LambdaTestRoute } from './provider.ts';
