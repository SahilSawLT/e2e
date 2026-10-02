# @e2e-dev/lambdatest

[LambdaTest](https://www.lambdatest.com) hosted browsers for [`e2e`](https://www.npmjs.com/package/e2e):
`web({ browser: lambdatest() })` runs a web target in LambdaTest's hosted
Chrome and Edge on Windows and macOS.

## Install

```bash
npm install --save-dev @e2e-dev/lambdatest
```

## Usage

```ts title="e2e.config.ts"
import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { lambdatest } from '@e2e-dev/lambdatest';

export default {
  targets: [
    {
      name: 'lambdatest',
      engine: web({ browser: lambdatest({ platform: 'Windows 11' }), viewport: null }),
      app: { url: 'https://staging.example.com' },
    },
  ],
} satisfies E2EConfig;
```

Set `LT_USERNAME` and `LT_ACCESS_KEY` in the environment `e2e run` starts in.

The [LambdaTest integration page](https://e2e.tester.army/docs/integrations/lambdatest)
covers the options, scopes, routes, recordings, and downloads.
