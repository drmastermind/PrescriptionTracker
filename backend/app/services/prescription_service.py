from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.medication import Medication
from app.models.prescription import Prescription
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.prescription import PrescriptionCreate, PrescriptionRead, PrescriptionUpdate
from app.services.audit_service import log_action


def get_prescription_or_404(db: Session, prescription_id: int) -> Prescription:
    rx = (
        db.query(Prescription)
        .options(joinedload(Prescription.medication))
        .filter(Prescription.prescription_id == prescription_id)
        .first()
    )
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found.")
    return rx


def _base_query(db: Session):
    return db.query(Prescription).options(joinedload(Prescription.medication))


def list_prescriptions(
    db: Session,
    page: int,
    size: int,
    user_id: int | None = None,
    active: bool | None = None,
    doctor: str | None = None,
) -> PaginatedResponse[PrescriptionRead]:
    query = _base_query(db)
    if user_id is not None:
        query = query.filter(Prescription.user_id == user_id)
    if active is not None:
        query = query.filter(Prescription.is_active == active)
    if doctor:
        query = query.filter(Prescription.doctor.ilike(f"%{doctor}%"))

    total = db.query(Prescription).filter(
        *(
            ([Prescription.user_id == user_id] if user_id else [])
            + ([Prescription.is_active == active] if active is not None else [])
            + ([Prescription.doctor.ilike(f"%{doctor}%")] if doctor else [])
        )
    ).count()

    items = (
        query.join(Medication)
        .order_by(Medication.medication_name, Prescription.doctor, Prescription.prescription_id)
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return PaginatedResponse(
        items=[PrescriptionRead.model_validate(r) for r in items],
        total=total,
        page=page,
        size=size,
        pages=max(1, -(-total // size)),
    )


def create_prescription(db: Session, data: PrescriptionCreate, actor_id: int) -> Prescription:
    if not db.query(User).filter(User.user_id == data.user_id, User.is_active == True).first():
        raise HTTPException(status_code=404, detail="User not found.")
    if not db.query(Medication).filter(Medication.medication_id == data.medication_id).first():
        raise HTTPException(status_code=404, detail="Medication not found.")

    rx = Prescription(**data.model_dump())
    db.add(rx)
    db.flush()
    log_action(db, "prescription", rx.prescription_id, "create", actor_id)
    db.commit()
    db.refresh(rx)
    return get_prescription_or_404(db, rx.prescription_id)


def update_prescription(db: Session, rx: Prescription, data: PrescriptionUpdate, actor_id: int) -> Prescription:
    if data.medication_id is not None:
        if not db.query(Medication).filter(Medication.medication_id == data.medication_id).first():
            raise HTTPException(status_code=404, detail="Medication not found.")

    before = {"is_active": rx.is_active, "dosage": rx.dosage, "medication_id": rx.medication_id}
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(rx, key, value)
    after = {"is_active": rx.is_active, "dosage": rx.dosage, "medication_id": rx.medication_id}

    log_action(db, "prescription", rx.prescription_id, "update", actor_id, {"before": before, "after": after})
    db.commit()
    return get_prescription_or_404(db, rx.prescription_id)


def soft_delete_prescription(db: Session, rx: Prescription, actor_id: int) -> None:
    rx.is_active = False
    log_action(db, "prescription", rx.prescription_id, "soft_delete", actor_id)
    db.commit()


def hard_delete_prescription(db: Session, rx: Prescription, actor_id: int) -> None:
    log_action(db, "prescription", rx.prescription_id, "delete", actor_id)
    db.delete(rx)
    db.commit()
