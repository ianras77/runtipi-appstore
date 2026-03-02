from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, declarative_base, mapped_column, relationship

Base = declarative_base()


class User(Base):
  __tablename__ = "users"

  id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
  email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
  hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

  runs: Mapped[list["Run"]] = relationship("Run", back_populates="user")


class Run(Base):
  __tablename__ = "runs"

  id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
  user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
  started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
  duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
  avg_pace: Mapped[float] = mapped_column(Float, nullable=False)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

  user: Mapped[User] = relationship("User", back_populates="runs")
