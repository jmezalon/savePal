#!/bin/bash
#
# Database Backup Script
# Backs up the production Supabase PostgreSQL database using pg_dump.
# Stores backups locally with timestamps and cleans up backups older than 30 days.
#
# Usage:
#   ./backup-database.sh
#
# Cron example (every 3 days at 2am):
#   0 2 */3 * * DB_HOST="your-host" DB_USER="your-user" PGPASSWORD="your-password" /path/to/backup-database.sh
#

set -euo pipefail

# Use Homebrew PostgreSQL 17 if available
if [ -x "/opt/homebrew/opt/postgresql@17/bin/pg_dump" ]; then
  export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
fi

# --- Configuration ---
# Set these environment variables before running:
#   DB_HOST, DB_USER, DB_NAME, PGPASSWORD
BACKUP_DIR="${BACKUP_DIR:-$HOME/savepal-backups}"
DB_HOST="${DB_HOST:?ERROR: DB_HOST is not set}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-postgres}"
DB_USER="${DB_USER:?ERROR: DB_USER is not set}"
RETENTION_DAYS=30

# --- Setup ---
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/savepal-prod-$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$TIMESTAMP] Starting database backup..."

# --- Backup ---
# Uses PGPASSWORD env var for authentication. Set it before running:
#   export PGPASSWORD="your-prod-db-password"
# Or add it to your crontab environment.

if [ -z "${PGPASSWORD:-}" ]; then
  echo "ERROR: PGPASSWORD environment variable is not set."
  echo "Set it with: export PGPASSWORD=\"your-prod-db-password\""
  exit 1
fi

pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --format=plain \
  | gzip > "$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$TIMESTAMP] Backup complete: $BACKUP_FILE ($FILESIZE)"

# --- Cleanup old backups ---
DELETED=$(find "$BACKUP_DIR" -name "savepal-prod-*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$TIMESTAMP] Cleaned up $DELETED backup(s) older than $RETENTION_DAYS days."
fi

echo "[$TIMESTAMP] Done."
