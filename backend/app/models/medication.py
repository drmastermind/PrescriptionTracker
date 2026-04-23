from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Medication(Base):
    __tablename__ = "medications"

    medication_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    medication_name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    generic_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    strength: Mapped[str | None] = mapped_column(String(50), nullable=True)
    form: Mapped[str | None] = mapped_column(String(50), nullable=True)
    brand_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    prescriptions: Mapped[list["Prescription"]] = relationship(back_populates="medication")
