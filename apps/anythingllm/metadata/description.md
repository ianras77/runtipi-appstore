# AnythingLLM

Self-hosted chat over your data. Upload files, crawl sites, or connect sources; then chat with them using local or hosted LLMs. Multi-user via built-in registration.

## What’s Included
- AnythingLLM web/server (main)
- Persistent storage for embeddings, uploads, settings

## Ports & URLs
- Internal port: **3001** (proxied by Runtipi)

## Volumes
| Host path                      | Container path             | Purpose      |
|-------------------------------|----------------------------|--------------|
| `${APP_DATA_DIR}/storage`     | `/app/server/storage`      | App data     |

## First-Run Settings (Install Form)
- `JWT_SECRET` (random)
- `ALLOW_REGISTRATION=true` to enable multi-user signups
- Choose your model provider (OpenAI/LocalAI/Ollama, etc.) within the UI

## Multi-User
- Multiple users with workspaces; toggle registration on/off.

## Tips
- Create a workspace, ingest docs, configure your embedder & LLM, then chat.

