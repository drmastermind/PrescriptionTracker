from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "PrescriptionTracker"
    APP_ENV: str = "dev"
    APP_PORT: int = 42069
    DEBUG: bool = False

    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "PrescriptionDatabase"
    DB_USER: str
    DB_PASSWORD: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    CORS_ALLOWED_ORIGINS: str = ""

    PASSWORD_MIN_LENGTH: int = 12
    LOGIN_FAILED_LOCKOUT_THRESHOLD: int = 5
    LOGIN_FAILED_LOCKOUT_MINUTES: int = 15
    LOGIN_RATE_LIMIT_PER_MINUTE: int = 10

    ADMIN_BOOTSTRAP_LOGIN: str | None = None
    ADMIN_BOOTSTRAP_EMAIL: str | None = None
    ADMIN_BOOTSTRAP_PASSWORD: str | None = None

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
        )

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()
