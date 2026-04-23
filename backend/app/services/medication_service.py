from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.medication import Medication
from app.schemas.common import PaginatedResponse
from app.schemas.medication import MedicationCreate, MedicationLookup, MedicationRead, MedicationUpdate


def get_medication_or_404(db: Session, medication_id: int) -> Medication:
    med = db.query(Medication).filter(Medication.medication_id == medication_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found.")
    return med


def list_medications(db: Session, page: int, size: int, q: str | None = None) -> PaginatedResponse[MedicationRead]:
    query = db.query(Medication)
    if q:
        query = query.filter(Medication.medication_name.ilike(f"{q}%"))
    total = query.count()
    items = query.order_by(Medication.medication_name, Medication.medication_id).offset((page - 1) * size).limit(size).all()
    return PaginatedResponse(
        items=[MedicationRead.model_validate(m) for m in items],
        total=total,
        page=page,
        size=size,
        pages=max(1, -(-total // size)),
    )


def lookup_medications(db: Session) -> list[MedicationLookup]:
    items = db.query(Medication).order_by(Medication.medication_name).all()
    return [MedicationLookup.model_validate(m) for m in items]


def create_medication(db: Session, data: MedicationCreate) -> Medication:
    if db.query(Medication).filter(Medication.medication_name == data.medication_name).first():
        raise HTTPException(status_code=409, detail="Medication name already exists.")
    med = Medication(**data.model_dump())
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


def update_medication(db: Session, med: Medication, data: MedicationUpdate) -> Medication:
    updates = data.model_dump(exclude_unset=True)
    if "medication_name" in updates:
        existing = db.query(Medication).filter(
            Medication.medication_name == updates["medication_name"],
            Medication.medication_id != med.medication_id,
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="Medication name already exists.")
    for key, value in updates.items():
        setattr(med, key, value)
    db.commit()
    db.refresh(med)
    return med
