from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.medication import MedicationCreate, MedicationRead, MedicationUpdate
from app.services import medication_service

router = APIRouter(prefix="/api/v1/medications", tags=["medications"])


@router.get("", response_model=PaginatedResponse[MedicationRead], summary="List medications")
def list_medications(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, description="Name prefix search"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return medication_service.list_medications(db, page, size, q)


@router.get("/{medication_id}", response_model=MedicationRead, summary="Get medication")
def get_medication(
    medication_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return medication_service.get_medication_or_404(db, medication_id)


@router.post("", response_model=MedicationRead, status_code=201, summary="Create medication (admin)")
def create_medication(
    body: MedicationCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return medication_service.create_medication(db, body)


@router.patch("/{medication_id}", response_model=MedicationRead, summary="Update medication (admin)")
def update_medication(
    medication_id: int,
    body: MedicationUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    med = medication_service.get_medication_or_404(db, medication_id)
    return medication_service.update_medication(db, med, body)


@router.put("/{medication_id}", response_model=MedicationRead, summary="Replace medication (admin)")
def replace_medication(
    medication_id: int,
    body: MedicationCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    med = medication_service.get_medication_or_404(db, medication_id)
    update = MedicationUpdate(**body.model_dump())
    return medication_service.update_medication(db, med, update)
