#!/bin/bash
#
# Database Restore Script
# Restores a backup file to the target database.
#
# Usage:
#   ./restore-database.sh <backup-file.sql.gz> [target: prod|dev]
#
# Examples:
#   ./restore-database.sh ~/savepal-backups/savepal-prod-2026-04-09_02-00-00.sql.gz dev
#   ./restore-database.sh ~/savepal-backups/savepal-prod-2026-04-09_02-00-00.sql.gz prod
#

set -euo pipefail

BACKUP_FILE="${1:-}"
TARGET="${2:-dev}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file.sql.gz> [prod|dev]"
  echo ""
  echo "Available backups:"
  ls -lh ~/savepal-backups/savepal-prod-*.sql.gz 2>/dev/null || echo "  No backups found in ~/savepal-backups/"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# --- Target database config ---
# Set these environment variables before running:
#   DB_HOST, DB_USER, PGPASSWORD
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-postgres}"
DB_HOST="${DB_HOST:?ERROR: DB_HOST is not set}"
DB_USER="${DB_USER:?ERROR: DB_USER is not set}"

if [ "$TARGET" = "prod" ]; then
  echo "WARNING: You are about to restore to PRODUCTION!"
  read -p "Type 'yes-restore-prod' to confirm: " CONFIRM
  if [ "$CONFIRM" != "yes-restore-prod" ]; then
    echo "Aborted."
    exit 1
  fi
fi

if [ -z "${PGPASSWORD:-}" ]; then
  echo "ERROR: PGPASSWORD environment variable is not set."
  echo "Set it with: export PGPASSWORD=\"your-$TARGET-db-password\""
  exit 1
fi

echo "Restoring $BACKUP_FILE to $TARGET database..."

gunzip -c "$BACKUP_FILE" | psql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --single-transaction \
  --set ON_ERROR_STOP=on \
  2>&1

echo "Restore complete."
