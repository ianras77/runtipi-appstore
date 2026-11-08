# Formbricks

This package follows Formbricks' current production Docker service layout: Formbricks, PostgreSQL with pgvector, Valkey, SpiceDB, Cube, the Hub API and worker, plus the required migration and initialization jobs. Generated secrets use hex characters so they remain safe in PostgreSQL connection URLs.

On first start, an initialization container fetches the version-matched Cube config files from the Formbricks GitHub release. The app requires internet access for this first setup. The web installer lets the first user create the workspace owner account. Configure SMTP before enabling email verification or password recovery; both are disabled initially. Survey uploads require configuring an S3-compatible storage provider.

Persistent data is under the app's `postgres`, `redis`, `cube`, and `saml-connection` data paths. Back up the complete Formbricks data directory before upgrades. Formbricks releases can require a maintenance window and coordinated migrations; read each release's upgrade notes before changing the pinned app version. Optional AI taxonomy, GPU model serving, and enterprise-only features are not enabled by this package.
