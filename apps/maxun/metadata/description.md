## Automate web data collection

Maxun records browser actions and turns them into reusable extraction, scraping, crawling, and monitoring workflows. It includes a web interface, API, PostgreSQL database, headless browser service, and S3-compatible object storage.

This recipe uses RustFS for S3 storage because the MinIO container image referenced by Maxun's current sample Compose file is no longer available from its documented registry. RustFS stores screenshots and files in the app data directory.

Before installation, create a dedicated DNS hostname for the S3 endpoint, point it at this Runtipi server, and enter that hostname and its HTTPS URL in the install fields. S3 signed URLs require a dedicated hostname; serving the object API from a URL subpath is unsupported. The app's first user registers through the web interface. Optional Google Sheets and Airtable OAuth credentials can be added in the install fields.

The browser and backend containers can use up to about 8 GiB together during heavy work. Keep the generated JWT, session, database, object store, and encryption secrets with the app's persistent data; the encryption key is required to read saved credentials after restoration.
