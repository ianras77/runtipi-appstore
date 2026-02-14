from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import engine
from .models import Base
from .routers import ai, auth, health, runs
from .settings import settings

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
  CORSMiddleware,
  allow_origins=[settings.cors_allow_origins] if settings.cors_allow_origins else ["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"]
)


@app.on_event("startup")
def on_startup() -> None:
  Base.metadata.create_all(bind=engine)


app.include_router(health.router)
app.include_router(auth.router)
app.include_router(runs.router)
app.include_router(ai.router)
