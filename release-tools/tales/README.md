# Tales installation candidate: disabled

Source: https://github.com/ianras77/web-totallyrighteoustales/pull/2
Frozen source: c7d10ca3088e14dc11facd8ee9125317e3f6094c.

This is preparation, not an installable release. Do not enable the app until every
release-lock qualification has evidence and every image has a verified immutable
registry digest. No image is published or claimed here. PostgreSQL must remain
major 15 and Redis major 7 unless separately migration-tested.

## Source-image blockers

The API and worker start scripts use node --import tsx with TypeScript source;
the image retains the dependencies needed by that execution model. A missing
tsc build is not itself a demonstrated defect. Production API and worker image
execution remains unqualified and must be tested before image release.
The frontend's NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SUPABASE_* values are baked
at build time. Runtime environment cannot repair an incorrectly built image.
The Dockerfile lacks public Supabase build arguments. Add and test these in a
separate source change; never bake the JWT secret or storage credentials.

The source web config has no API rewrite. API_INTERNAL_URL alone does not create
one. This candidate deliberately publishes no API port: implement and test a
private API ingress and browser-reachable HTTPS API origin, or qualify a
same-origin proxy with all HTTP methods, uploads, authentication and CORS. Do not
point a remote browser at localhost or an internal Compose service name.

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
