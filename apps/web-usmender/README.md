# USMender: disabled Cat-free installation preparation

This is a review candidate for ianras77/runtipi-appstore, targeting app/wordpress_elderseth. It is NOT an installable release. Keep available=false. The release lock pairs source 3edfc06fc9a15d6c83bb0fd7af8fc1d2400ad4dc with its exact runtime contract; all image digests and installation qualifications remain unset.

The package has web, API and PostgreSQL services. Native Mastra is in the API. It does not start Cheshire Cat or supply retired mediation settings. Historical CAT_ storage values remain valid and are not rewritten.

## Required configuration and limitations
- Private HTTPS web origin, reachable OpenAI-compatible model base URL (including the provider's API prefix such as /v1), and model alias.
- Current preparation supports only an unauthenticated synthetic inference endpoint. An authenticated provider requires a separately schema-validated optional secret form and USMENDER_MODEL_API_KEY forwarding before qualification. Never put an API key into the URL.
- Database password and JWT secret must be preserved across upgrades. Existing installations must use their existing values, not regenerate them.
- No real SMS, email or Matrix delivery is configured. SMS is simulated, messaging is local, storage encryption is not configured. Sensitive-conversation readiness is false.
- Web images must be built with NEXT_PUBLIC_API_URL=/api and API_INTERNAL_URL=http://api:3001.

## Data preservation
The PostgreSQL bind mount is unchanged: ${APP_DATA_DIR}/data/postgres to /var/lib/postgresql/data. Removal of Cat from this source Compose file does not authorize stopping existing services or deleting, remapping, or migrating any data. Retain any existing data/cat directory and separate backups. Do not run down -v, volume prune or account deletion as migration steps. Moving from another store or host needs an explicit backup/restore migration because APP_DATA_DIR may identify a new directory.

## Before install readiness
1. Publish reviewed source-built images to the intended authorized registry and verify pulls/digests for the target architecture. Record real immutable references for web, API and PostgreSQL; do not fabricate hashes.
2. Run full store schema/inventory and canonical Runtipi Compose checks; current repository baseline has known unrelated validation failures.
3. Test a fresh synthetic install in an isolated target-compatible Runtipi instance, web/API origin/auth and model protocol, restart persistence and retained credentials.
4. Restore a synthetic database backup, upgrade it with the real migration entrypoint, check data/account identities and verify recovery with a pre-upgrade backup. Application downgrade alone is not a schema rollback.
5. Review private ingress, secret handling, backup ownership and browser acceptance. Explicitly approve availability promotion and deployment separately.

Current evidence: three isolated compatibility/retention tests pass against the exact published pure runtime validator. Existing stale package is rejected for CAT_BASE_URL and missing model variables; this candidate is accepted. This does not establish image availability, production model quality, Runtipi installation, whole-store validation or safe use of sensitive conversations.
