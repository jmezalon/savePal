# Plan: Fallback to Bank Account (ACH) When Card Fails

## Problem Statement

When a user's card payment fails multiple times (3 retries exhausted), the system currently gives up. This creates a vulnerability:

**Fraud Scenario:** A bad actor joins a group, receives their payout in an early cycle, then intentionally causes their card to fail for all subsequent contributions (cancels card, uses a prepaid card with no funds, disputes charges, etc.). They walk away with the payout having never paid their full share.

## Current State

- Card payments retry up to **3 times** (scheduler + webhook)
- After 3 failures → payment sits as `FAILED`, no further action
- Users have a **Stripe Connect account with a bank account** (used for receiving payouts)
- The bank account is an *external account* on a Connect account — it's a **payout destination**, not a payment source
- `trustScore` field exists on User model but is **never updated**
- No suspension, penalty, or escalation mechanisms exist

## Key Stripe Distinction

This is critical to understand:

| Concept | What It Is | Current Usage |
|---------|-----------|---------------|
| **PaymentMethod (card)** | Attached to Stripe Customer | Used to *charge* the user |
| **External Account (bank)** | Attached to Stripe Connect Account | Used to *pay out* to the user |

**You cannot directly charge a Connect external account.** To charge a user's bank account, you need to either:

1. **Create an ACH PaymentMethod** using `us_bank_account` type on the **Customer** (not Connect account) — requires separate authorization/mandate
2. **Reverse/withhold from future payouts** — deduct from future payout via the Connect account (debit the connected account)

### Recommended Approach: **Debit Connected Account (Clawback from Payout)**

Stripe allows platforms to **create charges on connected accounts** or **reverse transfers**. Since we already have the user's Connect account with bank details, we can:

- Use `stripe.charges.create()` with the `source` as the connected account (destination charge in reverse)
- Or more practically: **withhold the owed amount from their next payout** by reducing the transfer amount

This is simpler, doesn't require new user authorization, and is the most enforceable approach.

## Proposed Design

### Phase 1: Fallback Payment via Payout Withholding

**When card fails 3 times:**

1. Mark the payment with a new status indicator: `fallbackPending: true`
2. Flag the user's membership with `hasOutstandingDebt: true` and `outstandingAmount`
3. When this user's payout cycle arrives:
   - Calculate: `netPayout = normalPayout - outstandingDebt - platformFee`
   - If debt > payout amount → pay nothing, carry remaining debt forward
   - Transfer only the net amount (or $0)
4. Mark the original failed payment as `COMPLETED` (via withholding)
5. Notify the user at each step: "Your contribution of $X was deducted from your payout"

### Phase 2: ACH Direct Debit (Future Enhancement)

For cases where the user has already received their payout (nothing to withhold):

1. During onboarding, collect ACH authorization (Stripe `us_bank_account` mandate)
2. Store as a backup PaymentMethod on the Customer (not Connect account)
3. After card fails 3x → attempt ACH charge via the authorized bank account
4. ACH has its own failure modes (NSF, account closed) — handle those too

**Note:** This requires additional user consent (ACH mandate) and has longer settlement times (3-5 business days). Plan for Phase 2 only after Phase 1 proves the concept.

## Abuse Scenarios & Mitigations

| Abuse Scenario | Current Risk | Mitigation |
|---|---|---|
| **Add bad card, get payout, ghost** | HIGH — no enforcement after 3 retries | Phase 1: Withhold from payout. Phase 2: ACH debit |
| **Cancel card after joining group** | HIGH — payment fails, no fallback | Block card deletion if in active group (already exists). Withhold from payout |
| **Use prepaid card with no balance** | HIGH — charge fails silently | Withhold from payout. Consider blocking prepaid cards via Stripe Radar |
| **Dispute/chargeback after paying** | MEDIUM — funds reversed | Handle `charge.dispute.created` webhook. Flag user. Withhold from future payout |
| **Receive payout then leave** | MEDIUM — if they have remaining contributions | Withhold must happen BEFORE payout. Re-order: collect all contributions before releasing payout for that cycle |
| **Create multiple accounts** | LOW — separate Stripe identities | Phase 2: KYC/identity dedup via SSN last 4 + name matching |
| **Collude with group members** | LOW — complex social attack | Trust scores, group history, reporting mechanisms |

## Critical Design Decision: Payout Timing

**Current flow:** Payout happens when ALL payments in a cycle are collected → then transfer to recipient.

**This is actually already safe** for the current cycle — if a member doesn't pay, the cycle doesn't complete, and no payout happens. The risk is for **future cycles after a user has already received their payout**.

**Example with a 4-person group ($100/cycle):**
- Cycle 1: User A receives payout ($400). Everyone pays. ✓
- Cycle 2: User B receives payout. User A's card starts failing. Cycle stalls.
- Cycle 3-4: User A owes but has already been paid.

**The withholding approach works perfectly here** — User A already received their payout in Cycle 1 but won't receive another. However, since this is a ROSCA, User A only gets ONE payout across all cycles. So the withholding approach works for users who haven't received their payout yet.

For users who **already received their payout**, we need:

1. **ACH debit** (Phase 2) — charge their bank account directly
2. **Legal/collections** — flag for manual intervention
3. **Trust score impact** — prevent them from joining future groups
4. **Group insurance pool** — future feature where a small fee goes to cover defaults

## Schema Changes

```prisma
model Payment {
  // ... existing fields
  fallbackMethod    String?    // 'payout_withholding' | 'ach_debit' | null
  fallbackAt        DateTime?  // When fallback was applied
}

model Membership {
  // ... existing fields
  outstandingDebt   Float      @default(0)  // Amount owed from failed payments
  debtPayments      String[]   // Payment IDs that contributed to debt
}

model User {
  // trustScore already exists — we'll actually start using it
}
```

## Implementation Steps

### Step 1: Track Outstanding Debt
- After 3 card failures, add the payment amount to `membership.outstandingDebt`
- Store the failed payment ID in `membership.debtPayments`
- Send notification: "Your card payment failed. The amount will be deducted from your next payout."

### Step 2: Withhold from Payout
- In `payoutService.processPayout()`, check if recipient has `outstandingDebt > 0`
- Reduce transfer amount by debt amount
- If debt exceeds payout: transfer $0, carry remaining debt
- Mark original failed payments as COMPLETED with `fallbackMethod: 'payout_withholding'`
- Clear/reduce `outstandingDebt` accordingly
- Notify user of deduction

### Step 3: Update Trust Score
- Decrement trust score on payment failure (after all retries exhausted)
- Increment trust score on successful cycle completion
- Display trust score prominently in group member lists (already shown in UI)

### Step 4: Handle Webhook for Disputes
- Add `charge.dispute.created` webhook handler
- Immediately flag user and add disputed amount to `outstandingDebt`
- Notify group owner

### Step 5: Admin Tools
- Dashboard view of users with outstanding debt
- Ability to suspend users from joining new groups
- Manual override for debt resolution

## What We're NOT Doing (Yet)

- ACH direct debit (requires mandate collection, longer settlement)
- Stripe Radar / fraud scoring integration
- KYC/AML compliance
- Group insurance pools
- Automated collections / legal escalation
- Blocking prepaid cards (can be added via Stripe Radar rules)

## Questions to Consider

1. **Should we block a user from joining ANY new group while they have outstanding debt?** (Recommended: Yes)
2. **Should the group owner be notified immediately when a member's card fails, or only after all retries are exhausted?** (Currently: notified on each failure)
3. **What's the minimum trust score to join a group?** (Need to define thresholds)
4. **Should we allow the group to continue even if one member can't pay?** (Currently: cycle stalls until all pay)
