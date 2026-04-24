# Prescription Tracker

A personal/family prescription management system built with FastAPI, SQLAlchemy, MariaDB, and React.

---

## Project Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 — Backend API | **Complete** | FastAPI backend with full CRUD, auth, and tests |
| Phase 2 — React Frontend | **Complete** | Browser UI with prescription and user management |
| Phase 3 — Login & Registration UI | Pending | Full login form, user self-registration flow |
| Phase 4 — API Keys | Pending | Integration credentials for programmatic access |
| Phase 5 — Android App | Pending | Mobile client calling the remote API |

---

## Phase 1 — Backend API

Full Python/FastAPI backend with MariaDB.

**Authentication & Security**
- Username/password login returning a short-lived JWT access token (15 min) and an opaque refresh token (30 days)
- Refresh token rotation on every use; logout revokes the token server-side
- Passwords hashed with Argon2id via passlib; plaintext never stored or logged
- Account lockout after 5 consecutive failed logins (15-min lockout)
- Per-IP rate limiting on login and refresh endpoints (10 req/min)

**Authorization**
- Two roles: `admin` and `normal`
- Field-level PATCH protection — normal users cannot change `login_name`, `role`, or `password_hash` via a PATCH request
- Admin-only endpoints for user management, hard deletes, and password resets

**Database Schema** (MariaDB, utf8mb4)
- `users` — login credentials, role, lockout tracking, soft-delete support
- `medications` — medication catalog (name, generic name, strength, form, brand)
- `prescriptions` — per-user prescriptions with soft-delete (`is_active`)
- `refresh_tokens` — server-side refresh token store (SHA-256 hashed)
- `audit_log` — audit trail for prescription CRUD and user role/delete changes

**API Endpoints** (`/api/v1/...`)
- `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/register`
- `GET /auth/me`, `POST /auth/change-password`, `POST /auth/admin-reset-password/{id}`
- Full CRUD for `/users`, `/medications`, `/prescriptions`
- `GET /users/{id}/prescriptions` — prescriptions for a specific user
- `GET /lookups/users`, `GET /lookups/medications` — lightweight dropdown lists
- `GET /healthz`, `GET /readyz`, `GET /api/v1/version`

**Other**
- Paginated and alphabetically sorted list responses
- Consistent error envelope: `{"error": {"code": "...", "message": "...", "details": [...]}}`
- Alembic migrations; initial schema stamped against live DB
- 48 automated tests (pytest) covering auth, authz, CRUD, pagination, lockout, soft-delete, audit log
- Bootstrap admin via env vars or `uv run python -m app.scripts.create_admin`

---

## Phase 2 — React Frontend

Single-page React app (TypeScript + Tailwind CSS) calling the Phase 1 API.

**Prescriptions**
- User selector dropdown (admin sees all users; normal users see only themselves)
- Prescription list sorted alphabetically by medication name
- Filter by active / inactive / all
- Add Prescription modal with inline medication creation — add a new medication to the catalog without leaving the form
- Soft-delete via Remove button

**User Management (admin only)**
- Users tab with an editable table: display name, login name, email, role, active status
- Inline row editing with Save/Cancel
- Per-user password reset modal
- Table reloads from server after every change; Updated timestamp column confirms saves

**Account**
- Login page (JWT auth; access token held in memory)
- Change Password modal available to all logged-in users
- Sign out revokes the refresh token

**UI**
- Dark mode default with light/dark toggle
- Responsive layout (works on mobile browsers)
- Field-level validation errors surfaced from the API

---

## Running Locally

### Prerequisites
- Python 3.13+ with `uv`
- Node.js 18+
- MariaDB or MySQL instance

### Backend

```bash
cd backend
cp .env.example .env          # fill in DB credentials and JWT secret
uv run alembic upgrade head   # run migrations
uv run serve                  # starts on port 42069
```

Bootstrap the first admin account:
```bash
uv run python -m app.scripts.create_admin
```

Or set these env vars and the server will seed on first startup:
```
ADMIN_BOOTSTRAP_LOGIN=admin
ADMIN_BOOTSTRAP_EMAIL=admin@example.com
ADMIN_BOOTSTRAP_PASSWORD=<min 12 chars>
```

### Frontend

```bash
cd frontend
npm install
npm run dev     # Vite dev server on http://localhost:5173
                # proxies /api to http://localhost:42069
```

### Tests

```bash
cd backend
uv run pytest
```

---

## Configuration (backend `.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_PORT` | `42069` | Server port |
| `DB_HOST` / `DB_PORT` / `DB_NAME` | — | Database connection |
| `DB_USER` / `DB_PASSWORD` | — | Database credentials |
| `JWT_SECRET_KEY` | — | Secret for signing JWTs |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Access token lifetime |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | `30` | Refresh token lifetime |
| `CORS_ALLOWED_ORIGINS` | — | Comma-separated allowed origins |
| `PASSWORD_MIN_LENGTH` | `12` | Minimum password length |
| `LOGIN_FAILED_LOCKOUT_THRESHOLD` | `5` | Failed logins before lockout |
| `LOGIN_FAILED_LOCKOUT_MINUTES` | `15` | Lockout duration |

---

## Project Structure

```
backend/
  app/
    api/v1/endpoints/   # Route handlers (auth, users, medications, prescriptions, lookups, ops)
    core/               # Config, security, tokens, errors, deps
    models/             # SQLAlchemy ORM models
    schemas/            # Pydantic request/response schemas
    services/           # Business logic
    scripts/            # create_admin, seed_dev
    tests/              # pytest test suite
  alembic/              # Migrations
frontend/
  src/
    api.ts              # API client
    App.tsx             # Root component / auth state
    LoginPage.tsx
    Dashboard.tsx       # Prescriptions view
    AddPrescriptionModal.tsx
    UsersPanel.tsx      # Admin user management
    ChangePasswordModal.tsx
planning/
  PLAN.md               # Build guide and architecture decisions
```

---

## Compliance Note

This application is a personal/family prescription tracker. It is not a HIPAA-covered or PHI-bearing clinical system and does not provide clinical advice. Reasonable security controls (hashed passwords, JWT auth, audit logging) are in place. Enterprise PHI compliance controls are out of scope unless the intended use changes.
