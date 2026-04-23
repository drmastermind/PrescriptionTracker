from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.prescription import PrescriptionCreate, PrescriptionRead, PrescriptionUpdate
from app.services import prescription_service

router = APIRouter(prefix="/api/v1/prescriptions", tags=["prescriptions"])


def _check_owner_or_admin(rx, current_user: User) -> None:
    if current_user.role != "admin" and rx.user_id != current_user.user_id:
        from app.core.errors import raise_forbidden
        raise_forbidden()


@router.get("", response_model=PaginatedResponse[PrescriptionRead], summary="List prescriptions")
def list_prescriptions(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user_id: int | None = Query(None),
    active: bool | None = Query(None),
    doctor: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Normal users can only see their own
    if current_user.role != "admin":
        user_id = current_user.user_id
    return prescription_service.list_prescriptions(db, page, size, user_id, active, doctor)


@router.get("/{prescription_id}", response_model=PrescriptionRead, summary="Get prescription")
def get_prescription(
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rx = prescription_service.get_prescription_or_404(db, prescription_id)
    _check_owner_or_admin(rx, current_user)
    return rx


@router.post("", response_model=PrescriptionRead, status_code=201, summary="Create prescription")
def create_prescription(
    body: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and body.user_id != current_user.user_id:
        from app.core.errors import raise_forbidden
        raise_forbidden()
    return prescription_service.create_prescription(db, body, current_user.user_id)


@router.patch("/{prescription_id}", response_model=PrescriptionRead, summary="Update prescription")
def update_prescription(
    prescription_id: int,
    body: PrescriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rx = prescription_service.get_prescription_or_404(db, prescription_id)
    _check_owner_or_admin(rx, current_user)
    return prescription_service.update_prescription(db, rx, body, current_user.user_id)


@router.put("/{prescription_id}", response_model=PrescriptionRead, summary="Replace prescription")
def replace_prescription(
    prescription_id: int,
    body: PrescriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rx = prescription_service.get_prescription_or_404(db, prescription_id)
    _check_owner_or_admin(rx, current_user)
    return prescription_service.update_prescription(db, rx, body, current_user.user_id)


@router.delete("/{prescription_id}", status_code=204, summary="Delete prescription (soft by default)")
def delete_prescription(
    prescription_id: int,
    hard: bool = Query(False, description="Admin-only hard delete"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rx = prescription_service.get_prescription_or_404(db, prescription_id)
    _check_owner_or_admin(rx, current_user)
    if hard and current_user.role != "admin":
        from app.core.errors import raise_forbidden
        raise_forbidden("Hard delete requires admin role.")
    if hard:
        prescription_service.hard_delete_prescription(db, rx, current_user.user_id)
    else:
        prescription_service.soft_delete_prescription(db, rx, current_user.user_id)
