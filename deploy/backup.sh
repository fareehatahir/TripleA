#!/usr/bin/env bash
# Daily database backup + weekly photo backup, keeping 14 days. Add to cron (see README → Backups).
#   Docker:  MODE=docker  ./deploy/backup.sh
#   Bare:    DATABASE_URL=postgresql://… UPLOAD_DIR=/var/lib/tripleaint/uploads ./deploy/backup.sh
set -euo pipefail
DEST="${BACKUP_DIR:-/var/backups/tripleaint}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M)"
mkdir -p "$DEST"

if [ "${MODE:-}" = "docker" ]; then
  docker compose exec -T db pg_dump -U "${POSTGRES_USER:-tripleaint}" -d "${POSTGRES_DB:-tripleaint}" --no-owner | gzip > "$DEST/db-$STAMP.sql.gz"
else
  : "${DATABASE_URL:?set DATABASE_URL}"
  pg_dump "$DATABASE_URL" --no-owner | gzip > "$DEST/db-$STAMP.sql.gz"
fi
echo "database -> $DEST/db-$STAMP.sql.gz"

# Photos change rarely: back them up on Sundays
if [ "$(date +%u)" = "7" ]; then
  if [ "${MODE:-}" = "docker" ]; then
    docker run --rm -v tripleaint_uploads:/data:ro -v "$DEST":/backup alpine tar czf "/backup/uploads-$STAMP.tar.gz" -C /data .
  else
    tar czf "$DEST/uploads-$STAMP.tar.gz" -C "${UPLOAD_DIR:?set UPLOAD_DIR}" .
  fi
  echo "photos   -> $DEST/uploads-$STAMP.tar.gz"
fi

find "$DEST" -type f \( -name 'db-*.sql.gz' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete
