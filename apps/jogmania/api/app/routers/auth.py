from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import create_access_token, get_current_user, hash_password, verify_password
from ..db import get_db
from ..models import User
from ..schemas import LoginRequest, RegisterRequest, TokenResponse, UserOut

router = APIRouter(tags=["auth"])


@router.post("/auth/register", response_model=UserOut)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> UserOut:
  existing = db.query(User).filter(User.email == payload.email).first()
  if existing:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

  user = User(email=payload.email, hashed_password=hash_password(payload.password))
  db.add(user)
  db.commit()
  db.refresh(user)
  return user


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
  user = db.query(User).filter(User.email == payload.email).first()
  if not user or not verify_password(payload.password, user.hashed_password):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

  token = create_access_token(str(user.id))
  return TokenResponse(access_token=token, token_type="bearer")


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
  return current_user
