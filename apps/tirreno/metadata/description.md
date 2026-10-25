# Tirreno

Tirreno is a self-hosted product analytics and fraud detection platform. It stores its web application and analytics database on persistent Runtipi app data.

## First start

Open `/install/` on the app's Runtipi address. Use the database URL `postgresql://tirreno:<password>@tirreno-db:5432/tirreno`, replacing `<password>` with the PostgreSQL password shown in the app's Runtipi configuration. Complete the installer, then use `/signup` to create the administrator account. Follow Tirreno's post-install guidance, including its installer cleanup and scheduled cron task, before using it for production analytics. Keep the database and application data in backups.
