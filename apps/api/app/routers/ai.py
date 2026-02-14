import json
from datetime import datetime

from fastapi import APIRouter, Depends
from ..ai_provider import call_llm
from ..auth import get_current_user
from ..models import User
from ..redis_client import get_redis
from ..schemas import NarrateRequest, NarrateResponse, QuestRequest, QuestResponse
from ..settings import settings

router = APIRouter(prefix="/ai", tags=["ai"])


def offline_quest_text(user_id: int) -> str:
  day = datetime.utcnow().strftime("%Y-%m-%d")
  return (
    f"OFFLINE QUEST [{day}] :: Runner {user_id}, complete a 20-minute neon sprint. "
    "Collect 3 streetlight checkpoints and finish with a victory stretch."
  )


def offline_narration_text(user_id: int) -> str:
  day = datetime.utcnow().strftime("%Y-%m-%d")
  return (
    f"OFFLINE NARRATION [{day}] :: Your footsteps echo like arcade beats. "
    "Keep the rhythm and chase the glow."
  )


def cache_key(user_id: int, kind: str) -> str:
  day = datetime.utcnow().strftime("%Y-%m-%d")
  return f"ai:{user_id}:{day}:{kind}"


@router.post("/quest", response_model=QuestResponse)
def quest(
  payload: QuestRequest,
  current_user: User = Depends(get_current_user)
) -> QuestResponse:
  redis_client = get_redis()
  key = cache_key(current_user.id, "quest")
  cached = redis_client.get(key)
  if cached:
    return QuestResponse(**json.loads(cached))

  messages = [
    {"role": "system", "content": "You are a retro arcade running quest generator."},
    {"role": "user", "content": payload.prompt}
  ]

  try:
    quest_text = call_llm(messages, temperature=0.7, max_tokens=200)
    mode = "llm"
  except Exception:
    quest_text = offline_quest_text(current_user.id)
    mode = "offline"

  response = QuestResponse(
    quest_text=quest_text,
    metadata={"mode": mode, "user_id": current_user.id}
  )
  redis_client.setex(key, settings.ai_cache_ttl_seconds, response.model_dump_json())
  return response


@router.post("/narrate", response_model=NarrateResponse)
def narrate(
  payload: NarrateRequest,
  current_user: User = Depends(get_current_user)
) -> NarrateResponse:
  redis_client = get_redis()
  key = cache_key(current_user.id, "narrate")
  cached = redis_client.get(key)
  if cached:
    return NarrateResponse(**json.loads(cached))

  messages = [
    {"role": "system", "content": "You are a high-energy run narrator."},
    {"role": "user", "content": payload.context}
  ]

  try:
    narration = call_llm(messages, temperature=0.7, max_tokens=180)
  except Exception:
    narration = offline_narration_text(current_user.id)

  response = NarrateResponse(narration_text=narration)
  redis_client.setex(key, settings.ai_cache_ttl_seconds, response.model_dump_json())
  return response
