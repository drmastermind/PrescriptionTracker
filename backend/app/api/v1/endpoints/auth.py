from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.tokens import rotate_refresh_token, revoke_refresh_token
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    AdminResetPasswordRequest,
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserRead
from app.services import auth_service
from app.services.user_service import get_user_or_404
from app.core.deps import require_admin
from app.core.config import settings

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    return forwarded.split(",")[0].strip() if forwarded else request.client.host if request.client else None


@router.post("/login", response_model=TokenResponse, summary="Login")
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    return auth_service.login(db, body.login_name, body.password, request.headers.get("user-agent"), _client_ip(request))


@router.post("/register", response_model=UserRead, status_code=201, summary="Register")
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    return auth_service.register(db, body.login_name, body.user_name, body.email, body.password)


@router.get("/me", response_model=UserRead, summary="Current user")
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/refresh", response_model=TokenResponse, summary="Refresh tokens")
def refresh(request: Request, db: Session = Depends(get_db)):
    raw = request.headers.get("X-Refresh-Token")
    if not raw:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Refresh token required.")
    result = rotate_refresh_token(db, raw, request.headers.get("user-agent"), _client_ip(request))
    if not result:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token.")
    new_raw, user_id = result
    user = db.query(User).filter(User.user_id == user_id).first()
    access = create_access_token(user.user_id, user.role)
    return TokenResponse(
        access_token=access,
        refresh_token=new_raw,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", status_code=204, summary="Logout")
def logout(request: Request, db: Session = Depends(get_db)):
    raw = request.headers.get("X-Refresh-Token")
    if raw:
        revoke_refresh_token(db, raw)


@router.post("/change-password", status_code=204, summary="Change own password")
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    auth_service.change_password(db, current_user, body.current_password, body.new_password)


@router.post("/admin-reset-password/{user_id}", status_code=204, summary="Admin: reset a user password")
def admin_reset_password(
    user_id: int,
    body: AdminResetPasswordRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    target = get_user_or_404(db, user_id)
    auth_service.admin_reset_password(db, target, body.new_password)
