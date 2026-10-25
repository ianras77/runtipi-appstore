# Endurain

Endurain is a self-hosted fitness tracker for your activities, equipment and health data. It supports GPX, TCX and FIT uploads, with Strava and Garmin sync options.

## First start

Sign in with the initial credentials `admin` / `admin` and change the password immediately. The app uses the Runtipi address when generating links and runs behind the Runtipi proxy. Activity files, logs and PostgreSQL data are stored persistently under this app's data directory. Add Strava or Garmin credentials inside Endurain only if you want those integrations.

The activity encryption key protects sensitive stored data. Keep the Runtipi app configuration and app data together when backing up or migrating this installation.
