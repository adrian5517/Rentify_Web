# Contract / Agreement — User Flow & Wireframes

## Overview
This document describes the landlord and renter flows for creating, reviewing, signing, and downloading rental contracts. It focuses on clarity, auditability, and minimal friction for e-signing.

## Key Principles
- Landlord drafts the agreement (editable draft). Renter reviews and e-signs.
- All actions are auditable and appended to `contract.history` with actor, timestamp, IP, and user-agent.
- Signed PDF is generated on-demand and stored in `contract.documents`.
- Only contract participants can view or act on the contract.

## Landlord Flow
1. Create Contract
   - Form: link to `Property`, set `startDate`, `endDate`, `rentAmount`, `currency`, `notes`.
   - Save as Draft (status: `draft`).
2. Edit Draft
   - Inline editable sections with `Save` and `Send to Renter` buttons.
3. Send to Renter
   - Marks contract `pending`; notifies renter.
4. View Signed Contract
   - After both signed, landlord sees signed PDF and audit trail.

## Renter Flow
1. Receive Notification
   - In-app notification and optional email.
2. Review Draft
   - Read-only view with expandable sections and inline `ContractChat` to ask questions.
3. Propose Edit (optional)
   - Sends a suggestion back to landlord (creates a history entry and notifies landlord).
4. Accept & E-sign
   - Checkbox "I accept the terms" + typed full name field.
   - POST `/api/contracts/:id/accept` stores signature, IP, UA, and timestamp.
   - If landlord already accepted, contract status → `active`.
5. Download Signed PDF
   - Button `Download Signed Contract` calls `GET /api/contracts/:id/pdf`.

## UI Screens / Components
- `ContractPage` (main) — header (status, actions), contract body (markdown renderer), `ContractChat`, `ContractAgreement` component, documents list, audit history.
- `ContractAgreement` — shows agreement + acceptance UI (checkbox, typed name, Accept button). Client validates non-empty name.
- `ContractChat` — scoped to contract; participants only.
- `Documents` — list of uploaded docs and generated signed PDF link.

## Audit & Storage
- Every action pushes to `contract.history`: `{ action, by, at, ip, userAgent, notes }`.
- When accepted, generate PDF (server-side) and add to `documents` with `uploaded_at`.

## Access & Validation
- Only `owner` or `renter` may `accept`. Verify auth token and membership.
- Validate typed name roughly matches account display name (soft check with warning).
- Protect PDF endpoint: auth + membership check.

## Edge Cases
- Partial accept (only landlord signed): show locked UI and allow renter to sign later.
- Proposed edits: track as `history` and keep previous draft versions.
- Admin override: admin can mark as accepted with reason logged.

## Next Implementation Steps
1. Finalize wireframes (small visual mockups for `ContractPage` and `ContractAgreement`).
2. Add/verify backend endpoints for `accept` and `pdf` (ensure they log history and store PDF).
3. Implement frontend components and permission guards.
4. Add notifications and E2E tests.

✅ PDF Storage: Implemented — PDF generated and stored in contract.documents on both parties accept.
✅ Propose Edit: Implemented — "Propose Changes" button in ContractAgreement sends proposal to history.
✅ Notifications: Implemented — In-app notifications via Zustand store and NotificationList component.
✅ UI Enhancements: Implemented — History and documents sections added to ContractPageClient.
✅ Audit/Storage: In-progress — History logging added for edits and PDF generation.

---
File: docs/CONTRACT_USER_FLOW.md
