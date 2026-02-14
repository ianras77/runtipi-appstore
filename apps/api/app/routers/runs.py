from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import Run, User
from ..schemas import ExportResponse, RunCreate, RunOut
from ..s3_client import ensure_bucket, get_s3_client, upload_json
from ..settings import settings

router = APIRouter(tags=["runs"])


@router.post("/runs", response_model=RunOut)
def create_run(
  payload: RunCreate,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user)
) -> RunOut:
  run = Run(
    user_id=current_user.id,
    started_at=payload.started_at,
    duration_seconds=payload.duration_seconds,
    avg_pace=payload.avg_pace
  )
  db.add(run)
  db.commit()
  db.refresh(run)
  return run


@router.get("/runs", response_model=list[RunOut])
def list_runs(
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user)
) -> list[RunOut]:
  return (
    db.query(Run)
    .filter(Run.user_id == current_user.id)
    .order_by(Run.created_at.desc())
    .all()
  )


@router.post("/exports/run/{run_id}", response_model=ExportResponse, tags=["exports"])
def export_run(
  run_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user)
) -> ExportResponse:
  run = (
    db.query(Run)
    .filter(Run.id == run_id, Run.user_id == current_user.id)
    .first()
  )
  if not run:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

  client = get_s3_client()
  ensure_bucket(client, settings.s3_bucket)

  object_key = f"runs/{current_user.id}/{run.id}.json"
  payload = {
    "id": run.id,
    "user_id": run.user_id,
    "started_at": run.started_at.isoformat(),
    "duration_seconds": run.duration_seconds,
    "avg_pace": run.avg_pace,
    "created_at": run.created_at.isoformat()
  }
  upload_json(client, settings.s3_bucket, object_key, payload)
  return ExportResponse(status="ok", object_key=object_key)
