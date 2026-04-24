from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services import api_key_service
from app.services.user_service import get_user_or_404

router = APIRouter(prefix="/api/v1/users", tags=["api-keys"])


class ApiKeyResponse(BaseModel):
    api_key: str
    prefix: str


def _check_access(current_user: User, user_id: int) -> None:
    if current_user.role != "admin" and current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")


@router.post("/{user_id}/api-key", response_model=ApiKeyResponse, summary="Generate or regenerate API key")
def generate_api_key(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_access(current_user, user_id)
    target = get_user_or_404(db, user_id)
    raw = api_key_service.generate(db, target)
    return ApiKeyResponse(api_key=raw, prefix=target.api_key_prefix)


@router.delete("/{user_id}/api-key", status_code=204, summary="Revoke API key")
def revoke_api_key(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_access(current_user, user_id)
    target = get_user_or_404(db, user_id)
    if not target.api_key_hash:
        raise HTTPException(status_code=404, detail="No API key to revoke.")
    api_key_service.revoke(db, target)
