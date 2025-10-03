# Email Verification Migration Scripts

These scripts help handle email verification for existing users who registered before the email verification feature was added.

## Option 1: Send Verification Emails (Recommended)

**Script:** `send-verification-to-existing-users.ts`

Sends verification emails to all existing users who haven't verified their email yet.

### Usage:
```bash
cd packages/backend
npm run script:send-verification
```

### What it does:
- Finds all users with `emailVerified: false`
- Generates verification tokens for users who don't have one
- Sends verification emails to each user
- Shows progress and summary

### When to use:
- You want existing users to verify their emails like new users
- You want to maintain email verification requirements
- You want to ensure all email addresses in the system are valid

---

## Option 2: Auto-Verify Existing Users

**Script:** `auto-verify-existing-users.ts`

Automatically verifies all existing unverified users (grandfathers them in).

### Usage:
```bash
cd packages/backend
npm run script:auto-verify
```

### What it does:
- Finds all users with `emailVerified: false`
- Marks them as verified
- Increases their trust score by 20 points
- Shows preview and summary

### When to use:
- You want to trust existing users without requiring verification
- You only want email verification for new signups
- You're early in development with a small user base

---

## Recommendation

For a production app, **Option 1** is recommended because:
- Ensures all email addresses are valid
- Maintains security and trust
- Prevents spam/fake accounts
- Users are already familiar with email verification

**Option 2** is better if:
- You have a small, trusted user base
- Users have already been using the app successfully
- You want to avoid disruption

---

## After Running Either Script

1. Check the console output for any errors
2. Verify the results in your database
3. Test with a few users to ensure everything works
4. Monitor email delivery rates

## Notes

- Both scripts include error handling and reporting
- Option 1 includes a 100ms delay between emails to avoid rate limiting
- Scripts can be run multiple times safely (idempotent)
- Make sure your email service (Gmail SMTP) is properly configured in `.env`
