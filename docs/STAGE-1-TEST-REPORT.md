# MarketPilot AI - Stage 1 Test Report

## Environment

- Node.js: 22.19.0
- npm: 10.9.3
- Python: 3.13.7
- Docker Engine: 29.7.2
- Docker Compose: v5.5.0
- PostgreSQL: 16.15
- TimescaleDB extension: 2.29.2
- Redis: 7.4.11
- Python environment: repository `.venv`

## Architecture Verification

**PASS**

The frontend calls only the Node API through `NEXT_PUBLIC_API_URL`. No frontend source references PostgreSQL, Redis, `ML_SERVICE_URL`, or server-side API keys. The API remains separated into routes, controllers, services, middleware, configuration, and logging. Dependency health is owned by the API and reports ML, database, and Redis state without exposing credentials.

PostgreSQL and TimescaleDB are correctly deployed as one PostgreSQL-compatible container with the TimescaleDB extension. Redis is a separate cache service.

## Automated Tests

| Area | Result | Evidence |
| --- | --- | --- |
| Docker/Compose configuration | PASS | `docker compose config` succeeded |
| Clean infrastructure startup | PASS | `docker compose up -d` started PostgreSQL and Redis |
| Container health checks | PASS | Both containers reached `healthy` |
| Clean npm installation | PASS | `npm ci` completed successfully |
| Python dependencies | PASS | `.venv` dependencies imported and pytest executed |
| ESLint | PASS | `npm run lint` completed with no errors |
| TypeScript | PASS | Web and API strict typechecks passed |
| API tests | PASS | 6 Vitest tests passed |
| Frontend tests | PASS | Dashboard rendering test passed |
| ML tests from repository root | PASS | 2 pytest tests passed |
| ML tests from `apps/ml-service` | PASS | 2 pytest tests passed |
| Production build | PASS | Next.js and API builds completed |

## Integration Tests

- API `/api/health`: **PASS**, HTTP 200.
- API `/api/health/detailed`: **PASS**, `{ api: up, database: up, redis: up, mlService: up }` with all services running.
- Asset search for `BTC`, `RELIANCE`, and `EUR`: **PASS**, HTTP 200 with empty structured results.
- Missing search query: **PASS**, empty structured result.
- Oversized query: **PASS**, HTTP 400.
- Malformed JSON: **PASS**, HTTP 400 `INVALID_JSON`.
- Unknown route: **PASS**, HTTP 404 `RESOURCE_NOT_FOUND`.
- ML `/health`: **PASS**, HTTP 200.
- ML `/api/v1/model/status`: **PASS**, `modelsLoaded: false`.
- ML failure simulation and recovery: **PASS**, verified in the previous stabilization pass.
- Root `npm run dev`: **PASS**, web, API, and ML started together.
- Production `next start`: **PASS**, `/` and `/dashboard` returned HTTP 200.

## Database Tests

**PASS**

- PostgreSQL container started and reached healthy status.
- PostgreSQL connectivity verified through `psql` inside the container.
- `users` table exists.
- `assets` table exists.
- `assets_pkey`, `assets_symbol_idx`, and `assets_asset_class_idx` exist.
- `timescaledb` extension is installed at version `2.29.2`.
- Asset create, read, update, and delete operations passed.
- Null `currency` validation was rejected by the database `NOT NULL` constraint.
- Transaction rollback passed; rolled-back rows were absent.
- Data survived container restart through the named PostgreSQL volume.
- Init SQL executed successfully and was skipped safely on subsequent starts.

The schema does not declare `symbol` unique, so duplicate symbols are currently allowed by design. The primary-key duplicate constraint remains enforced. No schema was changed merely to force a duplicate-symbol test to pass.

## Redis Tests

**PASS**

- Redis container started and reached healthy status.
- `SET`, `GET`, and `DELETE` passed through `redis-cli`.
- Redis version verified as `7.4.11`.
- Redis recovery after container stop/start passed.
- Redis uses named volume `trading_redis-data`.
- Persistence behavior was verified with an explicit `SAVE` followed by container restart; the test key was recovered.
- `appendonly=no`, so persistence is RDB snapshot-based, not AOF-based.
- No application Redis abstraction exists yet; direct Redis verification was used for this Stage 1 foundation.

## Docker Tests

**PASS**

- `docker compose config` succeeded.
- `docker compose up -d` succeeded.
- `docker compose ps` showed PostgreSQL and Redis.
- PostgreSQL and Redis health checks reached `healthy`.
- Named volumes `trading_postgres-data` and `trading_redis-data` exist.
- Container restart behavior passed.
- Final logs contained no ongoing startup failure. The TimescaleDB image emitted a transient template-database worker message during first initialization and expected worker shutdown messages during restarts; the service recovered and became healthy.

## Frontend Tests

**PASS**

- `/dashboard` and all implemented placeholder routes returned HTTP 200.
- Viewports tested: 375px, 768px, 1024px, and 1440px.
- No horizontal overflow detected.
- Mobile navigation rendered at narrow widths.
- Keyboard focus reached the search input.
- No fabricated prices, quotes, signals, predictions, or market data were found.
- Loading, unavailable, empty, and API-error states rendered as expected.

## Security Checks

**PASS with deferred advisories**

- `.env`, `.env.*`, generated artifacts, and `.venv` are ignored.
- `.env.example` is explicitly unignored and contains placeholders only.
- No credential-shaped literals were found in authored files.
- Only `NEXT_PUBLIC_API_URL` is exposed to the browser.
- Helmet, CORS, rate limiting, and environment-based configuration are enabled.
- Error responses do not expose stack traces, credentials, or API keys.

## Dependency Audit

`npm audit --omit=dev` reports 5 advisories: 4 moderate and 1 high, with no production critical advisories. The full tree reports 10 advisories including a critical dev-only Vitest advisory.

- `vitest`: critical, direct dev dependency; remediation requires Vitest 5 major upgrade.
- `vite`, `esbuild`, `@vitest/mocker`, and `vite-node`: transitive dev advisories following the Vitest 5 upgrade path.
- `next`: moderate direct advisory; remediation requires Next 16 major upgrade.
- `postcss`: high transitive advisory through Next 15; remediation follows the Next 16 path.
- `express`, `body-parser`, and `qs`: moderate Express query-parser chain advisories. The non-forced audit fix made no compatible change. An attempted `qs` override produced an invalid dependency tree and was reverted.

`npm audit fix` was run without `--force`; no compatible changes were applied. `npm audit fix --force` was not run. Major upgrades remain intentionally deferred.

## Failure and Recovery Tests

**PASS**

- PostgreSQL was stopped; after the container port released, API detailed health reported `database: down`; PostgreSQL restart restored `database: up`.
- Redis was stopped; API detailed health reported `redis: down`; Redis restart restored `redis: up`.
- ML service failure/recovery was verified in the prior stabilization pass and remains covered by the existing report history.
- API remained available while dependencies were unavailable.

## Persistence Tests

**PASS**

- A PostgreSQL asset survived `docker compose restart` through `trading_postgres-data`.
- A Redis key survived an explicit RDB `SAVE` and `docker compose restart` through `trading_redis-data`.
- The temporary test rows and keys were removed after verification.
- Redis persistence is documented accurately as RDB snapshot persistence with AOF disabled.

## Final Stabilization

### FIXED / VERIFIED

- Docker CLI path issue was environmental; Docker Desktop’s CLI and credential helper were invoked from the user installation path.
- Compose configuration, startup, health checks, logs, volumes, and restarts verified.
- PostgreSQL, TimescaleDB extension, schema, indexes, CRUD, constraints, rollback, and persistence verified.
- Redis connectivity, commands, recovery, and RDB persistence verified.
- Full application regression remained green with infrastructure running.

### DEFERRED / UPSTREAM

- Next 15 build still emits a non-blocking plugin-detection warning despite CLI ESLint passing with the direct plugin.
- Vitest/Vite emits an upstream CJS API deprecation warning.
- Dependency advisories requiring Vitest 5 or Next 16 remain deferred to intentional upgrade work.
- Duplicate asset symbols are allowed because the current schema only enforces primary-key uniqueness; changing that behavior would be a product/data-model decision outside this test pass.

## Bugs Found

1. Docker CLI was not on the active PowerShell PATH even though Docker Desktop was installed and running.
2. Immediate health probes after `docker compose stop` can briefly observe host-port teardown timing; stable follow-up probes correctly report dependencies down.
3. The database schema does not enforce unique symbols; this was documented rather than changed.

## Bugs Fixed

No application or schema changes were required during this infrastructure pass. The Docker CLI PATH issue was handled by invoking the installed CLI directly for verification.

## Remaining Issues

- No critical unresolved implementation issue was found in the verified Stage 1 foundation.
- Major dependency upgrades remain deferred.
- Docker-dependent tests now pass; Docker Desktop must remain available for local infrastructure workflows.
- Stage 1 still intentionally contains no market provider, ML models, predictions, news, trading, or paper-trading functionality.

## Final Status

READY FOR STAGE 2

Docker, PostgreSQL, TimescaleDB, Redis, database CRUD, rollback, failure recovery, persistence, API integration, ML service checks, frontend checks, automated tests, lint, typechecks, and production builds all passed. No critical unresolved Stage 1 implementation issue remains.
