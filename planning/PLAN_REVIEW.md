# PLAN.md Review

Review of `planning/PLAN.md` — prescription manager backend build guide.
Reviewer: Claude (opus 4.7)
Date: 2026-04-22

This review is split into three parts:

1. **Errors / inconsistencies** — things that are wrong or contradictory in the existing document.
2. **Omissions** — important items the plan does not currently cover.
3. **Feature suggestions** — product-level features that may have been missed.

Items are tagged by severity: **[Critical]**, **[Important]**, **[Nice-to-have]**.

---

## 1) Errors and inconsistencies

### 1.1 File/document identity mismatch — [Nice-to-have]
- The file is `planning/PLAN.md` but the first heading reads `# AGENTS.md`. Pick one. If this is the AGENTS operating contract, rename/realign; otherwise fix the heading to `# PLAN.md` / `# Prescription Manager Plan`.

### 1.2 Column-name casing vs. Python conventions — [Important]
- The schema uses PascalCase/UPPER (`UserID`, `LoginName`, `PASSWORD`, `MedID`). SQLAlchemy mappings will expose `snake_case` attributes. The plan does not specify a naming/mapping convention, which will cause inconsistent attribute/column names across models. Decide: either rename columns in the first migration to `snake_case` (cleaner long-term), or explicitly document the Python attribute → DB column mapping.

### 1.3 Soft-delete vs. hard-delete contradiction — [Important]
- `Prescriptions` has an `Active` flag (soft-delete semantics) **and** the API exposes `DELETE /api/v1/prescriptions/{id}` (hard delete). The plan does not say which wins, or whether DELETE should flip `Active=false` or actually remove the row. This will lead to inconsistent behavior. Decide one of:
  - DELETE hard-deletes; `Active` is for "discontinued but retained for history".
  - DELETE soft-deletes by flipping `Active=false`; a separate admin-only hard-delete exists.

### 1.4 Foreign-key cascade behavior undefined — [Critical]
- Deleting a user is supported, but the plan never specifies what happens to that user's prescriptions. Options: `ON DELETE CASCADE`, `ON DELETE RESTRICT`, soft-delete user, or reject delete when prescriptions exist. For a medical-adjacent app, **RESTRICT + soft-delete** is usually safer than cascading deletes.

### 1.5 Password column type vs. hash algorithm — [Important]
- Plan recommends Argon2 or bcrypt and `VARCHAR(255)`. Fine for both, but note: Argon2 encoded strings are ~96–110 chars, bcrypt ~60. Also, `utf8mb4` with Argon2's `$` delimiters is fine, but the plan should explicitly set charset/collation (see 2.1).

### 1.6 "Delete user is admin-only" vs. self-service — [Important]
- Section 6 says user deletion is admin-only, but the plan also supports self-registration. There is no "delete my own account" story. If GDPR/privacy is in scope (see 3.6), a self-delete or anonymize endpoint is needed.

### 1.7 JWT logout is listed without mechanism — [Important]
- Section 7 lists `POST /api/v1/auth/logout` as optional, but JWTs are stateless — logout requires either a token blocklist, short-lived access tokens + refresh token rotation, or a server-side session. The plan hints at this but does not commit. Pick a model **before** shipping auth, or logout is cosmetic.

### 1.8 "Update all editable user fields" is under-specified — [Important]
- Phase 1 says "update all editable user fields" but never lists which fields are editable by whom. Can a normal user change `LoginName`? Change their own `Role`? Change another user's `Role`? Change `PasswordHash` directly? The plan should explicitly forbid role self-escalation and password set via PATCH (password change should be its own flow — see 2.6).

### 1.9 List-endpoint sort order contradiction — [Nice-to-have]
- Section 7 says prescriptions sort by "medication name, then doctor". Section 2/5/etc. says "sort alphabetically". Confirm the prescription sort key — medication name requires a join, which needs to be stated as the default.

### 1.10 `UserName` vs `LoginName` ambiguity in the spec — [Important]
- The plan resolves this in §19 (assumption), but several earlier sections use `UserName` loosely (e.g., §7 "users by `UserName`"). Once §19 is accepted, lock the terminology: "display name" = `UserName`, "login identifier" = `LoginName`, and make sure every endpoint that accepts or returns identifiers is explicit about which one.

### 1.11 Existing schema vs. required schema — [Nice-to-have]
- §3 describes the current DB; §4 describes required changes. There is no statement about migration of **existing data** (if any rows exist in `PrescriptionDatabase` already). If the DB is empty, say so. If not, the first migration must explicitly rehash/nullify passwords since 50-char plaintext cannot be converted to a hash.

### 1.12 Versioning policy is partial — [Nice-to-have]
- The plan requires `/api/v1`, but says nothing about deprecation, parallel-running versions, or when a v2 would be introduced. Add a one-line policy (e.g., "we will not remove a v1 endpoint until a v2 has been live for 2 releases").

---

## 2) Omissions

### 2.1 Database charset/collation not specified — [Critical]
- MariaDB/MySQL default collation varies by install. For a user-data app you want `utf8mb4` + `utf8mb4_unicode_ci` (or `utf8mb4_0900_ai_ci` on MySQL 8). Case-sensitivity on Linux also affects table names — `users` vs `Users` vs `Medications` will bite the team. Add a required section on charset/collation and `lower_case_table_names`.

### 2.2 Bootstrapping the first admin user — [Critical]
- Self-registration creates `normal` users. Nothing in the plan explains **how the first `admin` account is created**. Options:
  - CLI command / seed script (`create-admin`).
  - First-user-becomes-admin rule.
  - Alembic data migration.
- Pick one and spec it explicitly; otherwise the system launches with no admin.

### 2.3 Password lifecycle endpoints — [Important]
Missing from the API spec:
- `POST /api/v1/auth/change-password` (self-service, requires current password)
- `POST /api/v1/auth/forgot-password` / `POST /api/v1/auth/reset-password` (if email is in scope — see 2.4)
- Admin password reset endpoint.

### 2.4 User contact info — [Important]
The `users` table has no email. This blocks:
- Password reset flows.
- Account-security notifications.
- Any future reminder/notification feature.
- Unique identification beyond `LoginName`.

Recommend adding `Email VARCHAR(255) UNIQUE` at minimum, and an `EmailVerified BOOLEAN`.

### 2.5 Account security hardening — [Important]
No mention of:
- Failed-login tracking / account lockout / exponential backoff.
- Login rate limiting (brute-force protection on the login endpoint specifically, separate from general rate limiting).
- Password strength policy (minimum length, complexity, or a haveibeenpwned check).
- Session/token revocation when a password is changed.

### 2.6 Observability / operational endpoints — [Important]
Missing:
- `GET /healthz` (liveness) and `GET /readyz` (readiness — checks DB connectivity).
- Structured request logging (JSON logs with request ID).
- A correlation/request-ID middleware and response header.
- Metrics export (Prometheus-style `/metrics` or equivalent) — can be Phase 2+ but call it out.

### 2.7 Error-response schema — [Important]
- Plan says "return validation errors in structured form" but never defines the error envelope. Specify a canonical JSON error shape (e.g., `{ "error": { "code": "...", "message": "...", "details": [...] } }`) and use it consistently. Without this, frontend error handling becomes a mess.

### 2.8 Seeding and fixtures for dev/test — [Important]
- Tests need a reliable fixture path (a seed script, factory-boy/pytest fixtures, or an Alembic data migration). Not specified.
- Development seed (sample users, medications) should be a documented `uv run` command.

### 2.9 Audit logging — [Important]
- Medical-adjacent data should have an audit trail (who changed what prescription, when). The plan has `CreatedAt`/`UpdatedAt` but no `CreatedBy`/`UpdatedBy` and no audit log table. Recommend a lightweight `audit_log` table for `prescriptions` changes at minimum.

### 2.10 Concurrency control — [Nice-to-have]
- No mention of optimistic concurrency (ETag / `If-Match` / row version). For a single-user per-record app this is usually fine, but if a patient and a caregiver both edit, lost-update bugs appear. Consider a `RowVersion INT` or `UpdatedAt` check on PATCH.

### 2.11 Timezone policy for `DATETIME` columns — [Important]
- MariaDB `DATETIME` is timezone-naive; `TIMESTAMP` is UTC-normalized. Pick one convention (prefer `DATETIME` stored as UTC, with all timestamps serialized as ISO-8601 UTC in the API), and document it.

### 2.12 CORS, auth, and browser specifics — [Important]
- `CORS_ALLOWED_ORIGINS` is listed, but the plan does not decide **where the JWT lives on the browser** (localStorage vs. httpOnly cookie). This is a cross-cutting decision that affects CORS, CSRF, logout, and the frontend. It should be nailed down **before** the React phase starts:
  - `Authorization: Bearer …` header + localStorage = simpler, no CSRF protection needed, but vulnerable to XSS.
  - httpOnly cookie = XSS-safe, but needs CSRF tokens and stricter CORS (`credentials: true`, explicit origin list).

### 2.13 Pagination contract — [Important]
- Plan says "paginate list endpoints if record counts may grow" but never specifies:
  - Query params (`?page=` + `?size=` vs `?limit=` + `?offset=` vs cursor).
  - Response envelope (bare array vs `{ items, total, page, size }`).
- Pick one shape and apply it consistently — the React UI will bind to it.

### 2.14 Deployment, packaging, and backups — [Important]
Not mentioned at all:
- Containerization (`Dockerfile`, `docker-compose` for local dev with MariaDB).
- Production run target (uvicorn/gunicorn config, worker count).
- Database backup strategy.
- Secret management strategy beyond `.env` (for anything beyond dev).
- `uv` usage is required by global CLAUDE.md — PLAN.md should say "use `uv` and `uv run`, not raw `python`/`pip`" explicitly.

### 2.15 Logging of secrets / PII — [Important]
- Plan says "do not leak internal traces in production" but doesn't forbid logging request bodies (which may contain passwords on login, or medication data). Add an explicit rule: never log `PASSWORD`, `PasswordHash`, `API_KEY`, or full request bodies.

### 2.16 OpenAPI auth scheme / scopes — [Nice-to-have]
- FastAPI's OpenAPI only shows the "Authorize" button if `OAuth2PasswordBearer` (or equivalent) is wired up. Plan should explicitly require the "try it out" flow works in `/docs`.

### 2.17 Test-data isolation — [Important]
- "Test database or isolated test schema" — specify which. Recommend: a dedicated test DB with per-test transaction rollback, not a schema-drop-per-test loop (too slow and brittle).

### 2.18 Migration discipline — [Nice-to-have]
- No mention of rollback testing (`alembic downgrade` verified in CI) or of forbidding manual edits to existing migrations once merged.

### 2.19 Duplicate prescription prevention — [Nice-to-have]
- Nothing stops a user from having two identical active prescriptions for the same medication. Optional: unique constraint on `(UserID, MedID, Active=true)` or a business-rule check.

### 2.20 `.env.example` contents — [Nice-to-have]
- Plan says "provide `.env.example`". Good. Also specify that `.env` must be git-ignored and never committed — obvious, but worth stating given the global CLAUDE.md blocks reading `.env`.

---

## 3) Feature suggestions (product-level)

These are features that are not in the plan but are typical for a prescription-tracker and are worth considering now, even if deferred, so the schema can accommodate them.

### 3.1 Richer prescription fields — [Important]
Current prescription fields: `Dosage`, `Frequency`, `Doctor`, `Active`. Realistic prescription tracking usually needs:
- `StartDate` / `EndDate` (when the prescription is valid).
- `PrescribedDate`.
- `Quantity` and `RefillsRemaining`.
- `Instructions` / `Notes` (free-text, e.g., "take with food").
- `Pharmacy` (free-text or a `pharmacies` table).
- `Route` (oral / topical / injection / etc.) — optional.
- `Reason` / `Indication` — what the medication is for.

These are cheap to add now and expensive to retrofit after the UI ships.

### 3.2 Richer medication fields — [Important]
Currently just `Name`. Consider:
- `Strength` (e.g., "500 mg") — separate from dosage, which is per-prescription.
- `Form` (tablet, capsule, liquid, patch).
- `GenericName` vs `BrandName`.
- External identifier (RxNorm / NDC) for future API integration.

### 3.3 User profile fields — [Nice-to-have]
Depending on who uses this:
- `FirstName`, `LastName` (split from display name).
- `DateOfBirth` (useful for dosing, also a minor PHI flag).
- `PhoneNumber` (for future SMS reminders).

### 3.4 Reminders / notifications — [Nice-to-have, future phase]
- Reminder schedule (time of day, cron-like).
- Delivery channel (email / SMS / push).
- This is a big scope-add, but the schema for prescriptions should at least leave room for a `reminders` table later.

### 3.5 Medication interaction / allergy checks — [Nice-to-have, future phase]
- An `allergies` list per user.
- Warning on adding a prescription for a drug the user is allergic to.
- Full drug-drug interaction checks need an external data source (RxNorm/openFDA) — mark as future only.

### 3.6 Privacy / data export / GDPR-style rights — [Important]
If this app will be used by real people:
- Self-service data export (`GET /api/v1/users/me/export`).
- Self-service delete/anonymize (`DELETE /api/v1/users/me`).
- A documented retention policy.
- Even if not strictly GDPR-scoped, these are good citizen features.

### 3.7 HIPAA / medical-data compliance posture — [Important if applicable]
- The plan never says whether this app is intended to hold real PHI or is a personal/family tool. That decision dramatically changes the security bar (encryption at rest, audit logging, BAA with hosting, etc.). Add a one-line "compliance posture" statement in §1.

### 3.8 Prescription history / versioning — [Nice-to-have]
- When a dosage or frequency changes, is the old value preserved? Currently PATCH overwrites. Consider a `prescription_history` table or immutable-record pattern so changes over time are visible.

### 3.9 Multi-patient per account (caregiver mode) — [Nice-to-have, future]
- A common pattern: one login manages prescriptions for multiple people (elderly parent, children). Out of scope for MVP, but if it's ever likely, the data model (`users` ↔ `patients`) should be revisited early — much cheaper now than after launch.

### 3.10 Search / filter on list endpoints — [Nice-to-have]
- `GET /api/v1/medications?q=…` (name prefix search for the React autocomplete).
- `GET /api/v1/prescriptions?active=true&doctor=…` filters.
- Mentioned for user filtering only; broaden to match likely UI needs.

### 3.11 Bulk operations — [Nice-to-have]
- "Mark all prescriptions inactive" (e.g., when a user switches doctor).
- Not needed for MVP; note as a future API extension.

### 3.12 Read-only reporting endpoints — [Nice-to-have]
- Simple counts/summaries: "prescriptions per user", "most common medications". Useful for admin dashboards; one-line to scope-out now.

---

## 4) Suggested edits, prioritized

If you want to act on only a handful of items, the highest-leverage fixes are:

1. **[Critical]** Decide FK-cascade behavior for user and prescription deletes (§1.4).
2. **[Critical]** Decide charset/collation (`utf8mb4`) and case-sensitivity posture for table names (§2.1).
3. **[Critical]** Specify bootstrap-first-admin mechanism (§2.2).
4. **[Important]** Resolve soft-delete (`Active`) vs. hard-delete semantics for prescriptions (§1.3).
5. **[Important]** Add `Email` to `users` and commit to a password-lifecycle plan (§2.3, §2.4).
6. **[Important]** Add richer prescription fields — start/end dates, quantity, refills, notes, pharmacy — to the schema **before** the first migration ships (§3.1).
7. **[Important]** Pin the JWT-storage decision (header+localStorage vs cookie) and the logout/refresh model (§1.7, §2.12).
8. **[Important]** Define the error-response envelope and pagination contract before the React phase (§2.7, §2.13).
9. **[Important]** State the compliance posture (personal tool vs. PHI-bearing) (§3.7) — this gates several other decisions.
10. **[Nice-to-have]** Align document title/heading, lock terminology on `LoginName`/`UserName`, and add versioning/deprecation policy (§1.1, §1.10, §1.12).

---

*End of review.*
