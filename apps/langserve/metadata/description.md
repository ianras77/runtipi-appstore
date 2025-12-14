# LangChain (LangServe)

Serve LangChain runnables as HTTP APIs using **LangServe**. This starter ships a ready container; you just mount your app code and point LangServe at your FastAPI app (e.g., `server:app`).

---

## What you get
- **LangServe runtime** (Uvicorn + FastAPI)
- Runtipi reverse proxy to the main service
- Hot-reload is not enabled (production defaults)

---

## Ports & URLs
- Internal app port: **8000** (proxied by Runtipi)
- After deploy: open from your Tipi dashboard (no extra port mapping needed)

---

## Volumes & persistence
| Host path                    | Container path | Purpose                      |
|-----------------------------|----------------|------------------------------|
| `${APP_DATA_DIR}/app`       | `/app`         | Your LangChain/LangServe code |

> Place your Python package / files here. The container runs `uvicorn ${LANGSERVE_MODULE}`.

---

## Environment
These are provided by the app definition:

| Variable           | Example            | Purpose                                  |
|--------------------|--------------------|------------------------------------------|
| `LANGSERVE_MODULE` | `server:app`       | Module path to your FastAPI app object   |
| `PORT`             | `8000`             | Service port inside the container        |

Set any provider keys your chains need (e.g., `OPENAI_API_KEY`) as environment variables via Tipi → App → **Environment**.

---

## Minimal “hello world”
Create `${APP_DATA_DIR}/app/server.py`:

```python
from fastapi import FastAPI
from langchain_core.runnables import RunnableLambda
from langserve import add_routes

app = FastAPI()
echo = RunnableLambda(lambda x: {"echo": x})
add_routes(app, echo, path="/echo")  # GET /echo?input=hi

