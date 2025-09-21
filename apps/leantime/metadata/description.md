# Leantime

Open-source project management for small teams (Kanban, tasks, roadmap, timesheets). This package uses MySQL and persists user files/plugins/logs.

## What’s Included
- Leantime app (main)
- MySQL 8.4

## Ports & URLs
- Internal port: **8080** (proxied by Runtipi)

## Volumes
| Host path                             | Container path                           | Purpose             |
|--------------------------------------|------------------------------------------|---------------------|
| `${APP_DATA_DIR}/public_userfiles`   | `/var/www/html/public/userfiles`         | Public uploads      |
| `${APP_DATA_DIR}/userfiles`          | `/var/www/html/userfiles`                | Userfiles           |
| `${APP_DATA_DIR}/plugins`            | `/var/www/html/app/Plugins`              | Plugins             |
| `${APP_DATA_DIR}/logs`               | `/var/www/html/storage/logs`             | App logs            |
| `${APP_DATA_DIR}/mysql`              | `/var/lib/mysql`                         | MySQL data          |

## First-Run Settings (Install Form)
- DB: `MYSQL_PASSWORD` (used for root + user), `LEAN_DB_*` injected automatically
- Session: `LEAN_SESSION_PASSWORD` (random)
- URL: `LEAN_APP_URL` (your public domain)

## Multi-User
- Multi-user/team support out of the box (roles, projects, timesheets).

## Tips
- Configure SMTP inside the app after install to send notifications.

