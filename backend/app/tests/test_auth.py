def test_register(client):
    resp = client.post("/api/v1/auth/register", json={
        "login_name": "newuser",
        "user_name": "New User",
        "email": "new@example.com",
        "password": "SecurePass123!",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["login_name"] == "newuser"
    assert "password_hash" not in data


def test_register_duplicate_login(client, normal_user, db):
    db.commit()
    resp = client.post("/api/v1/auth/register", json={
        "login_name": "test_user",
        "user_name": "Dup",
        "email": "dup@example.com",
        "password": "SecurePass123!",
    })
    assert resp.status_code == 409


def test_register_short_password(client):
    resp = client.post("/api/v1/auth/register", json={
        "login_name": "shortpw",
        "user_name": "Short",
        "email": "short@example.com",
        "password": "short",
    })
    assert resp.status_code == 422


def test_login_success(client, normal_user, db):
    db.commit()
    resp = client.post("/api/v1/auth/login", json={"login_name": "test_user", "password": "UserPass123!"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client, normal_user, db):
    db.commit()
    resp = client.post("/api/v1/auth/login", json={"login_name": "test_user", "password": "wrongpass"})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHORIZED"


def test_login_unknown_user(client):
    resp = client.post("/api/v1/auth/login", json={"login_name": "nobody", "password": "whatever123!"})
    assert resp.status_code == 401


def test_me(client, user_token):
    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    assert resp.json()["login_name"] == "test_user"


def test_me_no_token(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_refresh_and_logout(client, normal_user, db):
    db.commit()
    login = client.post("/api/v1/auth/login", json={"login_name": "test_user", "password": "UserPass123!"})
    refresh_token = login.json()["refresh_token"]

    refresh = client.post("/api/v1/auth/refresh", headers={"X-Refresh-Token": refresh_token})
    assert refresh.status_code == 200
    new_token = refresh.json()["refresh_token"]

    # Old token should be revoked
    retry = client.post("/api/v1/auth/refresh", headers={"X-Refresh-Token": refresh_token})
    assert retry.status_code == 401

    logout = client.post("/api/v1/auth/logout", headers={"X-Refresh-Token": new_token})
    assert logout.status_code == 204

    # After logout new token should be revoked
    after_logout = client.post("/api/v1/auth/refresh", headers={"X-Refresh-Token": new_token})
    assert after_logout.status_code == 401


def test_change_password(client, normal_user, db):
    db.commit()
    login = client.post("/api/v1/auth/login", json={"login_name": "test_user", "password": "UserPass123!"})
    token = login.json()["access_token"]

    resp = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "UserPass123!", "new_password": "NewPass456789!"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 204

    # Old password no longer works
    bad = client.post("/api/v1/auth/login", json={"login_name": "test_user", "password": "UserPass123!"})
    assert bad.status_code == 401


def test_account_lockout(client, normal_user, db):
    db.commit()
    for _ in range(5):
        client.post("/api/v1/auth/login", json={"login_name": "test_user", "password": "wrong!"})
    resp = client.post("/api/v1/auth/login", json={"login_name": "test_user", "password": "UserPass123!"})
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "ACCOUNT_LOCKED"
