# Plane (Community Edition)

Open-source issue tracking and roadmaps. This package includes Postgres, Redis, and MinIO (S3 compatible) with a separate backend/worker.

## What’s Included
- Frontend web (main)
- Backend API
- Worker
- PostgreSQL 15, Redis 7, MinIO (object storage)

## Ports & URLs
- Web internal port: **80** (some tags serve on **3000**; adjust if needed)
- Backend internal port: **8000** (internal only)
- MinIO console internal port: **9001** (internal)

## Volumes
| Host path                      | Container path | Purpose        |
|-------------------------------|----------------|----------------|
| `${APP_DATA_DIR}/postgres`    | DB volume      | Postgres data  |
| `${APP_DATA_DIR}/minio`       | `/data`        | Object storage |

## First-Run Settings (Install Form)
- `POSTGRES_PASSWORD`
- `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
- Web/Backend URLs are prewired; update domain in frontend env if needed

## Multi-User
- Full multi-user/team projects, roles, and permissions.

## Tips
- Create MinIO bucket `plane` (or use the init UI) if not auto-created.

