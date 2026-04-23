from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Prescription(Base):
    __tablename__ = "prescriptions"
    __table_args__ = (
        Index("idx_prescriptions_user_id", "user_id"),
        Index("idx_prescriptions_medication_id", "medication_id"),
        Index("idx_prescriptions_user_active", "user_id", "is_active"),
    )

    prescription_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False)
    medication_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("medications.medication_id", ondelete="RESTRICT"), nullable=False
    )
    dosage: Mapped[str | None] = mapped_column(String(100), nullable=True)
    frequency: Mapped[str | None] = mapped_column(String(100), nullable=True)
    doctor: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    prescribed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    refills_remaining: Mapped[int | None] = mapped_column(Integer, nullable=True)
    route: Mapped[str | None] = mapped_column(String(30), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    pharmacy: Mapped[str | None] = mapped_column(String(200), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="prescriptions")
    medication: Mapped["Medication"] = relationship(back_populates="prescriptions")
