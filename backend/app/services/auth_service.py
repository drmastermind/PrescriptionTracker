from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.core.tokens import issue_refresh_token, revoke_all_for_user
from app.models.user import User
from app.schemas.auth import TokenResponse


def _build_token_response(db: Session, user: User, user_agent: str | None, ip: str | None) -> TokenResponse:
    access = create_access_token(user.user_id, user.role)
    refresh = issue_refresh_token(db, user.user_id, user_agent, ip)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def login(
    db: Session, login_name: str, password: str, user_agent: str | None, ip: str | None
) -> TokenResponse:
    user = db.query(User).filter(User.login_name == login_name).first()

    # Check lockout before anything else (prevent timing attacks revealing user existence)
    now = datetime.now(timezone.utc)
    if user and user.locked_until and user.locked_until.replace(tzinfo=timezone.utc) > now:
        raise HTTPException(status_code=403, detail={"code": "ACCOUNT_LOCKED", "message": "Account is temporarily locked. Try again later."})

    if not user or not user.password_hash or not verify_password(password, user.password_hash):
        if user:
            user.failed_login_count += 1
            if user.failed_login_count >= settings.LOGIN_FAILED_LOCKOUT_THRESHOLD:
                from datetime import timedelta
                user.locked_until = now + timedelta(minutes=settings.LOGIN_FAILED_LOCKOUT_MINUTES)
                user.failed_login_count = 0
            db.commit()
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled.")

    user.failed_login_count = 0
    user.locked_until = None
    db.commit()

    return _build_token_response(db, user, user_agent, ip)


def register(
    db: Session,
    login_name: str,
    user_name: str,
    email: str,
    password: str,
    role: str = "normal",
) -> User:
    if db.query(User).filter(User.login_name == login_name).first():
        raise HTTPException(status_code=409, detail="login_name already taken.")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email already registered.")

    user = User(
        login_name=login_name,
        user_name=user_name,
        email=email,
        password_hash=hash_password(password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    if not user.password_hash or not verify_password(current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")
    user.password_hash = hash_password(new_password)
    revoke_all_for_user(db, user.user_id)
    db.commit()


def admin_reset_password(db: Session, target_user: User, new_password: str) -> None:
    target_user.password_hash = hash_password(new_password)
    revoke_all_for_user(db, target_user.user_id)
    db.commit()
