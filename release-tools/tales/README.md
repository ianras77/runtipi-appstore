# Tales installation candidate: disabled

Source: https://github.com/ianras77/web-totallyrighteoustales/pull/2
Frozen source: 01bf1c2e3957b5e82012a8cecb81db3787b6194f.

This is preparation, not an installable release. Do not enable the app until every
release-lock qualification has evidence and every image has a verified immutable
registry digest. No image is published or claimed here. PostgreSQL must remain
major 15 and Redis major 7 unless separately migration-tested.

## Source-image and same-origin build contract

The paired source supports public Supabase build arguments and an opt-in,
build-time API rewrite. Hosted run 42280679287 passed canonical Compose and
22 bounded source/fixture/mock checks; it did not build or qualify an application image.
API and worker intentionally use node --import tsx through their existing package
scripts. Missing API dist compilation alone is not a proven startup defect.

Build NEXT_PUBLIC_API_URL=/api and TALES_API_PROXY_ORIGIN=http://api:3191.
The source lock records these fixed values plus unresolved public Supabase URL
and anonymous-key arguments. Resolve those with the intended Supabase project
before building; never bake a service-role key, JWT secret or S3 credentials.
Runtime API_INTERNAL_URL=http://api:3191 is separately required for SSR and is
provided by this candidate. Runtime environment does not retarget built public
values or the proxy. Rebuild if the public project configuration changes.

The API remains private with no published host port. The built proxy must still
be tested for HTTP/auth, multipart size/time limits and browser sign-in before
release. Direct S3 image uploads require browser-reachable storage URLs and CORS.
TALES_API_URL remains an explicit API-side configuration input; its callbacks and
URL use must be checked against the final same-origin HTTPS routing.
The source Dockerfile now selects Node 22-bookworm and USER node; verified base
digest/platform, actual nonroot runtime and full-image qualification remain release work. No claim of install readiness follows from source tests.

## Fresh environment and persistence

Use a new app data directory, never an existing source deployment's volume.
Postgres lives at APP_DATA_DIR/data/postgres. Redis AOF lives at
APP_DATA_DIR/data/redis with noeviction for BullMQ. Media remains in the explicitly
configured external S3 bucket; database backups alone do not back it up.
Keep the generated hex database password stable across upgrades. Changing it
does not change an already initialized database password. Supply real Supabase
configuration with DEV_AUTH_BYPASS=false. OpenAI is disabled by default, but
LocalAI is configured and may be called when jobs execute. Do not run with live
credentials before authorization.
The app store form/config schema, secret-field handling and required values must
be tested on the target Runtipi version before enabling.

On an isolated new stack only: verify migrations and health, sign-in, story
creation/moderation, uploads and worker processing; restart and verify records,
queues and media persist; back up and restore Postgres, Redis and media into a
second isolated stack; rehearse an upgrade on that restore. Never use down -v,
prune, delete, remount or migrate existing live volumes as part of preparation.
The API startup migration command mutates its configured database; only a fresh
isolated database is eligible for initial testing. Existing data needs separate
migration authorization and a tested restore.

## Release gate

Run test_candidate.py for bounded static contracts. This does not replace Docker
Compose config, Runtipi schema validation, image builds or lifecycle tests.
All image values must be verified registry references with @sha256:<64 hex>.
A release must validate exact source provenance, architecture, pull access and
build-time public configuration, fill release-lock evidence, and pass an
independent review before changing available=false. No merge/deploy is implied.
