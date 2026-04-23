import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.refresh_token import RefreshToken


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def issue_refresh_token(db: Session, user_id: int, user_agent: str | None, ip: str | None) -> str:
    raw = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    record = RefreshToken(
        user_id=user_id,
        token_hash=_hash(raw),
        issued_at=datetime.now(timezone.utc),
        expires_at=expires,
        user_agent=user_agent,
        ip_address=ip,
    )
    db.add(record)
    db.commit()
    return raw


def rotate_refresh_token(
    db: Session, raw: str, user_agent: str | None, ip: str | None
) -> tuple[str, int] | None:
    """Validate and rotate a refresh token. Returns (new_raw_token, user_id) or None if invalid."""
    hashed = _hash(raw)
    now = datetime.now(timezone.utc)
    record = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == hashed,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > now,
        )
        .first()
    )
    if not record:
        return None

    new_raw = secrets.token_urlsafe(32)
    new_expires = now + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    new_record = RefreshToken(
        user_id=record.user_id,
        token_hash=_hash(new_raw),
        issued_at=now,
        expires_at=new_expires,
        user_agent=user_agent,
        ip_address=ip,
    )
    db.add(new_record)
    db.flush()

    record.revoked_at = now
    record.replaced_by = new_record.token_id
    db.commit()
    return new_raw, record.user_id


def revoke_refresh_token(db: Session, raw: str) -> bool:
    hashed = _hash(raw)
    record = db.query(RefreshToken).filter(
        RefreshToken.token_hash == hashed, RefreshToken.revoked_at.is_(None)
    ).first()
    if not record:
        return False
    record.revoked_at = datetime.now(timezone.utc)
    db.commit()
    return True


def revoke_all_for_user(db: Session, user_id: int) -> None:
    now = datetime.now(timezone.utc)
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None)
    ).update({"revoked_at": now})
    db.commit()
