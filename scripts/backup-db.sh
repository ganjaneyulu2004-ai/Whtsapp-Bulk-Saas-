#!/bin/bash
# ==============================================================================
# 🗄️ OneAmple (OfferBlast) - Automated Daily PostgreSQL Database Backup Script
# Location: /var/www/offerblast/scripts/backup-db.sh
# 
# Usage:
#   bash /var/www/offerblast/scripts/backup-db.sh
#
# Automated Cron (Runs daily at 2:00 AM):
#   0 2 * * * /var/www/offerblast/scripts/backup-db.sh >> /var/log/offerblast-backup.log 2>&1
# ==============================================================================

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/offerblast"
LOG_FILE="/var/log/offerblast-backup.log"
APP_DIR="/var/www/offerblast"
RETENTION_DAYS=7

# Ensure backup directory exists with secure permissions (read/write only by owner)
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

echo "================================================================="
echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] 🚀 Starting Database Backup..."

# 1. Parse DATABASE_URL from .env if present
ENV_FILE="$APP_DIR/.env"
if [ -f "$ENV_FILE" ]; then
    # Extract DATABASE_URL
    RAW_DB_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n 1 | cut -d '=' -f2- | tr -d '"' | tr -d "'")
fi

BACKUP_FILE="$BACKUP_DIR/oneample_backup_${TIMESTAMP}.sql.gz"

if [ -n "$RAW_DB_URL" ] && [[ "$RAW_DB_URL" == postgres* ]]; then
    echo "📦 Connecting using DATABASE_URL configuration..."
    pg_dump "$RAW_DB_URL" | gzip -9 > "$BACKUP_FILE"
else
    # Fallback default local PostgreSQL credentials for Hostinger VPS setup
    DB_NAME="${DB_NAME:-offerblast}"
    DB_USER="${DB_USER:-offeruser}"
    echo "📦 Connecting using local database parameters: $DB_NAME ($DB_USER)..."
    sudo -u postgres pg_dump "$DB_NAME" | gzip -9 > "$BACKUP_FILE"
fi

# 2. Verify backup creation and file size
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    chmod 600 "$BACKUP_FILE"
    echo "✅ Backup successfully created!"
    echo "   File: $BACKUP_FILE"
    echo "   Size: $FILE_SIZE"
else
    echo "❌ ERROR: Backup file was not created or is empty!"
    exit 1
fi

# 3. Clean up backups older than RETENTION_DAYS (7 days retention)
echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
DELETED_COUNT=$(find "$BACKUP_DIR" -type f -name "oneample_backup_*.sql.gz" -mtime +"$RETENTION_DAYS" | wc -l)
find "$BACKUP_DIR" -type f -name "oneample_backup_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
echo "   Removed $DELETED_COUNT expired backup archive(s)."

TOTAL_BACKUPS=$(find "$BACKUP_DIR" -type f -name "oneample_backup_*.sql.gz" | wc -l)
echo "📁 Total active backups retained in $BACKUP_DIR: $TOTAL_BACKUPS"
echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] 🎉 Backup routine completed successfully."
echo "================================================================="

