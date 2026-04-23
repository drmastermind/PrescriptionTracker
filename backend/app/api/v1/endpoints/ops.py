from fastapi import APIRouter
from sqlalchemy import text

from app.db.session import SessionLocal

router = APIRouter(tags=["ops"])


@router.get("/healthz", summary="Liveness check")
def healthz():
    return {"status": "ok"}


@router.get("/readyz", summary="Readiness check (DB ping)")
def readyz():
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "ok", "db": "ok"}
    except Exception as exc:
        return {"status": "error", "db": str(exc)}


@router.get("/api/v1/version", tags=["ops"], summary="App version")
def version():
    return {"app": "PrescriptionTracker", "version": "1.0.0"}
