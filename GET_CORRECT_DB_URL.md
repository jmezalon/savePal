# Get Correct Database URLs from Supabase

The Vercel-provided URLs might have the wrong region. Let's get the correct ones directly from Supabase.

## Step 1: Get Connection Strings from Supabase

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard/project/tsrmstkpcwmszmranzhw

2. **Navigate to Database Settings:**
   - Click on "Project Settings" (gear icon in sidebar)
   - Click on "Database" in the left menu

3. **Find Connection Strings:**
   - Scroll down to "Connection string" section
   - You'll see multiple connection strings

4. **Copy These URLs:**

   **For DATABASE_URL (use "Connection Pooling" - Transaction mode):**
   ```
   Look for: "Connection pooling"
   Mode: Transaction
   Format: postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

   **For DIRECT_URL (use "Direct connection" - Session mode):**
   ```
   Look for: "Connection string" (not pooling)
   Mode: Session
   Format: postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```

## Step 2: Update .env File

Replace these lines in `packages/backend/.env`:

```bash
DATABASE_URL="[paste Transaction mode pooling URL here]"
DIRECT_URL="[paste Direct connection URL here]"
```

## Step 3: Try Prisma Push Again

```bash
npm run db:push
```

---

## Alternative: Manual SQL Creation (If URLs Still Don't Work)

If the connection URLs still have issues, we can create tables directly in Supabase:

1. **Go to SQL Editor:**
   - https://supabase.com/dashboard/project/tsrmstkpcwmszmranzhw/sql/new

2. **Copy SQL from:**
   - `packages/backend/create-tables.sql`

3. **Paste and Run** (Click "Run" or Ctrl+Enter)

4. **Verify in Table Editor:**
   - Click "Table Editor" in sidebar
   - You should see: users, groups, memberships, cycles, payments, payouts, payment_methods, notifications

---

Once tables are created (either method), we can test the API!
