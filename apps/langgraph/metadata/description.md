
---
# LangGraph (Server)

Boot the **LangGraph Server/API** with **Postgres** and **Redis** pre-wired. Use it to host agentic/graph apps and store state. Bring your own LangGraph app and point it at this server, or extend this stack with your code.

---

## What you get
- **LangGraph API** container (main service)
- **Postgres** for durable state
- **Redis** for queueing / caching
- Runtipi reverse proxy to the API

---

## Ports & URLs
- Internal API port: **8123** (proxied by Runtipi)
- Health endpoint: `/` (200 OK when ready)

---

## Volumes & persistence
| Host path                          | Container path                    | Purpose          |
|-----------------------------------|-----------------------------------|------------------|
| `${APP_DATA_DIR}/postgres`        | `/var/lib/postgresql/data`        | Postgres data    |
| `${APP_DATA_DIR}/redis`           | `/data`                           | Redis AOF/RDB    |

---

## Environment
Preconfigured in the app definition:

| Variable        | Example                                                         | Purpose                |
|-----------------|-----------------------------------------------------------------|------------------------|
| `DATABASE_URL`  | `postgresql://langgraph:${LANGGRAPH_DB_PASSWORD}@postgres:5432/langgraph` | DB connection string   |
| `REDIS_URI`     | `redis://redis:6379/0`                                          | Redis connection       |
| `PORT`          | `8123`                                                          | API port               |

> Set `LANGGRAPH_DB_PASSWORD` in the install form (Tipi generates/stores it). Add any provider keys your graphs require (OpenAI, Anthropic, etc.) via Tipi → App → **Environment**.

---

## Using this server
- **From your LangGraph app**: configure client/SDK to the API base (your Tipi URL), and set `DATABASE_URL`/`REDIS_URI` if you co-deploy components that run inside the same network.
- **Extending the stack**: add a worker/container with your graph code, sharing the same DB/Redis, or mount code into a custom image that talks to this API.

---

## Security & access
- Put auth in front of the API (reverse-proxy auth, network ACLs, or add an auth layer in your app).
- Rotate `LANGGRAPH_DB_PASSWORD` periodically (requires re-deploy & DB cred update).

---

## Backups
- **Postgres**: snapshot `${APP_DATA_DIR}/postgres` or run `pg_dump` from a sidecar.
- **Redis**: if persistence is enabled, back up `${APP_DATA_DIR}/redis`.

---

## Troubleshooting
- **API not ready** → check service logs; verify Postgres health passed.
- **DB errors** → confirm the `langgraph` DB/user exist (they’re created by envs) and the password matches.
- **Connection refused** from clients → verify you’re using the **Tipi URL** (Runtipi proxies the internal port) and any auth middleware you added allows requests.

