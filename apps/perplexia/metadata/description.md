# Perplexica

Open-source AI meta-search engine with a modern UI and background server. This package wires Postgres + Redis for persistence and speed.

## What’s Included
- Web UI (main)
- Server/API
- PostgreSQL 15 and Redis 7

## Ports & URLs
- Web internal port: **3000** (proxied by Runtipi)
- Server internal port: **3001** (internal only)

## Volumes
| Host path                      | Container path     | Purpose         |
|-------------------------------|--------------------|-----------------|
| `${APP_DATA_DIR}/postgres`    | DB data volume     | Postgres data   |

## First-Run Settings (Install Form)
- `POSTGRES_PASSWORD` (DB user: `perplexica`)
- Optional provider/API keys in server env (set in Tipi form or server UI if supported)

## Multi-User
- UI does not enforce strong user isolation; protect via Runtipi auth when exposing publicly.

## Tips
- Add provider keys (LLMs, search APIs) for best results.

