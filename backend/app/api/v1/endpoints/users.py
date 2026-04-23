from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.user import UserAdminUpdate, UserCreate, UserRead, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("", response_model=PaginatedResponse[UserRead], summary="List users (admin)")
def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return user_service.list_users(db, page, size)


@router.post("", response_model=UserRead, status_code=201, summary="Create user (admin)")
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
):
    return user_service.create_user(db, body, actor.user_id)


@router.get("/me/export", summary="Export own data")
def export_self(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.models.prescription import Prescription
    from sqlalchemy.orm import joinedload
    rxs = db.query(Prescription).options(joinedload(Prescription.medication)).filter(
        Prescription.user_id == current_user.user_id
    ).all()
    return {
        "user": UserRead.model_validate(current_user).model_dump(),
        "prescriptions": [
            {
                "prescription_id": r.prescription_id,
                "medication": r.medication.medication_name,
                "dosage": r.dosage,
                "frequency": r.frequency,
                "doctor": r.doctor,
                "is_active": r.is_active,
            }
            for r in rxs
        ],
    }


@router.delete("/me", status_code=204, summary="Anonymize own account")
def delete_self(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.core.tokens import revoke_all_for_user
    revoke_all_for_user(db, current_user.user_id)
    user_service.soft_delete_user(db, current_user, current_user.user_id)


@router.get("/{user_id}", response_model=UserRead, summary="Get user")
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin" and current_user.user_id != user_id:
        from app.core.errors import raise_forbidden
        raise_forbidden()
    return user_service.get_user_or_404(db, user_id)


@router.patch("/{user_id}", response_model=UserRead, summary="Update user")
def update_user(
    user_id: int,
    body: UserAdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = user_service.get_user_or_404(db, user_id)
    if current_user.role == "admin":
        return user_service.update_user_admin(db, target, body, current_user)
    # Normal user can only update own allowed fields
    if current_user.user_id != user_id:
        from app.core.errors import raise_forbidden
        raise_forbidden()
    # Reject forbidden fields silently (return 403 if they tried to change protected fields)
    forbidden = {k for k in body.model_dump(exclude_unset=True) if k not in ("user_name", "email")}
    if forbidden:
        from app.core.errors import raise_forbidden
        raise_forbidden(f"Fields not editable by normal users: {', '.join(sorted(forbidden))}")
    self_update = UserUpdate(user_name=body.user_name, email=body.email)
    return user_service.update_user_self(db, target, self_update)


@router.put("/{user_id}", response_model=UserRead, summary="Replace user (admin)")
def replace_user(
    user_id: int,
    body: UserAdminUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
):
    target = user_service.get_user_or_404(db, user_id)
    return user_service.update_user_admin(db, target, body, actor)


@router.delete("/{user_id}", status_code=204, summary="Delete user (admin)")
def delete_user(
    user_id: int,
    hard: bool = Query(False),
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
):
    target = user_service.get_user_or_404(db, user_id)
    if hard:
        user_service.hard_delete_user(db, target, actor.user_id)
    else:
        user_service.soft_delete_user(db, target, actor.user_id)


@router.get("/{user_id}/prescriptions", summary="Get user's prescriptions")
def user_prescriptions(
    user_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    active: bool | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.user_id != user_id:
        from app.core.errors import raise_forbidden
        raise_forbidden()
    user_service.get_user_or_404(db, user_id)
    from app.services.prescription_service import list_prescriptions
    return list_prescriptions(db, page, size, user_id=user_id, active=active)
