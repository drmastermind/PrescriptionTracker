# PLAN.md — Prescription Manager

## Project: Prescription Manager

This file is the build guide and operating contract for coding agents working on this project.

The current priority is the **backend**. Future phases add a React frontend, API key support for integrations, and an Android client.

Agents must follow the requirements in this document and avoid making unapproved architectural changes.

---

## 1) Product summary

Build a prescription management system backed by **Python + FastAPI + MariaDB/MySQL**.

The system must support:
- User management
- Medication management
- Prescription management
- Authentication with username/password login and JWTs
- Admin and normal-user roles
- Later support for per-user API keys
- Later support for a React frontend and Android app

The backend must be written to support both:
- a browser-based frontend
- a future Android/mobile client using the same API

### Compliance posture

This application is intended as a **personal / family prescription tracker**. It is **not** a HIPAA-covered, PHI-bearing clinical system. It does not provide clinical advice, does not integrate with e-prescribing networks, and must not be marketed as a compliant health record.

Implications:
- Reasonable security (hashed passwords, JWT auth, audit logging) is required.
- Enterprise-grade PHI controls (BAA with hosting, encryption at rest with customer-managed keys, mandatory audit export, etc.) are **out of scope** unless this posture changes.
- If the posture changes, the plan must be revisited before shipping to real patients.

---

## 2) Confirmed decisions

These decisions are already approved and should be treated as requirements:

- **Backend framework:** FastAPI
- **Language:** Python (managed with `uv`)
- **Database:** MariaDB/MySQL, `utf8mb4` / `utf8mb4_unicode_ci`
- **Database access:** SQLAlchemy ORM (2.x typed style)
- **Migrations:** Alembic
- **Validation/serialization:** Pydantic v2
- **Password hashing:** Argon2id (via `argon2-cffi` through `passlib`)
- **Authentication model:** username/password login, JWT access tokens + opaque refresh tokens
- **Authorization model:** `admin` and `normal` users
- **Frontend direction (future phase):** React frontend calling the FastAPI backend
- **API keys (future phase):** API keys are for integration/programmatic access, not the primary auth method for browser/mobile clients
- **Timezone policy:** all timestamps stored and returned as UTC, serialized as ISO-8601 (`2026-04-22T14:30:00Z`)
- **Python tooling:** `uv` is mandatory. Use `uv run <cmd>` and `uv add <pkg>`; never `python3` / `pip` directly.

---

## 3) Existing database provided by product owner

Initial schema supplied by the product owner (starting point only — see §4 for the adjustments that the first migration must apply):

### Database
- `PrescriptionDatabase`

### Table: `users`
- `UserID` INT(11) PK
- `UserName` VARCHAR(50)
- `LoginName` VARCHAR(50)
- `PASSWORD` VARCHAR(50)
- `API_KEY` VARCHAR(50)

### Table: `Medications`
- `MedID` INT(11) PK
- `Name` VARCHAR(50)

### Table: `Prescriptions`
- `PrescriptionID` INT(11) PK
- `UserID` INT(11) FK
- `MedID` INT(11) FK
- `Dosage` VARCHAR(50)
- `Frequency` VARCHAR(50)
- `Doctor` VARCHAR(50)
- `Active` BOOLEAN

### Existing-data policy

The existing `PASSWORD` column stores 50-character plaintext values and **cannot** be converted into a secure hash. The first migration must:
- treat the existing database as empty for authentication purposes,
- null out all `password_hash` values and require every user to reset via the admin reset flow (§7) before login, **or**
- drop the current rows if the database is confirmed empty (ask the product owner in writing before choosing this path).

---

## 4) Required schema adjustments

The supplied schema is the starting point, but the backend must apply the following changes via Alembic migrations **before** any endpoint ships.

### 4.1 Naming convention

- Rename all tables and columns to `snake_case` in the initial migration.
- Python ORM attributes match column names exactly (no separate mapping layer).
- Target table names: `users`, `medications`, `prescriptions`, `refresh_tokens`, `audit_log`.
- All table/column names are lowercase `snake_case`. `lower_case_table_names` is **not** changed at the server level (leave at OS default); consistency is achieved solely through naming discipline.

### 4.2 Charset and collation

- Database, tables, and text columns must use `utf8mb4` with collation `utf8mb4_unicode_ci` (MariaDB) or `utf8mb4_0900_ai_ci` (MySQL 8).
- `DATETIME` columns store UTC; `TIMESTAMP` is not used to avoid implicit local-time conversion.

### 4.3 `users` table (post-migration)

| Column            | Type                | Notes                                              |
|-------------------|---------------------|----------------------------------------------------|
| `user_id`         | INT AUTO_INCREMENT  | PK                                                 |
| `user_name`       | VARCHAR(100)        | Display name. Not unique.                          |
| `login_name`      | VARCHAR(50)         | **UNIQUE**, login identifier                       |
| `email`           | VARCHAR(255)        | **UNIQUE**, required                               |
| `email_verified`  | BOOLEAN             | DEFAULT FALSE                                      |
| `password_hash`   | VARCHAR(255)        | Argon2id encoded string                            |
| `role`            | VARCHAR(20)         | NOT NULL DEFAULT `'normal'`. Values: `admin`, `normal` |
| `is_active`       | BOOLEAN             | NOT NULL DEFAULT TRUE. FALSE = soft-deleted / disabled |
| `failed_login_count` | INT              | NOT NULL DEFAULT 0                                 |
| `locked_until`    | DATETIME NULL       | Account lockout expiry (UTC)                       |
| `api_key_hash`    | VARCHAR(255) NULL   | Phase 4 only; never plaintext                      |
| `api_key_prefix`  | VARCHAR(12) NULL    | Phase 4 only; display only                         |
| `created_at`      | DATETIME            | NOT NULL (UTC)                                     |
| `updated_at`      | DATETIME            | NOT NULL (UTC)                                     |

### 4.4 `medications` table (post-migration)

| Column            | Type                | Notes                                    |
|-------------------|---------------------|------------------------------------------|
| `medication_id`   | INT AUTO_INCREMENT  | PK                                       |
| `medication_name` | VARCHAR(200)        | **UNIQUE**                               |
| `generic_name`    | VARCHAR(200) NULL   |                                          |
| `strength`        | VARCHAR(50) NULL    | e.g., "500 mg"                           |
| `form`            | VARCHAR(50) NULL    | tablet / capsule / liquid / patch / etc. |
| `brand_name`      | VARCHAR(200) NULL   |                                          |
| `created_at`      | DATETIME            | NOT NULL (UTC)                           |
| `updated_at`      | DATETIME            | NOT NULL (UTC)                           |

### 4.5 `prescriptions` table (post-migration)

| Column                | Type                | Notes                                         |
|-----------------------|---------------------|-----------------------------------------------|
| `prescription_id`     | INT AUTO_INCREMENT  | PK                                            |
| `user_id`             | INT                 | FK → `users.user_id`, **ON DELETE RESTRICT**  |
| `medication_id`       | INT                 | FK → `medications.medication_id`, **ON DELETE RESTRICT** |
| `dosage`              | VARCHAR(100)        |                                               |
| `frequency`           | VARCHAR(100)        |                                               |
| `doctor`              | VARCHAR(100)        |                                               |
| `is_active`           | BOOLEAN             | NOT NULL DEFAULT TRUE. FALSE = soft-deleted/discontinued |
| `prescribed_date`     | DATE NULL           | When the prescription was written             |
| `start_date`          | DATE NULL           | Earliest fill date                            |
| `end_date`            | DATE NULL           | Latest valid date                             |
| `quantity`            | INT NULL            | Units dispensed per fill                      |
| `refills_remaining`   | INT NULL            |                                               |
| `route`               | VARCHAR(30) NULL    | oral / topical / injection / inhaled / etc.   |
| `reason`              | VARCHAR(200) NULL   | Indication                                    |
| `pharmacy`            | VARCHAR(200) NULL   | Free text (no pharmacies table in MVP)        |
| `notes`               | TEXT NULL           | Freeform notes ("take with food")             |
| `created_at`          | DATETIME            | NOT NULL (UTC)                                |
| `updated_at`          | DATETIME            | NOT NULL (UTC)                                |

Indexes: `(user_id)`, `(med_id)`, `(user_id, is_active)`.

### 4.6 `refresh_tokens` table (new)

Server-side storage for opaque refresh tokens (needed for logout and forced revocation).

| Column            | Type                | Notes                                    |
|-------------------|---------------------|------------------------------------------|
| `token_id`        | INT AUTO_INCREMENT  | PK                                       |
| `user_id`         | INT                 | FK → `users.user_id`, ON DELETE CASCADE  |
| `token_hash`      | VARCHAR(255)        | SHA-256 of the opaque token              |
| `issued_at`       | DATETIME            | UTC                                      |
| `expires_at`      | DATETIME            | UTC                                      |
| `revoked_at`      | DATETIME NULL       | UTC. Non-null = revoked                  |
| `replaced_by`     | INT NULL            | Self-FK; set on rotation                 |
| `user_agent`      | VARCHAR(255) NULL   | Debug only                               |
| `ip_address`      | VARCHAR(45) NULL    | Debug only                               |

### 4.7 `audit_log` table (new)

Prescription CRUD must write an audit row. Users CRUD should audit role changes and deletions at minimum.

| Column          | Type                | Notes                                      |
|-----------------|---------------------|--------------------------------------------|
| `audit_id`      | BIGINT AUTO_INCREMENT | PK                                       |
| `actor_user_id` | INT NULL            | FK → `users.user_id` (NULL for system)     |
| `entity_type`   | VARCHAR(40)         | e.g., `prescription`, `user`               |
| `entity_id`     | INT                 |                                            |
| `action`        | VARCHAR(20)         | `create` / `update` / `delete` / `soft_delete` / `role_change` |
| `changes`       | JSON NULL           | `{ "before": {...}, "after": {...} }`      |
| `ip_address`    | VARCHAR(45) NULL    |                                            |
| `created_at`    | DATETIME            | NOT NULL (UTC)                             |

### 4.8 FK cascade behavior — summary

| Relationship                          | On delete of parent |
|---------------------------------------|---------------------|
| `prescriptions.user_id` → `users`     | **RESTRICT**        |
| `prescriptions.medication_id` → `medications` | **RESTRICT**   |
| `refresh_tokens.user_id` → `users`    | CASCADE             |
| `audit_log.actor_user_id` → `users`   | SET NULL            |

A user cannot be hard-deleted while prescriptions exist. Admins must either delete the prescriptions first or use the **soft-delete / anonymize** flow (§7.6).

### 4.9 API key storage (Phase 4)

- Store **only** the Argon2id/SHA-256 hash of an API key (`api_key_hash`), never plaintext.
- Return the raw key exactly once, on creation or regeneration.
- Store a short prefix (`api_key_prefix`, ~8–12 chars) for display and debugging.
- Support revocation and regeneration.

---

## 5) Functional requirements by phase

### Phase 1 — Backend CRUD API

#### Users
- Create user (admin; self-register creates a `normal` user)
- Read user(s)
- Update editable user fields (see §6.3 for the allow-lists)
- Soft-delete user (`is_active=false`, anonymize PII) — admin-only
- Hard-delete user — admin-only, blocked if any prescriptions exist

#### Medications
- Create medication
- Read medication(s)
- Update medication fields
- **No delete endpoint** (intentional)

#### Prescriptions
- Create prescription
- Read prescription(s)
- Update editable prescription fields
- `DELETE /prescriptions/{id}` performs **soft-delete** (`is_active=false`). Default behavior for both admin and owner.
- Hard delete only via `?hard=true` and only for admins, used rarely (e.g., data-entry error).

#### Additional Phase 1 notes
- Expose explicit API endpoints for each supported action.
- Enforce foreign keys and RESTRICT behavior as defined in §4.8.
- Return structured JSON responses using the error envelope from §7.10.
- Validate request bodies and return proper HTTP status codes.
- Support filtering prescriptions by user, active/inactive, doctor, medication name.
- Paginate and sort list responses per §7.9.

### Phase 2 — React frontend

Future phase only, but the backend must support it cleanly.

Frontend requirements:
- Runs in a browser on Windows
- Usable on Android device browsers
- Dropdown to select a user
- Display all prescriptions for the selected user
- Add / remove prescriptions
- Prescription removal must update the database immediately (soft-delete per §5 Phase 1)
- Sort lists alphabetically
- Modern UI
- Dark and light mode; dark is default

Backend implications:
- Must support CORS configuration (explicit origin allow-list; never `*`)
- Must expose stable JSON endpoints
- Must provide efficient user and medication list endpoints
- Must provide a user-prescriptions endpoint designed for the UI

### Phase 3 — Login and user creation

Frontend will add:
- login form
- create-user flow

Backend provides:
- login endpoint
- refresh-token rotation (§9.2)
- current-user endpoint
- user registration endpoint
- role-aware access control
- password change, admin password reset (§7.1)

### Phase 4 — API keys

- browser/mobile clients use username/password + JWT
- API keys are for integration/programmatic access only
- See §4.9 for storage rules and §7.8 for endpoints

### Phase 5 — Android app with remote API

- call the remote API
- allow the user to set/change the backend API base URL
- versioned REST endpoints, stateless auth (Bearer header), documented base URL

---

## 6) Authorization rules

Use role-based access control.

### 6.1 Roles
- `admin`
- `normal`

### 6.2 Default rules

**Admin users can:**
- view, create, update, soft-delete, and hard-delete users (subject to §4.8)
- reset any user's password (issues a one-time temporary password)
- view, create, update all medications
- view, create, update, soft-delete, and hard-delete all prescriptions
- list prescriptions for any user
- generate, regenerate, and revoke API keys for any user (Phase 4)
- change any user's role

**Normal users can:**
- log in and refresh tokens
- view their own profile
- update their own `user_name` and `email` (email change re-sets `email_verified=false`)
- change their own password via the dedicated change-password flow
- view, create, update, and soft-delete their **own** prescriptions
- export their own data (§7.7)
- soft-delete / anonymize their own account (§7.7)

### 6.3 Field-level edit rules

| Field            | Normal user (self) | Admin (any user)                 |
|------------------|--------------------|----------------------------------|
| `user_name`      | yes                | yes                              |
| `email`          | yes (re-verifies)  | yes                              |
| `login_name`     | **no**             | yes                              |
| `role`           | **no**             | yes (admin cannot demote themselves if they are the last admin) |
| `password_hash`  | **never via PATCH**; change-password flow only | admin-reset flow only |
| `is_active`      | self-anonymize only | yes                             |
| `api_key_*`      | **no**             | yes                              |
| `failed_login_count`, `locked_until` | no    | yes (unlock only)                |

PATCH requests that include forbidden fields must return `403` (not silently drop them).

### 6.4 Authorization implementation

- All admin routes use a shared `require_admin` dependency.
- All "owner-or-admin" routes use a shared `require_owner_or_admin(user_id)` dependency.
- Role self-escalation must be prevented by explicit tests.

---

## 7) API design requirements

Use a versioned REST API under `/api/v1/...`.

### 7.1 Auth endpoints

- `POST /api/v1/auth/login` — username+password → `{ access_token, refresh_token, token_type, expires_in }`
- `POST /api/v1/auth/refresh` — refresh token → new access + rotated refresh
- `POST /api/v1/auth/logout` — revokes the presented refresh token
- `POST /api/v1/auth/register` — self-registers a `normal` user
- `GET  /api/v1/auth/me` — current user
- `POST /api/v1/auth/change-password` — self-service, requires current password; revokes all refresh tokens on success
- `POST /api/v1/auth/admin-reset-password` — admin-only; issues a one-time temporary password

(Forgot-password / email-reset flows are deferred until an email provider is integrated.)

### 7.2 Users
- `GET /api/v1/users`
- `GET /api/v1/users/{user_id}`
- `POST /api/v1/users` (admin)
- `PUT /api/v1/users/{user_id}` — full replacement of editable fields only
- `PATCH /api/v1/users/{user_id}` — partial update of editable fields only
- `DELETE /api/v1/users/{user_id}` — soft-delete/anonymize by default; `?hard=true` for admin hard delete (blocked if prescriptions exist)

### 7.3 Medications
- `GET /api/v1/medications`
- `GET /api/v1/medications/{med_id}`
- `POST /api/v1/medications`
- `PUT /api/v1/medications/{med_id}`
- `PATCH /api/v1/medications/{med_id}`

### 7.4 Prescriptions
- `GET /api/v1/prescriptions`
- `GET /api/v1/prescriptions/{prescription_id}`
- `POST /api/v1/prescriptions`
- `PUT /api/v1/prescriptions/{prescription_id}`
- `PATCH /api/v1/prescriptions/{prescription_id}`
- `DELETE /api/v1/prescriptions/{prescription_id}` — soft-delete (`is_active=false`); `?hard=true` admin-only

### 7.5 UI helper endpoints
- `GET /api/v1/users/{user_id}/prescriptions`
- `GET /api/v1/lookups/users`
- `GET /api/v1/lookups/medications`

### 7.6 Self-service / privacy
- `GET /api/v1/users/me/export` — JSON export of the caller's user record and prescriptions
- `DELETE /api/v1/users/me` — anonymizes the caller (clears `email`, rewrites `user_name` to `deleted_<id>`, sets `is_active=false`, revokes refresh tokens). Prescriptions are retained but become admin-managed.

### 7.7 Operational endpoints
- `GET /healthz` — liveness (no DB check)
- `GET /readyz` — readiness (pings DB)
- `GET /api/v1/version` — build/version string (for clients)

### 7.8 API key endpoints (Phase 4)
- `POST /api/v1/users/{user_id}/api-key` — generate/regenerate (returns raw key exactly once)
- `DELETE /api/v1/users/{user_id}/api-key` — revoke

### 7.9 List behavior

- **Pagination** (required for all list endpoints that can exceed 50 rows):
  - Query params: `?page=<int, default 1>&size=<int, default 20, max 100>`
  - Response envelope:
    ```json
    {
      "items": [ ... ],
      "total": 123,
      "page": 1,
      "size": 20,
      "pages": 7
    }
    ```
- **Default sorts**:
  - Users: `user_name ASC`, then `user_id ASC`
  - Medications: `name ASC`
  - Prescriptions: `medication.name ASC`, then `doctor ASC`, then `prescription_id ASC` (requires a join; document this as the canonical sort)
- **Common filters**: `?active=true|false`, `?user_id=...`, `?doctor=...`, `?q=<name-prefix>` on medications.

### 7.10 Error envelope

All 4xx / 5xx responses use a single canonical shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body failed validation.",
    "details": [
      { "field": "email", "issue": "must be a valid email" }
    ]
  }
}
```

- `code`: stable UPPER_SNAKE token (e.g., `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `VALIDATION_ERROR`, `ACCOUNT_LOCKED`).
- `message`: human-readable, safe for display (no stack traces, no SQL fragments).
- `details`: optional array; field-level for validation, free-form otherwise.

FastAPI's default 422 body must be replaced with this envelope via a global exception handler.

### 7.11 Response behavior
- Use standard HTTP status codes (see §14.2).
- Pagination is mandatory where specified above.
- CORS: explicit origin allow-list from `CORS_ALLOWED_ORIGINS`; credentials allowed only for browser origins.

### 7.12 Versioning / deprecation policy
- All endpoints live under `/api/v1/...`.
- A `v1` endpoint is not removed until a `v2` equivalent has been live for at least 2 releases.
- Breaking changes to `v1` shapes are forbidden once the frontend begins consuming them.

---

## 8) Data model guidance

Use SQLAlchemy ORM models and Pydantic schemas.

### 8.1 ORM models
- `User`, `Medication`, `Prescription`, `RefreshToken`, `AuditLogEntry`

### 8.2 Relationships
- A `User` has many `Prescription` rows (RESTRICT on delete).
- A `Medication` has many `Prescription` rows (RESTRICT on delete).
- A `Prescription` belongs to one `User` and one `Medication`.
- A `User` has many `RefreshToken` rows (CASCADE on delete).

### 8.3 Pydantic schemas (v2)

- Separate schemas for create, update, and response models.
- Response models must **never** include `password_hash`, `api_key_hash`, `failed_login_count`, or `locked_until` to normal users.
- Example set:
  - `UserCreate`, `UserUpdate`, `UserReadSelf`, `UserReadAdmin`, `UserLookup`
  - `MedicationCreate`, `MedicationUpdate`, `MedicationRead`
  - `PrescriptionCreate`, `PrescriptionUpdate`, `PrescriptionRead`
  - `LoginRequest`, `TokenResponse`, `ChangePasswordRequest`
  - `PaginatedResponse[T]` (generic)
  - `ErrorResponse`, `ErrorDetail`

### 8.4 Concurrency
- `updated_at` is compared on PATCH/PUT if the client supplies `If-Unmodified-Since` (optional). Not required for MVP but the schema supports it.

---

## 9) Security requirements

### 9.1 Passwords
- **Argon2id** via `passlib[argon2]` / `argon2-cffi`. bcrypt is not used.
- Never store or log plaintext passwords.
- Minimum password length: **12 characters**; reject passwords on the common-password shortlist (top ~1k).
- Never return password hashes in API responses.

### 9.2 Tokens
- **Access token**: signed JWT (HS256 or RS256), `exp` = 15 minutes.
  - Transport: `Authorization: Bearer <token>` header.
  - Contents: `sub` (user_id), `role`, `iat`, `exp`, `jti`.
- **Refresh token**: opaque 256-bit random value, server-stored as SHA-256 hash in `refresh_tokens`.
  - Lifetime: 30 days.
  - **Rotated on every use** (`/auth/refresh` issues a new refresh and revokes the old one by setting `revoked_at` + `replaced_by`).
  - Logout revokes the presented refresh token.
  - Password change and admin reset revoke **all** refresh tokens for the affected user.
- **Browser clients**: refresh token delivered as `HttpOnly; Secure; SameSite=Strict` cookie. Access token returned in the response body and held in memory by the SPA.
- **Mobile / integration clients**: both tokens returned in the response body.
- Secrets are read from environment variables only.

### 9.3 Account protection
- Failed-login counter increments on wrong password.
- After **5** consecutive failures, lock the account for 15 minutes (`locked_until`).
- Rate limit `/auth/login` and `/auth/refresh` per IP (e.g., 10/min) — implemented with `slowapi` or equivalent.
- On successful login, reset `failed_login_count` to 0 and clear `locked_until`.
- All auth-failure responses return `401` with error code `INVALID_CREDENTIALS` (do **not** distinguish "user not found" from "wrong password"). Locked accounts return `423`/`403` with `ACCOUNT_LOCKED`.

### 9.4 API keys (Phase 4)
- Generate cryptographically strong (`secrets.token_urlsafe(32)`) random keys.
- Store only `api_key_hash` (Argon2id or SHA-256).
- Support revocation and regeneration.
- Transmit via `X-API-Key` header.

### 9.5 Logging / PII hygiene
- **Never log**: passwords, password hashes, API keys, JWTs, refresh tokens, `Authorization` headers, `Cookie` headers, or the full request body for any `/auth/*` endpoint.
- Logs are structured JSON with fields: `timestamp` (UTC ISO-8601), `level`, `request_id`, `user_id` (if known), `method`, `path`, `status`, `duration_ms`.
- A request-ID middleware attaches `X-Request-ID` to every response (generate if absent on request).

### 9.6 General
- Validate all input via Pydantic.
- Use parameterized DB access (SQLAlchemy ORM only; no raw string SQL in handlers).
- Restrict normal users from admin-only routes via dependencies.
- Do not leak internal exception traces in production responses; production error handler returns the error envelope with a generic message and logs the trace server-side.
- CORS: explicit origin allow-list; `allow_credentials=True` only when cookie-based refresh is in use.

---

## 10) Backend project structure

```text
backend/
  app/
    api/
      v1/
        endpoints/
          auth.py
          users.py
          medications.py
          prescriptions.py
          lookups.py
          ops.py          # /healthz, /readyz, /version
    core/
      config.py
      security.py         # password hashing, JWT encode/decode
      tokens.py           # refresh-token issue / rotate / revoke
      errors.py           # error envelope + global exception handlers
      logging.py          # JSON logger + request-ID middleware
      deps.py             # DB session, current_user, require_admin
    models/
      user.py
      medication.py
      prescription.py
      refresh_token.py
      audit_log.py
    schemas/
      auth.py
      user.py
      medication.py
      prescription.py
      common.py           # PaginatedResponse, ErrorResponse
    services/
      auth_service.py
      user_service.py
      medication_service.py
      prescription_service.py
      api_key_service.py
      audit_service.py
    scripts/
      create_admin.py     # CLI for bootstrap (§11)
      seed_dev.py         # dev-only sample data
    db/
      base.py
      session.py
    tests/
    main.py
  alembic/
  alembic.ini
  Dockerfile
  docker-compose.yml      # app + mariadb for local dev
  pyproject.toml          # uv-managed
  uv.lock
  .env.example
```

Agents may adjust folder names, but modularity, the services layer, and the scripts directory are required.

---

## 11) Recommended implementation sequence

### Step 1 — Scaffold backend
- `uv init`; add FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2, passlib[argon2], python-jose, slowapi, structlog (or equivalent).
- Config management (Pydantic Settings) reading from `.env`.
- DB connection/session handling.
- SQLAlchemy declarative base + empty models.
- Alembic initialized; `alembic.ini` points at the configured DB URL.

### Step 2 — Migrations
- Initial migration creates all tables in §4 with the final `snake_case` names, charset, collation, FK cascade rules, and indexes.
- Data migration notes existing-data policy (§3).

### Step 3 — Bootstrap admin
- Implement `app/scripts/create_admin.py` (CLI): prompts for (or accepts args) `--login`, `--email`, `--password`, creates an `admin` user if none exists.
- On application startup, if no admin exists **and** `ADMIN_BOOTSTRAP_LOGIN` + `ADMIN_BOOTSTRAP_PASSWORD` + `ADMIN_BOOTSTRAP_EMAIL` are set, seed one admin and log a warning. This is the supported path for fresh Docker deploys.

### Step 4 — Authentication and authorization
- Argon2id password hashing utilities.
- JWT access-token creation/validation.
- Refresh-token issue / rotate / revoke service.
- `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/register`, `/auth/me`, `/auth/change-password`, `/auth/admin-reset-password`.
- `current_user` and `require_admin` dependencies.
- Failed-login tracking, lockout, rate limiting.

### Step 5 — CRUD endpoints
- Medications (no delete).
- Users (soft-delete + admin hard-delete guarded by FK).
- Prescriptions (soft-delete default, admin hard-delete via `?hard=true`).
- Filtering (`?user_id`, `?active`, `?doctor`, `?q` on medications).
- Sorted, paginated list responses per §7.9.

### Step 6 — Cross-cutting
- Error-envelope exception handlers.
- Request-ID middleware + structured JSON logging.
- `/healthz`, `/readyz`, `/api/v1/version`.
- Audit-log writes on prescription CRUD and user role / delete changes.
- Self-service `GET /users/me/export` and `DELETE /users/me`.

### Step 7 — Tests
- Auth, authorization, CRUD, validation, FK error paths, sort/pagination correctness, audit-log writes, soft-delete semantics, refresh-token rotation, lockout behavior.

### Step 8 — Documentation and dev experience
- README with setup, env, migrations, `uv run` commands, docker-compose flow.
- `.env.example`.
- OpenAPI `/docs` must show `OAuth2PasswordBearer` so "Authorize" works end-to-end.

### Step 9 — Future-ready work
- CORS allow-list wired up.
- API key service scaffolding (Phase 4).
- Lookup endpoints finalized for the React UI.

---

## 12) Testing requirements

Use automated tests.

Minimum expectation:
- Unit tests for auth/security helpers (hashing, JWT, refresh rotation, lockout).
- API tests for every endpoint: at least one success-path and one failure/authorization-path.
- Authorization tests for admin vs normal access.
- Field-level edit tests confirming role/login_name/password_hash cannot be PATCH'd by normal users, and role self-escalation is rejected.
- Tests for validation failures and FK RESTRICT errors.
- Tests confirming sorted + paginated list responses.
- Tests confirming the error envelope shape for every error class.
- Tests confirming audit-log rows are written on prescription CRUD.
- Tests confirming refresh-token rotation revokes the previous token.

### 12.1 Test stack
- `pytest`, `pytest-asyncio`, `httpx` (async client), `factory-boy` (or plain fixtures) for data.

### 12.2 Test isolation
- Dedicated test database (e.g., `PrescriptionDatabase_test`), never the dev DB.
- **Transaction-per-test** rollback pattern (open a connection + transaction in a fixture; roll back after each test).
- No schema drop/recreate per test — too slow.
- Alembic `upgrade head` runs once per test session against the test DB.

### 12.3 Migration discipline
- Never edit a merged migration; add a new one.
- CI runs `alembic upgrade head` then `alembic downgrade -1` then `alembic upgrade head` on every PR to catch un-reversible migrations.

---

## 13) Environment and configuration

All secrets/config must come from environment variables.

### 13.1 Required
- `APP_NAME`
- `APP_ENV` (`dev` / `staging` / `prod`)
- `DEBUG`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (existing MYSQL_USER / MYSQL_PASSWORD may be read as fallbacks for dev)
- `JWT_SECRET_KEY`
- `JWT_ALGORITHM`
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (default 15)
- `JWT_REFRESH_TOKEN_EXPIRE_DAYS` (default 30)
- `CORS_ALLOWED_ORIGINS` (comma-separated)
- `PASSWORD_MIN_LENGTH` (default 12)
- `LOGIN_FAILED_LOCKOUT_THRESHOLD` (default 5)
- `LOGIN_FAILED_LOCKOUT_MINUTES` (default 15)
- `LOGIN_RATE_LIMIT_PER_MINUTE` (default 10)

### 13.2 Optional / future
- `ADMIN_BOOTSTRAP_LOGIN`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` (one-time seed)
- `API_KEY_LENGTH`, `API_KEY_HEADER_NAME` (default `X-API-Key`)
- `ANDROID_ALLOWED_ORIGINS`

### 13.3 `.env` handling
- Provide `.env.example` with placeholder values.
- `.env` is git-ignored and never committed.
- Secrets are not read from anywhere other than env vars.

---

## 14) Coding standards

Agents must produce code that is readable, modular, typed (PEP 604 unions, `TYPE_CHECKING` where needed), and easy to test.

### 14.1 Required practices
- Descriptive names; short modules and functions.
- Keep routers thin; business logic in services.
- DB access organized in services or explicit query modules.
- Avoid copy/paste logic between endpoints.
- Dependency injection for DB session, current user, and role checks.
- Use Alembic for schema changes; never edit a live DB by hand.
- No raw SQL strings in handlers. Parameterized ORM queries only.
- No plaintext passwords or API keys anywhere (code, logs, tests, fixtures).
- File headers follow the project coding-standards header template where applicable.
- No emojis in code, logs, or comments.

### 14.2 HTTP status codes
- `200 OK` / `201 Created` / `204 No Content` — success.
- `400 Bad Request` — malformed request.
- `401 Unauthorized` — missing/invalid credentials (code `INVALID_CREDENTIALS` on login).
- `403 Forbidden` — authenticated but not permitted (including forbidden PATCH fields).
- `404 Not Found` — missing resource.
- `409 Conflict` — uniqueness violation (e.g., duplicate `login_name` / `email`).
- `422 Unprocessable Entity` — validation failure (Pydantic).
- `423 Locked` — account lockout (or `403` with `ACCOUNT_LOCKED` if `423` is undesirable).
- `429 Too Many Requests` — rate-limit hit.
- `500 Internal Server Error` — unexpected failure; message is generic, details are server-side logs.

### 14.3 Error handling
All non-2xx responses conform to the envelope in §7.10.

---

## 15) OpenAPI and developer experience

- Ensure request/response models are accurate and reference the canonical Pydantic schemas.
- Add endpoint summaries and descriptions.
- Tag organization: `auth`, `users`, `medications`, `prescriptions`, `lookups`, `ops`.
- Wire up `OAuth2PasswordBearer` so the `/docs` "Authorize" button works end-to-end.
- Document the error envelope as a shared component in the OpenAPI schema.

---

## 16) Performance and query behavior

- Avoid N+1 issues (use `selectinload` / `joinedload` for prescription → medication / user).
- Index foreign keys and common filter columns (`(user_id, is_active)`, `medications.name`, etc.).
- Sort in SQL where practical.
- Paginate all list endpoints per §7.9.
- Keep payloads focused; do not over-return nested objects unless the UI needs them.

---

## 17) Deployment and packaging

### 17.1 Local dev
- `docker-compose.yml` runs `mariadb:latest` + the FastAPI app with hot reload.
- `uv run uvicorn app.main:app --reload` for direct local runs.
- `uv run alembic upgrade head` for migrations.
- `uv run python -m app.scripts.create_admin ...` to bootstrap the first admin.
- `uv run python -m app.scripts.seed_dev` for sample users / medications (dev only; refuses to run against `APP_ENV=prod`).

### 17.2 Container build
- Single-stage `Dockerfile` based on `python:3.12-slim`.
- Installs `uv`, syncs dependencies from `uv.lock`, runs `uvicorn` under `gunicorn` (`--worker-class uvicorn.workers.UvicornWorker`) in production.

### 17.3 Backups
- Out of scope for the backend code itself, but the README must note that production deployments are responsible for nightly `mysqldump` or managed-DB backups.

### 17.4 Secret management
- `.env` is acceptable for dev only. Production must inject secrets via the hosting provider's secret store (e.g., Docker secrets, GitHub Actions secrets, cloud KMS).

---

## 18) Definition of done for backend MVP

The backend MVP is complete when all of the following are true:

- FastAPI app runs locally via `uv run`.
- MariaDB/MySQL connection works; charset is `utf8mb4`.
- Alembic migrations create the final schema (§4) and a downgrade path has been verified.
- Passwords are hashed with Argon2id; plaintext never appears in logs or responses.
- JWT login works; refresh-token rotation and logout revocation work.
- Account lockout and login rate limiting work.
- Admin vs normal authorization works, including field-level PATCH rules.
- CRUD endpoints exist for the required tables; soft-delete semantics for prescriptions and users are verified.
- Hard-delete restrictions (RESTRICT on FK, admin-only) are verified.
- List endpoints sort alphabetically and paginate using the envelope from §7.9.
- User-specific prescription retrieval works.
- Error envelope (§7.10) is used for every non-2xx response.
- Audit log rows are written for prescription CRUD and for user role/delete changes.
- `/healthz`, `/readyz`, `/api/v1/version` all respond correctly.
- `GET /users/me/export` and `DELETE /users/me` work.
- `create_admin` CLI bootstraps a usable admin account.
- Tests cover the flows above (auth, authz, CRUD, validation, FK, pagination, audit, soft-delete, lockout).
- `.env.example`, `Dockerfile`, `docker-compose.yml`, and README exist.
- OpenAPI `/docs` loads with working Authorize flow.

---

## 19) Things agents must not do

- Do **not** store plain-text passwords or plain-text API keys.
- Do **not** hard-code secrets.
- Do **not** add delete support for medications unless explicitly requested.
- Do **not** make browser/mobile clients depend on API keys as their primary auth method.
- Do **not** collapse admin and normal permissions into a single unrestricted role.
- Do **not** allow normal users to PATCH forbidden fields silently — return `403`.
- Do **not** allow role self-escalation.
- Do **not** ship without migrations.
- Do **not** silently change route shapes once the frontend begins using them.
- Do **not** log passwords, password hashes, API keys, tokens, or full `/auth/*` request bodies.
- Do **not** use `python3` / `pip` directly; use `uv` exclusively.
- Do **not** use emojis in code, logs, commits, or responses.

---

## 20) Terminology (locked)

- **`login_name`** — the unique identifier the user types at login. Treat as the "username" in all user-facing login copy.
- **`user_name`** — the display name; non-unique; may contain spaces.
- **`email`** — unique, required, verified over time.
- **"soft-delete"** — set `is_active=false` (and, for users, anonymize PII); record retained.
- **"hard-delete"** — physical row removal; admin-only and FK-restricted.
- Roles are lowercase strings: `admin`, `normal`.

---

## 21) Assumptions made to proceed

These assumptions are reasonable defaults and can be revised later if needed:

- `login_name` is the authentication identifier; `user_name` is the display name.
- Role values are `admin` and `normal` (lowercase).
- User self-registration is allowed and creates `normal` users.
- User hard-deletion is admin-only and blocked by FKs; soft-delete/anonymize is the default path.
- Medication deletion is intentionally omitted.
- React frontend and Android client consume the same REST API.
- API keys are integration credentials, not browser-session credentials.
- This is a personal/family tool, not a HIPAA/PHI system (see §1).

---

## 22) Recommended first implementation target

Agents should first deliver:
1. Database models
2. Migrations (final `snake_case` schema, charset, FK rules, new tables)
3. Bootstrap-admin CLI
4. Auth system (hashing, JWT access, refresh rotation, lockout, rate limit)
5. Users / medications / prescriptions endpoints (with soft-delete, pagination, error envelope, audit)
6. Tests
7. Setup documentation (README, `.env.example`, Docker files)

Do **not** start with the Android app.
Do **not** start with the React UI.
Get the backend correct first; the shiny bits can wait their turn.
