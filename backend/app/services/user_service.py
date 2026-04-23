from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.user import UserAdminUpdate, UserCreate, UserRead, UserUpdate
from app.services.audit_service import log_action


def get_user_or_404(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


def list_users(db: Session, page: int, size: int) -> PaginatedResponse[UserRead]:
    query = db.query(User)
    total = query.count()
    items = query.order_by(User.user_name, User.user_id).offset((page - 1) * size).limit(size).all()
    return PaginatedResponse(
        items=[UserRead.model_validate(u) for u in items],
        total=total,
        page=page,
        size=size,
        pages=max(1, -(-total // size)),
    )


def create_user(db: Session, data: UserCreate, actor_id: int | None = None) -> User:
    if db.query(User).filter(User.login_name == data.login_name).first():
        raise HTTPException(status_code=409, detail="login_name already taken.")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=409, detail="Email already registered.")

    user = User(
        login_name=data.login_name,
        user_name=data.user_name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    db.flush()
    log_action(db, "user", user.user_id, "create", actor_id)
    db.commit()
    db.refresh(user)
    return user


def update_user_self(db: Session, user: User, data: UserUpdate) -> User:
    if data.user_name is not None:
        user.user_name = data.user_name
    if data.email is not None:
        existing = db.query(User).filter(User.email == data.email, User.user_id != user.user_id).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered.")
        user.email = data.email
        user.email_verified = False
    db.commit()
    db.refresh(user)
    return user


def update_user_admin(db: Session, user: User, data: UserAdminUpdate, actor: User) -> User:
    # Prevent the last admin from losing admin role
    if data.role == "normal" and user.role == "admin":
        admin_count = db.query(func.count(User.user_id)).filter(User.role == "admin", User.is_active == True).scalar()
        if admin_count <= 1:
            raise HTTPException(status_code=409, detail="Cannot remove the last admin role.")

    before = {"role": user.role, "is_active": user.is_active, "login_name": user.login_name}
    if data.user_name is not None:
        user.user_name = data.user_name
    if data.email is not None:
        existing = db.query(User).filter(User.email == data.email, User.user_id != user.user_id).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered.")
        user.email = data.email
        user.email_verified = False
    if data.login_name is not None:
        existing = db.query(User).filter(User.login_name == data.login_name, User.user_id != user.user_id).first()
        if existing:
            raise HTTPException(status_code=409, detail="login_name already taken.")
        user.login_name = data.login_name
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active

    after = {"role": user.role, "is_active": user.is_active, "login_name": user.login_name}
    log_action(db, "user", user.user_id, "update", actor.user_id, {"before": before, "after": after})
    db.commit()
    db.refresh(user)
    return user


def soft_delete_user(db: Session, user: User, actor_id: int) -> None:
    if db.query(User).filter(User.user_id == user.user_id).join(User.prescriptions).count():
        # just warn; soft-delete is still allowed
        pass
    user.is_active = False
    user.email = f"deleted_{user.user_id}@deleted.invalid"
    user.user_name = f"deleted_{user.user_id}"
    log_action(db, "user", user.user_id, "soft_delete", actor_id)
    db.commit()


def hard_delete_user(db: Session, user: User, actor_id: int) -> None:
    from app.models.prescription import Prescription
    has_prescriptions = db.query(Prescription).filter(Prescription.user_id == user.user_id).first()
    if has_prescriptions:
        raise HTTPException(
            status_code=409,
            detail="User has prescriptions. Delete them first or use soft-delete.",
        )
    log_action(db, "user", user.user_id, "delete", actor_id)
    db.delete(user)
    db.commit()
