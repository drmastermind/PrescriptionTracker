import pytest


@pytest.fixture
def prescription(client, admin_token, normal_user, medication, db):
    db.commit()
    resp = client.post(
        "/api/v1/prescriptions",
        json={
            "user_id": normal_user.user_id,
            "medication_id": medication.medication_id,
            "dosage": "10mg",
            "frequency": "daily",
            "doctor": "Dr. Smith",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    return resp.json()


def test_create_prescription(prescription):
    assert prescription["dosage"] == "10mg"
    assert prescription["medication"]["medication_name"] == "Testacillin"
    assert prescription["is_active"] is True


def test_create_prescription_wrong_user_forbidden(client, user_token, admin_user, medication, db):
    db.commit()
    resp = client.post(
        "/api/v1/prescriptions",
        json={"user_id": admin_user.user_id, "medication_id": medication.medication_id},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403


def test_get_own_prescription(client, user_token, prescription):
    resp = client.get(
        f"/api/v1/prescriptions/{prescription['prescription_id']}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200


def test_get_other_user_prescription_forbidden(client, user_token, admin_user, medication, db):
    db.commit()
    # admin creates a prescription for themselves
    admin_rx = client.post(
        "/api/v1/prescriptions",
        json={"user_id": admin_user.user_id, "medication_id": medication.medication_id},
        headers={"Authorization": f"Bearer {client.post('/api/v1/auth/login', json={'login_name': 'test_admin', 'password': 'AdminPass123!'}).json()['access_token']}"},
    )
    rx_id = admin_rx.json()["prescription_id"]
    # normal user cannot see admin's prescription
    resp = client.get(f"/api/v1/prescriptions/{rx_id}", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 403


def test_list_prescriptions_normal_user_sees_own(client, user_token, normal_user, prescription, db):
    resp = client.get("/api/v1/prescriptions", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    for rx in resp.json()["items"]:
        assert rx["user_id"] == normal_user.user_id


def test_list_prescriptions_filter_active(client, admin_token, prescription, db):
    resp = client.get("/api/v1/prescriptions?active=true", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    for rx in resp.json()["items"]:
        assert rx["is_active"] is True


def test_update_prescription(client, user_token, prescription):
    resp = client.patch(
        f"/api/v1/prescriptions/{prescription['prescription_id']}",
        json={"dosage": "20mg", "refills_remaining": 3},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["dosage"] == "20mg"
    assert resp.json()["refills_remaining"] == 3


def test_soft_delete_prescription(client, user_token, prescription):
    resp = client.delete(
        f"/api/v1/prescriptions/{prescription['prescription_id']}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 204

    # Still retrievable but inactive
    get = client.get(
        f"/api/v1/prescriptions/{prescription['prescription_id']}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert get.status_code == 200
    assert get.json()["is_active"] is False


def test_hard_delete_requires_admin(client, user_token, prescription):
    resp = client.delete(
        f"/api/v1/prescriptions/{prescription['prescription_id']}?hard=true",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403


def test_hard_delete_admin(client, admin_token, prescription):
    resp = client.delete(
        f"/api/v1/prescriptions/{prescription['prescription_id']}?hard=true",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 204

    get = client.get(
        f"/api/v1/prescriptions/{prescription['prescription_id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert get.status_code == 404


def test_audit_log_written(client, admin_token, normal_user, medication, db):
    db.commit()
    resp = client.post(
        "/api/v1/prescriptions",
        json={"user_id": normal_user.user_id, "medication_id": medication.medication_id, "dosage": "5mg"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    rx_id = resp.json()["prescription_id"]
    from app.models.audit_log import AuditLog
    entry = db.query(AuditLog).filter(AuditLog.entity_type == "prescription", AuditLog.entity_id == rx_id).first()
    assert entry is not None
    assert entry.action == "create"


def test_user_prescriptions_endpoint(client, admin_token, normal_user, prescription, db):
    resp = client.get(
        f"/api/v1/users/{normal_user.user_id}/prescriptions",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    for rx in resp.json()["items"]:
        assert rx["user_id"] == normal_user.user_id
