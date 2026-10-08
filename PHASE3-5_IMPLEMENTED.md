# ApplyEase — Phases 3–5 Implementation

This repository extends the Phase 1–2 build with the remaining five-phase roadmap.

## Phase 3 — Profile, Application Wizard & Application Kit
- Real resume upload API (`POST /files/resume`)
- PDF/DOC/DOCX validation, 5 MB limit, magic-byte checks, SHA-256 metadata
- Per-user private file storage and protected download/delete endpoints
- Application-to-resume linkage
- Server-backed Application Kit endpoint
- Application Kit can open the authenticated saved resume
- Wizard resume selection uploads the file before advancing
- Profile resume upload uses the same secure file service
- Autosave/resume remains backed by the application API and local recovery

## Phase 4 — Accessibility, Voice, Safety & Submission
- WCAG-oriented accessibility controls already present in the core shell
- Reduced motion, contrast, text scale, spacing and dyslexia-friendly mode
- Keyboard shortcut map and skip/focus/live-region infrastructure
- Push-to-talk Web Speech API with explicit Listening/Heard/Not understood states
- Deterministic confirmation flow for submission
- Partner adapter boundary for future employer integrations
- Submission requires explicit confirmation and complete required answers
- Resume is required for partner jobs when the form requires it
- Application confirmation and submission are audit logged, including confirmation method and payload hash
- Optional disclosure remains separate from accessibility settings and is off by default
- Account deletion removes stored files and user-owned data
- Download-my-data export is available from Settings
- External Application Kit submissions can be marked as submitted in the tracker

## Phase 5 — Security, Testing, Performance & Deployment
- Versioned Alembic migration for files, resume linkage and audit events
- Production secret validation for JWT/disclosure encryption
- Lightweight authentication rate limiting
- Encrypted-at-rest resume storage, protected private responses (`no-store`) and 10-minute expiring file access links
- Account/data deletion endpoint
- Backend development test requirements
- Combined frontend/backend test scripts
- Docker backend runs migrations before startup
- Docker Compose remains the repeatable local deployment path
- Existing Playwright + axe suites remain available for final execution

## Known execution limitation
The source was statically validated in the build environment: Python compilation, migration compilation, JSON/config parsing and frontend local-import resolution pass. Dependency installation/network access is unavailable in this environment, so a fresh `npm install`/`pip install` and real browser/database test run must be executed on a machine with package access.

## Audit fixes applied after final PRD/TRD review
- Demo resume fixture is now seeded and re-created by the test reset path, so the partner-submit demo has a real stored file rather than a filename-only placeholder.
- Resume files are encrypted at rest with a dedicated production key and support 10-minute expiring access links.
- Submission confirmation now records keyboard/voice method, hashes the confirmed answer payload, and audits the confirmation event; submission copies those values.
- Editing a submitted application is blocked.
- External Application Kit flows can be marked “submitted externally” in the tracker.
- Settings now supports Download my data and separate disclosure sharing consent.
- Profile data is hydrated before wizard prefill, and local drafts attempt reconciliation again when connectivity returns.
- Job Lens source-truth disclosures now appear for grounded responsibility/requirement/preferred/process claims, with deadline display when stated.
- Voice navigation now includes the documented go-to/help commands.
- CI now applies Alembic migrations before seeding.
- Unknown application/kit/receipt jobs now resolve to a not-found state instead of an endless loading state.
