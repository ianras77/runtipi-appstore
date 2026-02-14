from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class HealthResponse(BaseModel):
  status: str = "ok"


class RegisterRequest(BaseModel):
  email: EmailStr
  password: str = Field(min_length=8)


class LoginRequest(BaseModel):
  email: EmailStr
  password: str


class TokenResponse(BaseModel):
  access_token: str
  token_type: str = "bearer"


class UserOut(BaseModel):
  id: int
  email: EmailStr
  created_at: datetime

  model_config = ConfigDict(from_attributes=True)


class RunCreate(BaseModel):
  started_at: datetime
  duration_seconds: int
  avg_pace: float


class RunOut(BaseModel):
  id: int
  user_id: int
  started_at: datetime
  duration_seconds: int
  avg_pace: float
  created_at: datetime

  model_config = ConfigDict(from_attributes=True)


class QuestRequest(BaseModel):
  prompt: str


class QuestResponse(BaseModel):
  quest_text: str
  metadata: dict[str, Any]


class NarrateRequest(BaseModel):
  context: str


class NarrateResponse(BaseModel):
  narration_text: str


class ExportResponse(BaseModel):
  status: str
  object_key: str
