from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.medication import MedicationLookup
from app.schemas.user import UserLookup
from app.services.medication_service import lookup_medications

router = APIRouter(prefix="/api/v1/lookups", tags=["lookups"])


@router.get("/medications", response_model=list[MedicationLookup], summary="All medications for dropdowns")
def medications_lookup(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return lookup_medications(db)


@router.get("/users", response_model=list[UserLookup], summary="All active users for dropdowns")
def users_lookup(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    from app.models.user import User as UserModel
    users = db.query(UserModel).filter(UserModel.is_active == True).order_by(UserModel.user_name).all()
    return [UserLookup.model_validate(u) for u in users]
