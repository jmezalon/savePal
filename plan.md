# Group Creation Fee & Waiver Code Implementation Plan

## Overview
Add a $10 group creation fee charged via Stripe. The fee is automatically waived after 2 successful group completions. A recyclable (reusable) waiver code can also bypass the fee.

---

## 1. Database Schema Changes (`schema.prisma`)

### New Model: `FeeWaiverCode`
- `id` (String, UUID, PK)
- `code` (String, unique) — short human-friendly code (e.g., "SAVE2025")
- `description` (String, optional) — admin note
- `maxUses` (Int, nullable) — null = unlimited uses
- `currentUses` (Int, default 0) — how many times it's been redeemed
- `isActive` (Boolean, default true) — can be deactivated
- `createdAt`, `updatedAt`

### New Model: `FeeWaiverCodeUsage`
- `id` (String, UUID, PK)
- `codeId` (String, FK → FeeWaiverCode)
- `userId` (String, FK → User)
- `groupId` (String, FK → Group) — the group created using this code
- `usedAt` (DateTime)
- Unique constraint: `[codeId, userId, groupId]` (prevent double-recording)

### New Model: `GroupCreationFee`
- `id` (String, UUID, PK)
- `groupId` (String, FK → Group, unique)
- `userId` (String, FK → User)
- `amount` (Float) — 10.00
- `status` (PaymentStatus) — COMPLETED, WAIVED
- `waiverReason` (String, nullable) — "COMPLETED_GROUPS" or "WAIVER_CODE:{code}"
- `stripePaymentIntentId` (String, nullable, unique)
- `createdAt`

### User Model Update
- Add relation to `FeeWaiverCodeUsage[]` and `GroupCreationFee[]`

### Group Model Update
- Add relation to `GroupCreationFee?`

---

## 2. Backend: New Service — `feeWaiver.service.ts`

### Methods:
- **`generateCode(description?, maxUses?)`** — creates a new waiver code with a random 8-char alphanumeric string
- **`validateCode(code)`** — checks code exists, is active, and hasn't exceeded maxUses
- **`redeemCode(code, userId, groupId)`** — increments currentUses, records usage
- **`getUserCompletedGroupCount(userId)`** — counts groups where user was OWNER and group status = COMPLETED
- **`checkFeeWaiverEligibility(userId)`** — returns `{ waived: boolean, reason: string }` based on completed groups >= 2

---

## 3. Backend: Update `group.service.ts` — `createGroup()`

Modify the flow:
1. Accept new optional field: `feeWaiverCode?: string`
2. Before creating the group, determine if the fee is waived:
   - Check if user has 2+ completed groups as owner → auto-waive
   - Check if a valid waiver code was provided → code-waive
   - Otherwise → charge $10 via Stripe
3. Create the group inside the existing transaction
4. Record the `GroupCreationFee` (status = COMPLETED or WAIVED)
5. If code was used, call `redeemCode()`

---

## 4. Backend: Update `group.controller.ts` — `createGroup()`

- Accept `feeWaiverCode` from request body
- Pass it through to the service

### New Endpoint: `POST /api/groups/validate-waiver-code`
- Accepts `{ code: string }`
- Returns `{ valid: boolean, message: string }`

### New Endpoint: `GET /api/groups/creation-fee-status`
- Returns whether the current user needs to pay the fee
- `{ feeRequired: boolean, amount: 10, reason: string }`

---

## 5. Backend: Admin Endpoints for Code Management

Add to `admin.controller.ts` / `admin.routes.ts`:
- **`POST /api/admin/waiver-codes`** — generate a new waiver code
- **`GET /api/admin/waiver-codes`** — list all codes with usage stats
- **`PATCH /api/admin/waiver-codes/:id`** — deactivate/reactivate a code

---

## 6. Frontend: Update `CreateGroup.tsx`

1. On mount, call `GET /api/groups/creation-fee-status` to determine if fee is needed
2. If fee required:
   - Show a **$10 creation fee** notice in the summary area
   - Show a "Have a waiver code?" input with a "Validate" button
   - If code is valid, show green checkmark and update fee display to "$0.00 (waived)"
   - Submit sends `feeWaiverCode` in the body if one was validated
3. If fee auto-waived (2+ completions):
   - Show a green badge: "Creation fee waived — you've completed 2+ groups"
4. The Stripe charge for the $10 fee is handled server-side (off-session charge using saved payment method), same pattern as existing `chargePayment`

---

## File Change Summary

| File | Action |
|------|--------|
| `packages/backend/prisma/schema.prisma` | Add 3 new models, update User/Group relations |
| `packages/backend/src/services/feeWaiver.service.ts` | **New** — waiver code + eligibility logic |
| `packages/backend/src/services/group.service.ts` | Update `createGroup` to handle fee |
| `packages/backend/src/controllers/group.controller.ts` | Add waiver code validation endpoint, fee status endpoint, pass code to service |
| `packages/backend/src/routes/group.routes.ts` | Add 2 new routes |
| `packages/backend/src/controllers/admin.controller.ts` | Add waiver code CRUD |
| `packages/backend/src/services/admin.service.ts` | Add waiver code management methods |
| `packages/backend/src/routes/admin.routes.ts` | Add waiver code admin routes |
| `packages/frontend/src/pages/CreateGroup.tsx` | Add fee display, waiver code input, fee status check |
