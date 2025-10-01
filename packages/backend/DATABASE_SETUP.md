# Database Setup Guide

## Option 1: Supabase (Recommended for Development)

1. Go to [https://supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Settings → Database
4. Copy the "Connection string" (URI format)
5. Replace `[YOUR-PASSWORD]` with your database password
6. Update `.env` file with the connection string:
   ```
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```

## Option 2: Local PostgreSQL

### macOS (using Homebrew)
```bash
brew install postgresql@14
brew services start postgresql@14
createdb savepal
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb savepal
```

### Windows
1. Download and install PostgreSQL from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Use pgAdmin to create a database named `savepal`

## After Database Setup

1. Push the schema to the database:
```bash
npm run db:push
```

2. (Optional) Open Prisma Studio to view your database:
```bash
npm run db:studio
```

## Database Migrations (Production)

For production, use migrations instead of db:push:

```bash
npm run db:migrate
```

This will create migration files in `prisma/migrations/`
