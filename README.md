# ApplyEase

Accessibility-first job application assistant built for the PS003 hackathon scope.

## Stack

- Frontend: React 19, TypeScript, Vite, React Router, Motion, React Three Fiber, Lottie
- Backend: Python 3.12, FastAPI, SQLAlchemy, PostgreSQL, Argon2, JWT
- AI: optional server-side Anthropic API for grounded Job Lens analysis
- Testing: Vitest-style Node tests, Playwright, axe-core, pytest
- Full-stack demo: Docker Compose + PostgreSQL + FastAPI + Nginx

## Run the full demo

Prerequisites: Docker Desktop and a current Node.js/Python installation if you also want local development.

```powershell
docker compose up --build
```

Open:

- Frontend: http://localhost:5173
- API health: http://localhost:8000/health

The demo database is seeded automatically.

Demo account:

- Email: `asha.verma@example.com`
- Password: `ApplyEase123!`

For AI Job Lens, optionally create a `.env` in the repository root (used by Docker Compose):

```text
ANTHROPIC_API_KEY=your_key
```

Do not commit secrets.

For local backend development, copy `backend/.env.example` to `backend/.env` and set `ANTHROPIC_API_KEY` there. The backend loads either env file regardless of its launch directory; environment variables provided by the shell or Docker Compose take precedence.

## Local development

### 1. Install frontend dependencies

```powershell
npm install
```

### 2. Start PostgreSQL

Either use the PostgreSQL service already installed on your machine, or:

```powershell
docker compose up -d postgres
```

### 3. Install backend dependencies

```powershell
python -m pip install -r backend/requirements.txt
```

### 4. Apply the database schema and seed it

From the repository root:

```powershell
$env:DATABASE_URL="postgresql+psycopg://applyease:applyease@localhost:5432/applyease"
$env:JWT_SECRET="local-development-secret-change-me"
python -m alembic -c backend/alembic.ini upgrade head
python backend/scripts/seed.py
```

### 5. Start the API

```powershell
$env:PYTHONPATH="$PWD/backend"
$env:DATABASE_URL="postgresql+psycopg://applyease:applyease@localhost:5432/applyease"
$env:JWT_SECRET="local-development-secret-change-me"
python -m uvicorn app.main:app --reload --port 8000
```

### 6. Start the frontend in a second terminal

```powershell
$env:VITE_API_URL="http://localhost:8000"
npm run dev
```

## Verification

Run:

```powershell
npm run typecheck
npm run build
npm run test:unit
python -m pytest -q backend/tests
npx playwright install chromium
npm run test:e2e
npm run test:a11y
```

The repository intentionally does **not** contain `node_modules`, Python caches, generated reports, presentations, audit notes, or old phase documentation. `npm install` is required after cloning/unzipping.

## Implemented five-phase flow

Landing → accessibility onboarding → auth → profile → dashboard → server-backed job search → job import → grounded Job Lens → schema-driven application flow.

Phase 1 adds versioned Alembic migrations, PostgreSQL-first startup, authenticated profile persistence, refresh-token rotation and per-user imported-job isolation. Phase 2 adds server-side job filtering, text import, optional approved-host URL import, structured Job Lens analysis, exact source-span grounding and deterministic fallback. Phase 3 adds secure resume storage, application linkage, server-backed Application Kit data and authenticated resume access. Phase 4 adds accessibility/voice safety controls, explicit confirmation, partner submission boundaries, disclosure controls and submission auditing. Phase 5 adds production secret validation, auth rate limiting, account/data deletion, audit logging, persistent file storage in Docker, security headers and combined test/deployment scripts.

External jobs use an Application Kit and an approved employer URL instead of pretending to submit to an arbitrary ATS.

## Current production boundaries

- Employer integrations are still represented by the demo `PartnerAdapter`; real ATS credentials/connectors must be added before production use.
- URL job import remains allowlist-only. Set `APPROVED_JOB_HOSTS` to comma-separated approved employer hosts; otherwise paste job text.
- AI is optional. Without an API key, Job Lens uses deterministic source-text fallback.
- Voice depends on browser Web Speech API support.
- File storage is local by default and can be pointed at a persistent mounted directory with `FILE_STORAGE_DIR`; an S3-compatible adapter is the next infrastructure step for multi-instance production.
- Run the real Playwright, axe and pytest suites after installing dependencies in an environment with package access.

### Database reset

```powershell
python backend/scripts/reset.py
python backend/scripts/seed.py
```

Do not use `Base.metadata.create_all()` for normal development or deployment; Alembic owns the schema.
