from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .db import get_db
from .models import User
from .settings import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def hash_password(password: str) -> str:
  return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
  return pwd_context.verify(password, hashed_password)


def create_access_token(subject: str) -> str:
  expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
  payload = {"sub": subject, "exp": expire}
  return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_current_user(
  credentials: HTTPAuthorizationCredentials = Depends(security),
  db: Session = Depends(get_db)
) -> User:
  token = credentials.credentials
  try:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    user_id = int(payload.get("sub"))
  except (JWTError, TypeError, ValueError):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

  user = db.query(User).filter(User.id == user_id).first()
  if not user:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
  return user
