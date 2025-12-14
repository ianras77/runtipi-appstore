# Astroluma

Self-hosted media dashboard (streams & listings) on a MERN stack. This package includes MongoDB.

## What’s Included
- Astroluma app (main)
- MongoDB 6.0

## Ports & URLs
- Internal port: **8000** (proxied by Runtipi)

## Volumes
| Host path                      | Container path              | Purpose         |
|-------------------------------|-----------------------------|-----------------|
| `${APP_DATA_DIR}/uploads`     | `/app/storage/uploads`      | Media uploads   |
| `${APP_DATA_DIR}/mongo`       | `/data/db`                  | Mongo data      |

## First-Run Settings (Install Form)
- `SECRET_KEY` (random)
- `MONGODB_URI` is prewired to the bundled Mongo
- Optional: `PORT=8000`, `NODE_ENV=production`

## Multi-User
- Supports multiple users/admins within the app UI.

## Tips
- After first login, change defaults and create user roles as needed.

