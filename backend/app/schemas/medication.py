from datetime import datetime

from pydantic import BaseModel


class MedicationCreate(BaseModel):
    medication_name: str
    generic_name: str | None = None
    strength: str | None = None
    form: str | None = None
    brand_name: str | None = None


class MedicationUpdate(BaseModel):
    medication_name: str | None = None
    generic_name: str | None = None
    strength: str | None = None
    form: str | None = None
    brand_name: str | None = None


class MedicationRead(BaseModel):
    model_config = {"from_attributes": True}

    medication_id: int
    medication_name: str
    generic_name: str | None
    strength: str | None
    form: str | None
    brand_name: str | None
    created_at: datetime
    updated_at: datetime


class MedicationLookup(BaseModel):
    model_config = {"from_attributes": True}

    medication_id: int
    medication_name: str
    generic_name: str | None
