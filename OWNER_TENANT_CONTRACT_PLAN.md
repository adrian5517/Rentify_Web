# Owner & Tenant Agreement Integration Plan

## Objective
Make the owner–tenant contract experience seamless: a readable agreement, checkbox-only tenant acceptance, no chat/propose inputs, clear owner view, secure PDF generation, and robust API + UX for acceptance and document delivery.

## Success Criteria
- Tenant can accept via a single checkbox; owner can view/download the same agreement.
- Contracts list shows statuses, owner/tenant contacts, and auto-opens modal from Rent/Manage Lease.
- PDFs are readable, sanitized, include signatures/audit, and do not leak sensitive data.
- Auth rules enforce only authorized actions (tenant accept, owner view, admins manage).

## Assumptions
- Backend uses Express + Mongoose; frontend uses Next.js App Router + React.
- `NEXT_PUBLIC_API_URL` points to the running backend during dev.
- Existing contracts may have sparse fields and sometimes store only IDs for owner/tenant.

## High-level Milestones (mapped to TODOs)
1. Analyze current flows (code review of agreement, modal, contracts pages, and routes).
2. Define and migrate/update data model to ensure required fields are persisted.
3. Implement/confirm API endpoints with clear request/response and auth rules.
4. Frontend UI changes: agreement modal, contracts page, buttons and redirects.
5. Wire modal/sign flow to accept endpoint and update UI optimistically.
6. Enhance PDF generation (formatting, sanitize, embed image optional).
7. Harden auth & permissions with tests.
8. Testing & QA: unit, integration, manual E2E.
9. UX polish & accessibility.
10. Docs, migration, and rollout checklist.

## Detailed Implementation Steps

**Step 1 — Analyze Current Flows**
- Files to review: `components/contract-agreement.tsx`, `components/contract-modal.tsx`, `components/contract-button.tsx`, `app/contracts/page.tsx`, `Backend/routes/contractRoutes.js`, `Backend/controllers/pdfController.js`.
- Outcome: Map where owner/tenant data is read, where acceptance is posted, PDF generation inputs, and any gaps (missing rent/term/photos).

**Step 2 — Data Model**
- Update contract schema with fields: `ownerId`, `tenantId`, `ownerSnapshot`, `tenantSnapshot` (name/email/phone/signature), `propertySnapshot` (address, photos[]), `rentAmount`, `termStart`, `termEnd`, `status` (`pending`, `accepted`, `cancelled`), `audit` (actions array), and `pdfMeta` (generatedAt, url).
- Migration: write a script to fill `ownerSnapshot` / `tenantSnapshot` from populated references if present, otherwise leave signature fallbacks.

**Step 3 — API**
- Endpoints to implement/verify:
  - `GET /api/contracts/me` — list for current user (owner or tenant) with minimal property & contact data.
  - `GET /api/contracts/:id` — full contract, include snapshots.
  - `POST /api/contracts/:id/accept` — body { accepted: true, signature?: string, ip, userAgent } — only tenant allowed.
  - `GET /api/contracts/:id/pdf` — returns PDF stream (protected).
  - Optional: `POST /api/contracts/:id/refreshSnapshot` to regenerate contract snapshot after property edits.
- Ensure consistent response shapes and error codes (400, 401, 403, 404, 500).

**Step 4 — Frontend UI**
- Agreement modal:
  - Remove chat/propose inputs; present agreement text and a single checkbox for tenant acceptance.
  - Show owner and tenant contact blocks (name, email, phone) with icons.
  - Show property thumbnail and address.
  - Accept button disabled until checkbox checked and shows confirmation modal or toast.
- Contracts page:
  - Cards with thumbnail, status badge, owner/tenant avatars, `Open` / `Accept` / `Download` actions.
  - Clicking Rent/Manage Lease navigates to `/contracts?openModal=1` or `/contracts/:id?openModal=1` to auto-open modal.

**Step 5 — Modal / Accept Flow**
- On accept: POST to `/api/contracts/:id/accept` with Bearer token and `credentials: 'include'` if cookies used.
- Update UI optimistically to `accepted` on success; on failure, revert and show error.
- Trigger PDF generation if not already present and prompt user to download or email the PDF.

**Step 6 — PDF Generation**
- Use `pdf-lib` (or existing library) to produce clause-structured PDF with:
  - Header (Rentify), contract id, generation timestamp
  - Parties block (owner/tenant name, email)
  - Property block (address, optional embedded thumbnail)
  - Terms (rent amount, term start/end, payment address)
  - Signatures and audit trail (who accepted when)
- Sanitize all fields (only include plain strings). Do NOT include password, tokens, or raw DB objects. Add `safe()` helper to extract strings.
- Optionally embed property image by fetching image bytes and embedding with `pdf-lib`.

**Step 7 — Auth & Permissions**
- Protect endpoints with `protect` middleware; verify that route order avoids `/:id` swallowing literal routes like `me`.
- Only tenant can `accept`; owners can `view` and `download`; admins have full access.
- Ensure frontend attaches tokens/cookies correctly.

**Step 8 — Testing & QA**
- Write unit tests for controllers and services that create PDFs and update contract status.
- Integration tests for accept flow and PDF endpoint (authenticated requests using test users).
- Manual E2E checklist: create contract → sign in as tenant → accept → verify DB status and PDF stream.

**Step 9 — UX & Accessibility**
- Ensure modal is keyboard accessible, ARIA-labeled, and mobile responsive.
- Use clear messaging: “I accept the agreement” and confirmational modals.
- Add toast confirmations and email notifications (optional).

**Step 10 — Docs & Rollout**
- Add `OWNER_TENANT_CONTRACT_PLAN.md` (this file) and a short README in `Backend/docs/contracts.md` with API examples and migration scripts.
- Rollout checklist: deploy to staging, run migration, smoke test, then deploy to production with monitoring.

## Acceptance Tests (examples)
- Tenant acceptance happy path:
  1. Tenant views contract modal; checks acceptance box; clicks `Accept`.
  2. Frontend POSTs `/api/contracts/:id/accept` and receives 200.
  3. Contract `status` becomes `accepted`, `audit` records action, and `pdfMeta.generatedAt` is set.
  4. PDF is downloadable from `GET /api/contracts/:id/pdf`.

- Unauthorized access:
  - Non-tenant attempting to accept receives 403.
  - Unauthenticated requests to protected endpoints receive 401.

## Optional Enhancements
- Email/WhatsApp notifications on acceptance with PDF attached or link.
- Embed property photo(s) into PDF.
- Signed timestamp + simple audit trail displayed in UI.
- Server-side background job to regenerate PDFs when property or contract changes.

## Timeline Estimate (small team)
- Analysis & model design: 1–2 days
- API + backend changes + migration: 2–4 days
- Frontend UI + modal/sign flow: 2–3 days
- PDF enhancements + auth hardening: 1–2 days
- Testing, QA, docs, rollout: 1–2 days

---

File created: OWNER_TENANT_CONTRACT_PLAN.md
