# Khoj

Khoj indexes your notes/files and gives you a fast semantic assistant. This package includes Postgres and exposes the web UI.

## What’s Included
- Khoj server (main)
- PostgreSQL 15 with persistence

## Ports & URLs
- Internal port: **42110** (proxied by Runtipi)

## Volumes
| Host path                      | Container path     | Purpose         |
|-------------------------------|--------------------|-----------------|
| `${APP_DATA_DIR}/data`        | `/root/.khoj`      | Khoj data       |
| `${APP_DATA_DIR}/postgres`    | DB data volume     | Postgres data   |

## First-Run Settings (Install Form)
- `KHOJ_ADMIN_EMAIL`, `KHOJ_ADMIN_PASSWORD`
- `KHOJ_DJANGO_SECRET_KEY` (random)
- Optional: `KHOJ_DOMAIN`

## Multi-User
- Admin can create additional users; supports multiple accounts.

## Tips
- Connect note sources (Obsidian, files, etc.), then query with natural language.

