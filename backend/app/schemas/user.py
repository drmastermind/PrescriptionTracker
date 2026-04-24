from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator

from app.core.config import settings


class UserCreate(BaseModel):
    login_name: str
    user_name: str
    email: EmailStr
    password: str
    role: str = "normal"

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < settings.PASSWORD_MIN_LENGTH:
            raise ValueError(f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters.")
        return v

    @field_validator("role")
    @classmethod
    def valid_role(cls, v: str) -> str:
        if v not in ("admin", "normal"):
            raise ValueError("Role must be 'admin' or 'normal'.")
        return v


class UserUpdate(BaseModel):
    user_name: str | None = None
    email: EmailStr | None = None


class UserAdminUpdate(BaseModel):
    user_name: str | None = None
    email: EmailStr | None = None
    login_name: str | None = None
    role: str | None = None
    is_active: bool | None = None

    @field_validator("role")
    @classmethod
    def valid_role(cls, v: str | None) -> str | None:
        if v is not None and v not in ("admin", "normal"):
            raise ValueError("Role must be 'admin' or 'normal'.")
        return v


class UserRead(BaseModel):
    model_config = {"from_attributes": True}

    user_id: int
    user_name: str
    login_name: str
    email: str
    email_verified: bool
    role: str
    is_active: bool
    api_key_prefix: str | None = None
    created_at: datetime
    updated_at: datetime


class UserLookup(BaseModel):
    model_config = {"from_attributes": True}

    user_id: int
    user_name: str
    login_name: str
