# USMender — disabled synthetic private-alpha preparation

**Not installable yet. Do not enable this listing or use real private conversations.**
This is a new top-level package for `ianras77/runtipi-appstore`, branch
`app/wordpress_elderseth`. It does not move another store's data or change any
existing app ID. The YAML package requires Runtipi >=4.11.0; the actual host
version has not been established.

The first bounded profile has web, API, PostgreSQL and a custom Cat service.
Messaging is explicitly local; SMS is explicitly simulated console output;
email/iMessage remain handoffs. Encryption is explicitly off. Only synthetic
records belong in this profile. There is no claim of verified recipients,
qualified model output, real delivery or safe sensitive conversations.
Matrix is deliberately absent, not silently replaced while advertising a
Matrix install. A full Matrix profile requires its own private registration,
credentials, persistent state, and provider/identity qualification. The source
worker currently reports `executesBackgroundJobs:false`, so it is not packaged
as a functioning background queue.

## What is implemented

- One web ingress, no raw API/database/Cat host ports, no source-tree bind mounts,
  no runtime dependency installation, no mounted Docker socket or GPU claims.
- Explicit production/private-alpha/no-demo-seed configuration. The actual
  source runtime validator accepts the synthetic profile, reports its limitations,
  and is exercised by the paired check.
- PostgreSQL health gates API startup. The API image must retain the source's
  fail-fast preflight/migrate/start entrypoint; schema checks do not establish it.
- Database and Cat data live below this install's `${APP_DATA_DIR}/data`.
  Generated DB/JWT secrets must be preserved across upgrades and restores.
- Web build arguments must be `NEXT_PUBLIC_API_URL=/api` and
  `API_INTERNAL_URL=http://api:3001`. Runtime overrides cannot fix a wrongly
  built Next rewrite.

## Why image expressions remain unresolved

All four `${USMENDER_*_IMAGE:?...}` expressions intentionally fail if someone
tries to start this unqualified package. They are not invented registry tags or
release digests, and are not installer form fields. A release lock must record
actual published source and immutable image references. The render tool creates
only a separate staging artifact; it never enables the app or edits this package.

See `../../release-tools/README.md` for qualification and commands. `available:false`
is necessary but is not permission to merge, deploy, or expose the service.
