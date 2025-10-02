# Quick Database Setup

Your Supabase database is ready but the tables haven't been created yet. Follow these simple steps:

## Step 1: Create Tables in Supabase

1. **Go to Supabase SQL Editor:**
   - Visit: https://supabase.com/dashboard/project/tsrmstkpcwmszmranzhw/sql/new
   - Or: Dashboard → SQL Editor → New Query

2. **Copy the SQL file:**
   - Open `packages/backend/create-tables.sql`
   - Copy ALL the contents

3. **Run the SQL:**
   - Paste into Supabase SQL Editor
   - Click "Run" or press `Ctrl+Enter` / `Cmd+Enter`
   - You should see success messages

## Step 2: Test the API

Your backend server is already running at http://localhost:3000

### Test 1: Health Check
```bash
curl http://localhost:3000/health
```

### Test 2: Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@savepal.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Save the token from the response!**

### Test 3: Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@savepal.com",
    "password": "password123"
  }'
```

### Test 4: Get Profile (use your token)
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Alternative: Use Prisma Push

If you prefer, try this command again (it might work after the manual SQL):
```bash
npm run db:push
```

## Verify Tables Created

Go to Supabase Dashboard → Table Editor to see your tables:
- users
- groups
- memberships
- cycles
- payments
- payouts
- payment_methods
- notifications

---

Once tables are created and you've tested the endpoints, let me know and we'll:
1. ✅ Merge the auth feature to develop
2. ✅ Build the frontend auth pages
