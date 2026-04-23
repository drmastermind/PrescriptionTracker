def test_list_medications(client, user_token, medication, db):
    db.commit()
    # Use name search to find the test medication without relying on pagination position
    resp = client.get("/api/v1/medications?q=Testacillin", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert any(m["medication_name"] == "Testacillin" for m in data["items"])


def test_list_medications_prefix_search(client, user_token, medication, db):
    db.commit()
    resp = client.get("/api/v1/medications?q=Test", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    assert all("Test" in m["medication_name"] for m in resp.json()["items"])


def test_get_medication(client, user_token, medication, db):
    db.commit()
    resp = client.get(f"/api/v1/medications/{medication.medication_id}", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    assert resp.json()["medication_name"] == "Testacillin"


def test_get_medication_not_found(client, user_token):
    resp = client.get("/api/v1/medications/999999", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "NOT_FOUND"


def test_create_medication_admin(client, admin_token):
    resp = client.post(
        "/api/v1/medications",
        json={"medication_name": "Brandnewcillin", "generic_name": "generic", "strength": "100mg"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["medication_name"] == "Brandnewcillin"
    assert data["strength"] == "100mg"


def test_create_medication_normal_forbidden(client, user_token):
    resp = client.post(
        "/api/v1/medications",
        json={"medication_name": "NotAllowed"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403


def test_create_medication_duplicate(client, admin_token, medication, db):
    db.commit()
    resp = client.post(
        "/api/v1/medications",
        json={"medication_name": "Testacillin"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 409


def test_update_medication(client, admin_token, medication, db):
    db.commit()
    resp = client.patch(
        f"/api/v1/medications/{medication.medication_id}",
        json={"strength": "250mg", "form": "tablet"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["strength"] == "250mg"
    assert data["form"] == "tablet"


def test_medications_sorted_alphabetically(client, user_token, db):
    from app.models.medication import Medication
    # Use names that won't collide with existing production data
    unique_names = ["ZZZtest_Citronella", "ZZZtest_Amaranth", "ZZZtest_Mango"]
    for name in unique_names:
        db.add(Medication(medication_name=name))
    db.commit()
    resp = client.get("/api/v1/medications?q=ZZZtest_&size=100", headers={"Authorization": f"Bearer {user_token}"})
    names = [m["medication_name"] for m in resp.json()["items"]]
    assert names == sorted(names)
