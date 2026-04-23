def test_healthz(client):
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_readyz(client):
    resp = client.get("/readyz")
    assert resp.status_code == 200
    assert resp.json()["db"] == "ok"


def test_version(client):
    resp = client.get("/api/v1/version")
    assert resp.status_code == 200
    assert "version" in resp.json()


def test_request_id_header(client):
    resp = client.get("/healthz")
    assert "x-request-id" in resp.headers


def test_error_envelope_404(client, user_token):
    resp = client.get("/api/v1/medications/999999", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 404
    body = resp.json()
    assert "error" in body
    assert "code" in body["error"]
    assert "message" in body["error"]


def test_error_envelope_validation(client):
    resp = client.post("/api/v1/auth/register", json={"login_name": "x"})
    assert resp.status_code == 422
    body = resp.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "details" in body["error"]
