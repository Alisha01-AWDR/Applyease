# ApplyEase — Final PRD/TRD/Project Flow Audit

Date: 2026-10-06

## Result

The project was audited against the final PRD, TRD and Project Flow. The core P0 journey and the requested Phase 1–5 implementation are present. Several integration and correctness issues were found and fixed in this pass.

## Requirement status

| Area | Status | Notes |
|---|---|---|
| Landing / onboarding / auth | PASS | Accessible routes, onboarding modes, auth and protected app shell |
| Dashboard / job search | PASS | Server-backed filtering with seeded fallback |
| Job import | PASS | Paste text + allowlisted URL import; no arbitrary scraping |
| Job Lens | PASS | Grounded AI, exact source spans, fallback, source-truth disclosures |
| Application readiness | PASS | Job-specific preparation checklist; explicitly not a hiring prediction |
| Profile | PASS | Server persistence + local hydration/prefill |
| Schema-driven wizard | PASS | One question per screen, validation, autosave, resume upload |
| Offline recovery | PASS / PARTIAL | Local draft recovery plus online reconciliation; full offline backend sync cannot be tested here |
| Keyboard | PASS | Shortcuts, remapping, typing suspension, skip links |
| Screen reader | PASS / NOT MANUALLY VERIFIED | Focus manager, landmarks, labels, live regions and announcements are implemented |
| Voice | PASS / NOT MANUALLY VERIFIED | Push-to-talk, fixed grammar, dictation, safe submit read-back |
| Review / confirmation | PASS | Explicit confirmation, keyboard/voice method, payload hash and audit event |
| Partner submit / receipt | PASS | Controlled demo adapter + receipt; real employer integration remains intentionally demo-only |
| Tracker | PASS | Draft/submitted + external-submitted state |
| Application Kit | PASS | Prepared answers, copy confirmation, resume access, employer deep link, external completion marker |
| Accessibility Center | PASS | Text scale, large text, contrast, spacing, reduced motion, dyslexia-friendly mode, shortcut map |
| Security / privacy | PASS / PARTIAL | Argon2, JWT refresh rotation, rate limit, encrypted file storage, private access, deletion/export; multi-instance storage still needs S3 adapter |
| P2 browser extension | NOT IMPLEMENTED | Explicitly out of current scope |
| P2 multilingual / email/SMS | NOT IMPLEMENTED | Explicitly out of current scope |
| Automated tests | PRESENT / NOT EXECUTED HERE | Playwright, axe and pytest suites exist; dependency/network access prevented execution in this environment |
| Manual NVDA / VoiceOver / TalkBack | NOT VERIFIED | Must be run on real assistive-technology devices/browsers |
| 3–5 user tests / axe evidence | NOT VERIFIED | No fabricated evidence was added |
| Deployment | PASS / NOT RUNTIME-VERIFIED | Docker Compose, backend migration startup and Nginx SPA routing are present |

## Bugs fixed in this audit

1. CI now runs Alembic migrations before seeding the PostgreSQL database.
2. The demo candidate now has a real encrypted resume fixture; test reset recreates it.
3. Resume files are encrypted at rest and support 10-minute expiring access links.
4. Resume filenames are sanitized before persistence.
5. Confirmation records keyboard/voice method and a hash of the exact confirmed answer payload.
6. Confirmation is audit logged and the final submission copies the confirmation metadata.
7. Submitted applications can no longer be edited back into draft state.
8. Confirmation now blocks before submission when a required resume file is missing.
9. External Application Kit applications can be marked as submitted externally in the tracker.
10. Settings now supports Download my data and separate disclosure-sharing consent.
11. Profile data is hydrated before wizard prefill; drafts reconcile again when the browser comes back online.
12. Job Lens exposes source-truth details for grounded responsibilities, requirements, preferred items and process claims, and shows a stated deadline.
13. Voice navigation now supports the documented go-to and help commands.
14. Unknown application/kit/receipt jobs no longer remain stuck on an infinite loading state.
15. Server-side Application Kit data includes application status.

## Verification performed in this environment

- Python AST parsing: PASS
- Python bytecode compilation: PASS
- TypeScript/TSX parser validation: PASS
- JSON configuration parsing: PASS
- Repository cleanup: PASS
- Real npm dependency install: BLOCKED by unavailable package-network access
- Real TypeScript typecheck/build: NOT EXECUTED because dependencies are unavailable
- Real pytest/API/database tests: NOT EXECUTED because psycopg/database runtime dependencies are unavailable
- Real Playwright/axe browser tests: NOT EXECUTED because frontend dependencies/browser runtime are unavailable
- Docker runtime: NOT EXECUTED because Docker daemon is unavailable

## Important honest limitations

The implementation should not be presented as having completed manual screen-reader testing, real-user testing, axe evidence, Lighthouse evidence or a live employer integration until those are actually run. The controlled partner adapter is a repeatable demo integration, as required by the project scope.

## Follow-up fixes (2026-10-06, second pass)

1. `src/lib/api.ts` reads `import.meta.env?.VITE_API_URL`, so `npm run test:unit` no longer crashes under plain Node (unit logic suite: 15/15 passing in a Node run).
2. `backend/tests/test_api.py` now sends a complete `acme-data` draft (phone + authorization) and asserts the real gates; a new test checks incomplete applications are rejected with 400.
3. Added the PRD route `/applications/:id` (`src/pages/ApplicationDetail.tsx`) and a "Details" link in the tracker. Partner drafts in the tracker now resume the wizard instead of opening the Application Kit.
4. `PremiumScene` no longer loads a remote HDR environment (offline-safe) and is wrapped in an error boundary so a WebGL/model failure cannot break a page.
5. Added `.dockerignore` so a local `node_modules` or `.env` is never copied into the Docker build; removed the stale `.pytest_cache`.

Still true: the three GLB files are 748-byte placeholders (replace with real Blender exports), and the full build, backend tests and Playwright/axe suites have not been run in this environment.
