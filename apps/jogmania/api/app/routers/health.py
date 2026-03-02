from fastapi import APIRouter

from ..schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
  return HealthResponse(status="ok")
