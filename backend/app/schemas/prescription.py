from datetime import date, datetime

from pydantic import BaseModel


class PrescriptionCreate(BaseModel):
    user_id: int
    medication_id: int
    dosage: str | None = None
    frequency: str | None = None
    doctor: str | None = None
    is_active: bool = True
    prescribed_date: date | None = None
    start_date: date | None = None
    end_date: date | None = None
    quantity: int | None = None
    refills_remaining: int | None = None
    route: str | None = None
    reason: str | None = None
    pharmacy: str | None = None
    notes: str | None = None


class PrescriptionUpdate(BaseModel):
    medication_id: int | None = None
    dosage: str | None = None
    frequency: str | None = None
    doctor: str | None = None
    is_active: bool | None = None
    prescribed_date: date | None = None
    start_date: date | None = None
    end_date: date | None = None
    quantity: int | None = None
    refills_remaining: int | None = None
    route: str | None = None
    reason: str | None = None
    pharmacy: str | None = None
    notes: str | None = None


class MedicationSummary(BaseModel):
    model_config = {"from_attributes": True}
    medication_id: int
    medication_name: str


class PrescriptionRead(BaseModel):
    model_config = {"from_attributes": True}

    prescription_id: int
    user_id: int
    medication_id: int
    medication: MedicationSummary
    dosage: str | None
    frequency: str | None
    doctor: str | None
    is_active: bool
    prescribed_date: date | None
    start_date: date | None
    end_date: date | None
    quantity: int | None
    refills_remaining: int | None
    route: str | None
    reason: str | None
    pharmacy: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
