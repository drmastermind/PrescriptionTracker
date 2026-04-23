def test_list_users_admin(client, admin_token, normal_user, db):
    db.commit()
    resp = client.get("/api/v1/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data


def test_list_users_normal_forbidden(client, user_token):
    resp = client.get("/api/v1/users", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 403


def test_get_own_user(client, user_token, normal_user, db):
    db.commit()
    resp = client.get(f"/api/v1/users/{normal_user.user_id}", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    assert resp.json()["login_name"] == "test_user"


def test_get_other_user_forbidden(client, user_token, admin_user, db):
    db.commit()
    resp = client.get(f"/api/v1/users/{admin_user.user_id}", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 403


def test_create_user_admin(client, admin_token):
    resp = client.post(
        "/api/v1/users",
        json={"login_name": "created", "user_name": "Created", "email": "created@example.com", "password": "Pass1234567!"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    assert resp.json()["login_name"] == "created"


def test_create_user_normal_forbidden(client, user_token):
    resp = client.post(
        "/api/v1/users",
        json={"login_name": "x", "user_name": "X", "email": "x@example.com", "password": "Pass1234567!"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403


def test_update_own_name(client, user_token, normal_user, db):
    db.commit()
    resp = client.patch(
        f"/api/v1/users/{normal_user.user_id}",
        json={"user_name": "Updated Name"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["user_name"] == "Updated Name"


def test_update_own_role_forbidden(client, user_token, normal_user, db):
    db.commit()
    resp = client.patch(
        f"/api/v1/users/{normal_user.user_id}",
        json={"role": "admin"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403


def test_soft_delete_user(client, admin_token, normal_user, db):
    db.commit()
    resp = client.delete(
        f"/api/v1/users/{normal_user.user_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 204
    db.expire_all()
    db.refresh(normal_user)
    assert normal_user.is_active is False


def test_user_sorted_alphabetically(client, admin_token, db):
    from app.core.security import hash_password
    from app.models.user import User
    for name in ["Charlie", "Alice", "Bob"]:
        db.add(User(login_name=name.lower() + "s", user_name=name, email=f"{name}@s.local", password_hash=hash_password("Pass1234567!"), role="normal"))
    db.commit()
    resp = client.get("/api/v1/users?size=100", headers={"Authorization": f"Bearer {admin_token}"})
    names = [u["user_name"] for u in resp.json()["items"] if u["user_name"] in ("Alice", "Bob", "Charlie")]
    assert names == sorted(names)
