# Appwrite

Appwrite is an open-source backend platform: Auth, Database, Storage, Functions, and more. This package wires **MariaDB** and **Redis** under the hood and runs behind Runtipi’s proxy.

## What’s Included
- Appwrite core (main service, HTTP 80 internally)
- MariaDB 11 for primary storage
- Redis 7 for caching/queues
- Persistent volumes for uploads, cache, config, certificates, functions

## Ports & URLs
- Internal port: **80** (proxied by Runtipi)

## Volumes
| Host volume name         | Container path           | Purpose                |
|--------------------------|--------------------------|------------------------|
| `appwrite_uploads`       | `/storage/uploads`       | File uploads           |
| `appwrite_cache`         | `/storage/cache`         | Cache                  |
| `appwrite_config`        | `/storage/config`        | Config/state           |
| `appwrite_certificates`  | `/storage/certificates`  | TLS certs              |
| `appwrite_functions`     | `/storage/functions`     | Functions storage      |
| `appwrite_db`            | MariaDB data             | Database               |
| `appwrite_redis`         | Redis data               | Cache/queues           |

## First-Run Settings (Install Form)
- Domains: `_APP_DOMAIN`, (optional) `_APP_DOMAIN_FUNCTIONS`, `_APP_DOMAIN_SITES`
- Targets: `_APP_DOMAIN_TARGET_CNAME` (and optional `_APP_DOMAIN_TARGET_A`)
- Security: `_APP_OPENSSL_KEY_V1` (64 hex chars)
- DB/Redis secrets: `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `REDIS_PASSWORD`
- SMTP (optional): `_APP_SMTP_*`

## Multi-User & Projects
- Full multi-user auth (email/password, OAuth providers), organizations, roles, API keys, webhooks.
- Functions & Sites subdomains supported via the domain settings above.

## Backups
- Dump MariaDB and copy storage volumes; keep `_APP_OPENSSL_KEY_V1` safe.

## Notes
- Usage metrics disabled by default; enable later if you want telemetry.

