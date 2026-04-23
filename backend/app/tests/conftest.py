import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

import app.models  # register all models
from app.core.config import settings
from app.db.session import get_db
from app.main import app

# Use the same DB but roll back every test via nested transactions (savepoints)
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
)


@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db):
    from app.core.security import hash_password
    from app.models.user import User
    user = User(
        login_name="test_admin",
        user_name="Test Admin",
        email="admin@example.com",
        password_hash=hash_password("AdminPass123!"),
        role="admin",
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def normal_user(db):
    from app.core.security import hash_password
    from app.models.user import User
    user = User(
        login_name="test_user",
        user_name="Test User",
        email="user@example.com",
        password_hash=hash_password("UserPass123!"),
        role="normal",
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def admin_token(client, admin_user, db):
    db.commit()
    resp = client.post("/api/v1/auth/login", json={"login_name": "test_admin", "password": "AdminPass123!"})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture
def user_token(client, normal_user, db):
    db.commit()
    resp = client.post("/api/v1/auth/login", json={"login_name": "test_user", "password": "UserPass123!"})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture
def medication(db):
    from app.models.medication import Medication
    med = Medication(medication_name="Testacillin", generic_name="testacillin")
    db.add(med)
    db.flush()
    return med
