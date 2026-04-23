# AGENTS.md

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

---

## 2) Confirmed decisions

These decisions are already approved and should be treated as requirements:

- **Backend framework:** FastAPI
- **Language:** Python
- **Database:** MariaDB/MySQL
- **Database access:** SQLAlchemy ORM
- **Migrations:** Alembic
- **Validation/serialization:** Pydantic
- **Password storage:** hashed passwords only; never store plain-text passwords
- **Authentication model:** username/password login, then JWT for human clients
- **Authorization model:** `admin` and `normal` users
- **Frontend direction (future phase):** React frontend calling the FastAPI backend
- **API keys (future phase):** API keys are for integration/programmatic access, not the primary auth method for browser/mobile clients

---

## 3) Existing database provided by product owner

Initial schema supplied by the product owner:

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

---

## 4) Required schema adjustments

The supplied schema is the starting point, but the backend should apply the following safe improvements via Alembic migrations.

### Required changes

#### `users`
- Replace plain-text password storage with a hashed-password field.
- Recommended rename:
  - `PASSWORD` -> `PasswordHash`
- Recommended type:
  - `VARCHAR(255)`
- Add a role field:
  - `Role VARCHAR(20) NOT NULL DEFAULT 'normal'`

### Strongly recommended changes

These are not cosmetic; they make the backend much easier to operate safely.

#### Primary keys
Use auto-incrementing integer primary keys where not already configured.

#### Uniqueness
- `LoginName` must be unique.
- `UserName` does **not** need to be unique unless requested later.
- `Medications.Name` should be unique if medications are meant to be managed as a shared master list.

#### Audit timestamps
Add timestamps if allowed:
- `CreatedAt DATETIME NOT NULL`
- `UpdatedAt DATETIME NOT NULL`

#### API key storage
For Phase 4, do **not** store raw API keys in plain text if avoidable.
Preferred design:
- store an API key hash in the database
- show the raw key only once when created/regenerated
- optionally store a short prefix for display/debugging

If the product owner insists on storing raw API keys to match the original schema, isolate that logic so it can be replaced later.

---

## 5) Functional requirements by phase

### Phase 1 - Backend CRUD API

Build a backend API that can create and update all fields in all tables.

#### Must support

##### Users
- Create user
- Read user(s)
- Update all editable user fields
- Delete user

##### Medications
- Create medication
- Read medication(s)
- Update medication fields
- **No delete endpoint unless later requested**

##### Prescriptions
- Create prescription
- Read prescription(s)
- Update all editable prescription fields
- Delete prescription

#### Additional Phase 1 notes
- Expose explicit API endpoints for each supported action.
- Enforce foreign keys correctly between `Prescriptions`, `users`, and `Medications`.
- Return structured JSON responses.
- Validate request bodies and return proper HTTP status codes.
- Support filtering prescriptions by user.
- Sort list responses alphabetically when appropriate for readability.

### Phase 2 - React frontend

Future phase only, but the backend must support it cleanly.

Frontend requirements:
- Runs in a browser on Windows
- Usable on Android device browsers
- Dropdown to select a user
- Display all prescriptions for the selected user
- Add prescriptions
- Remove prescriptions
- Prescription removal must update the database immediately
- Sort lists alphabetically
- Modern UI
- Dark mode and light mode
- Dark mode should be the default

Backend implications:
- Must support CORS configuration
- Must expose stable JSON endpoints for frontend use
- Must provide efficient user list and medication list endpoints
- Must provide a user-prescriptions endpoint designed for the UI

### Phase 3 - Login and user creation

Frontend will later add:
- login form
- create-user flow

Backend must provide:
- login endpoint
- token refresh strategy if implemented
- current-user endpoint
- user registration endpoint
- role-aware access control

### Phase 4 - API keys

Each user will eventually have an API key.

Important: the approved design is:
- browser/mobile clients use username/password + JWT
- API keys are used for integration/programmatic access
- API keys are **not** the primary authentication method for the browser frontend or Android app

Backend must eventually support:
- generate API key for a user
- regenerate/revoke API key
- authenticate integration requests using API key
- scope API key access to the owning user unless admin rules explicitly allow more

### Phase 5 - Android app with remote API

The future Android client must be able to:
- call the remote API
- set/change the backend API address

Backend implications:
- use versioned REST endpoints
- keep auth stateless
- document base URL and auth requirements clearly
- avoid browser-only auth assumptions

---

## 6) Authorization rules

Use role-based access control.

### Roles
- `admin`
- `normal`

### Default rules

#### Admin users can
- view all users
- create users
- update users
- delete users
- view all medications
- create medications
- update medications
- view all prescriptions
- create prescriptions
- update prescriptions
- delete prescriptions
- list prescriptions for any user
- generate/regenerate API keys for users if that feature is enabled

#### Normal users can
- log in
- view their own profile
- update their own allowed profile fields
- view their own prescriptions
- create their own prescriptions only if allowed by the product design
- update their own prescriptions only if allowed by the product design
- delete their own prescriptions only if allowed by the product design

### Current implementation assumption
For the first backend version:
- normal users may read their own profile and their own prescriptions
- admin users manage shared data and all users
- user self-registration is allowed
- user deletion is admin-only

If self-service prescription editing is desired for normal users, implement it behind clear authorization checks and tests.

---

## 7) API design requirements

Use a versioned REST API under:
- `/api/v1/...`

### Minimum endpoint set

#### Auth
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `GET /api/v1/auth/me`

Optional but recommended:
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout` (mainly useful if refresh tokens are added)

#### Users
- `GET /api/v1/users`
- `GET /api/v1/users/{user_id}`
- `POST /api/v1/users`
- `PUT /api/v1/users/{user_id}`
- `PATCH /api/v1/users/{user_id}`
- `DELETE /api/v1/users/{user_id}`

#### Medications
- `GET /api/v1/medications`
- `GET /api/v1/medications/{med_id}`
- `POST /api/v1/medications`
- `PUT /api/v1/medications/{med_id}`
- `PATCH /api/v1/medications/{med_id}`

#### Prescriptions
- `GET /api/v1/prescriptions`
- `GET /api/v1/prescriptions/{prescription_id}`
- `POST /api/v1/prescriptions`
- `PUT /api/v1/prescriptions/{prescription_id}`
- `PATCH /api/v1/prescriptions/{prescription_id}`
- `DELETE /api/v1/prescriptions/{prescription_id}`

#### UI helper endpoints
- `GET /api/v1/users/{user_id}/prescriptions`
- `GET /api/v1/lookups/users`
- `GET /api/v1/lookups/medications`

#### Future API key endpoints
- `POST /api/v1/users/{user_id}/api-key`
- `DELETE /api/v1/users/{user_id}/api-key`

### Response behavior
- Use standard HTTP status codes.
- Return validation errors in structured form.
- Use pagination for list endpoints if record counts may grow.
- Sort list endpoints alphabetically by default where the UI expects readability:
  - users by `UserName`
  - medications by `Name`
  - prescriptions by medication name, then doctor, unless a better UI-specific sort is requested

---

## 8) Data model guidance

Use SQLAlchemy ORM models and Pydantic schemas.

### ORM model expectations
Create ORM models for:
- `User`
- `Medication`
- `Prescription`

### Relationships
- A `User` has many `Prescription` rows.
- A `Medication` has many `Prescription` rows.
- A `Prescription` belongs to one `User` and one `Medication`.

### Pydantic schema pattern
Create separate schemas for:
- create requests
- update requests
- response models
- lookup/list models where returning full nested payloads is unnecessary

Example pattern:
- `UserCreate`
- `UserUpdate`
- `UserRead`
- `MedicationCreate`
- `MedicationUpdate`
- `MedicationRead`
- `PrescriptionCreate`
- `PrescriptionUpdate`
- `PrescriptionRead`

---

## 9) Security requirements

### Passwords
- Use a modern password hash.
- Prefer **Argon2** if dependencies are acceptable.
- Use **bcrypt** if the implementation environment makes that easier.
- Never store plain-text passwords.
- Never return password hashes in API responses.

### JWT
- Use signed JWT access tokens.
- Keep token expiration reasonable.
- Read secrets from environment variables.
- Never hard-code secrets in source control.

### API keys
When Phase 4 is implemented:
- generate cryptographically strong random API keys
- prefer hashing stored API keys
- support revocation/regeneration
- require API key transmission in a header such as `X-API-Key`

### General
- Validate all input.
- Use parameterized DB access through ORM.
- Restrict normal users from admin-only routes.
- Do not leak internal exception traces in production responses.
- Enable CORS only for approved frontend origins.
- Add rate limiting later if the app becomes internet-exposed.

---

## 10) Backend project structure

Use a clean, modular FastAPI layout.

Recommended structure:

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
    core/
      config.py
      security.py
      database.py
      deps.py
    models/
      user.py
      medication.py
      prescription.py
    schemas/
      auth.py
      user.py
      medication.py
      prescription.py
    services/
      auth_service.py
      user_service.py
      medication_service.py
      prescription_service.py
      api_key_service.py
    db/
      base.py
      session.py
    tests/
    main.py
  alembic/
  alembic.ini
  requirements.txt
  .env.example
```

Agents may adjust the exact folder layout, but the code must remain clearly modular and maintainable.

---

## 11) Recommended implementation sequence

Build in this order.

### Step 1 - Scaffold backend
- Create FastAPI app
- Add config management
- Add DB connection/session handling
- Add SQLAlchemy base and models
- Set up Alembic

### Step 2 - Migrations
- Create initial migration(s)
- Bring the provided schema in line with approved requirements
- Add role and password-hash support
- Add uniqueness constraints

### Step 3 - Authentication and authorization
- Password hashing utilities
- JWT token creation/validation
- login endpoint
- registration endpoint
- current-user dependency
- admin-role dependency

### Step 4 - CRUD endpoints
- medications CRUD (minus delete)
- users CRUD
- prescriptions CRUD
- filtering by user
- sorted list responses

### Step 5 - Tests
- auth tests
- authorization tests
- CRUD tests
- validation/error-path tests

### Step 6 - Documentation
- environment setup
- local run instructions
- migration instructions
- API usage examples

### Step 7 - Future-ready work
- CORS config
- API versioning
- lookup endpoints for React UI
- API key service scaffolding

---

## 12) Testing requirements

Use automated tests.

Minimum expectation:
- unit tests for auth/security helpers
- API tests for major endpoints
- authorization tests for admin vs normal access
- tests for validation failures
- tests for foreign-key error cases
- tests confirming sorted list responses

Recommended stack:
- `pytest`
- `httpx`
- test database or isolated test schema

Every endpoint added should have at least one success-path test and one failure/authorization-path test.

---

## 13) Environment and configuration

All secrets/config must come from environment variables.

Minimum expected configuration:
- `APP_NAME`
- `APP_ENV`
- `DEBUG`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET_KEY`
- `JWT_ALGORITHM`
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`
- `CORS_ALLOWED_ORIGINS`

Optional future config:
- `API_KEY_LENGTH`
- `API_KEY_HEADER_NAME`
- `ANDROID_ALLOWED_ORIGINS` if needed later

Provide a `.env.example` file.

---

## 14) Coding standards

Agents must produce code that is:
- readable
- modular
- typed where practical
- documented where helpful
- easy to test

### Required practices
- Use descriptive names.
- Keep routers thin; move business logic into services.
- Keep DB access organized and predictable.
- Avoid copy/paste logic between endpoints.
- Use dependency injection for auth/session access.
- Use Alembic for schema changes; do not manually edit production DBs.
- Do not mix auth logic directly into CRUD handlers when a shared dependency/service can handle it.

### Error handling
- Return clear API errors.
- Use `404` for missing resources.
- Use `400` or `422` for invalid input as appropriate.
- Use `401` for authentication failures.
- Use `403` for authorization failures.
- Use `409` for uniqueness conflicts where applicable.

---

## 15) OpenAPI and developer experience

Because this is FastAPI, agents should lean on automatic OpenAPI docs.

Requirements:
- Ensure request/response models are accurate.
- Add endpoint summaries and descriptions where useful.
- Keep tags organized (`auth`, `users`, `medications`, `prescriptions`, `lookups`).
- Make the docs usable for future React and Android work.

---

## 16) Performance and query behavior

This project is not large-scale yet, but the backend should still avoid silly mistakes.

Requirements:
- avoid N+1 query issues when returning prescriptions with medication/user info
- index foreign keys
- sort in SQL where practical
- paginate list endpoints when needed
- keep payloads focused; do not over-return nested objects unless the UI needs them

---

## 17) Definition of done for backend MVP

The backend MVP is complete when all of the following are true:

- FastAPI app runs locally
- MariaDB/MySQL connection works
- Alembic migrations create/update schema correctly
- passwords are hashed
- JWT login works
- admin/normal authorization works
- CRUD endpoints exist for required tables
- delete exists only for `users` and `prescriptions`
- list endpoints sort alphabetically where required
- user-specific prescription retrieval works
- tests cover major flows
- `.env.example` exists
- README or setup instructions exist
- OpenAPI docs load successfully

---

## 18) Things agents must not do

- Do **not** store plain-text passwords.
- Do **not** hard-code secrets.
- Do **not** add delete support for medications unless requested.
- Do **not** make browser/mobile clients depend on API keys as their primary auth method.
- Do **not** collapse admin and normal permissions into a single unrestricted role.
- Do **not** ship without migrations.
- Do **not** silently change route shapes once the frontend begins using them.

---

## 19) Assumptions made to proceed

These assumptions are reasonable defaults and can be revised later if needed:

- `LoginName` is the username used for authentication.
- `UserName` is the display name.
- Role values are `admin` and `normal`.
- User self-registration is allowed.
- User deletion is admin-only.
- Medication deletion is intentionally omitted.
- React frontend and Android client will consume the same REST API.
- API keys are integration credentials, not browser-session credentials.

---

## 20) Recommended first implementation target

Agents should first deliver:
1. database models
2. migrations
3. auth system
4. users/medications/prescriptions endpoints
5. tests
6. setup documentation

Do **not** start with the Android app.
Do **not** start with the React UI.
Get the backend correct first; the shiny bits can wait their turn.

