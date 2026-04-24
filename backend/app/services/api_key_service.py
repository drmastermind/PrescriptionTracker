import hashlib
import secrets

from sqlalchemy.orm import Session

from app.models.user import User

_PREFIX = "pt_"
_KEY_BYTES = 32  # 64 hex chars → 67 total with prefix


def _raw_key() -> str:
    return _PREFIX + secrets.token_hex(_KEY_BYTES)


def _hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _make_prefix(raw: str) -> str:
    return raw[:11]  # "pt_" + first 8 hex chars


def generate(db: Session, user: User) -> str:
    raw = _raw_key()
    user.api_key_hash = _hash_key(raw)
    user.api_key_prefix = _make_prefix(raw)
    db.commit()
    return raw


def revoke(db: Session, user: User) -> None:
    user.api_key_hash = None
    user.api_key_prefix = None
    db.commit()


def verify(db: Session, raw: str) -> User | None:
    if not raw or not raw.startswith(_PREFIX):
        return None
    h = _hash_key(raw)
    return db.query(User).filter(
        User.api_key_hash == h,
        User.is_active == True,
    ).first()
