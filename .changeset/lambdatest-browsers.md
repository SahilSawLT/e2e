---
"@e2e-dev/lambdatest": minor
---

`@e2e-dev/lambdatest`: `web({ browser: lambdatest() })` runs a web target in LambdaTest's hosted Chrome or Edge on Windows and macOS, one session per worker slot, or per attempt with `scope: 'attempt'`. It builds the session's CDP URL from `browserName`, `browserVersion`, `platform`, `build`, and further `LT:Options` `capabilities`, names each session after its target and its slot or attempt inside one build per run, reads `LT_USERNAME` and `LT_ACCESS_KEY` from the run's environment and keeps them out of every log line, and serves raw CDP from the hub's `/puppeteer` route by default, with `/playwright-cdp` as an option. A LambdaTest session starts when its websocket opens and ends when it closes, so it calls no API and has no SDK; `@e2e-dev/web` is its peer.
