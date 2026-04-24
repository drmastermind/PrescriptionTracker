import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.errors import http_exception_handler, validation_exception_handler
from app.api.v1.endpoints import auth, users, medications, prescriptions, lookups, ops, api_keys


def _bootstrap_admin() -> None:
    cfg = settings
    if not all([cfg.ADMIN_BOOTSTRAP_LOGIN, cfg.ADMIN_BOOTSTRAP_EMAIL, cfg.ADMIN_BOOTSTRAP_PASSWORD]):
        return
    from app.db.session import SessionLocal
    from app.models.user import User
    from app.core.security import hash_password
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.role == "admin").first():
            admin = User(
                login_name=cfg.ADMIN_BOOTSTRAP_LOGIN,
                user_name=cfg.ADMIN_BOOTSTRAP_LOGIN,
                email=cfg.ADMIN_BOOTSTRAP_EMAIL,
                password_hash=hash_password(cfg.ADMIN_BOOTSTRAP_PASSWORD),
                role="admin",
            )
            db.add(admin)
            db.commit()
            print(f"Bootstrap admin created: {cfg.ADMIN_BOOTSTRAP_LOGIN}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _bootstrap_admin()
    yield


app = FastAPI(
    lifespan=lifespan,
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

app.include_router(ops.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(medications.router)
app.include_router(prescriptions.router)
app.include_router(lookups.router)
app.include_router(api_keys.router)

_static = Path(__file__).parent.parent / "static"
app.mount("/static", StaticFiles(directory=str(_static)), name="static")


@app.get("/", include_in_schema=False)
@app.get("/ui", include_in_schema=False)
def serve_ui():
    return FileResponse(str(_static / "index.html"))
