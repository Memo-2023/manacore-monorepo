#!/bin/bash
# Mana Intra-Day Database Backup — schließt die RPO-Lücke des nächtlichen
# `backup-databases.sh` (das nur 1×/Tag um 03:00 läuft → bis zu 24 h
# Datenverlust). Läuft alle 6 h und legt DATETIME-gestempelte, lokale
# Dumps ALLER Postgres-DBs unter `intraday/` ab. RPO damit ~6 h.
#
# BEWUSST ISOLIERT vom Daily:
# - eigenes Verzeichnis `intraday/` (rührt daily/weekly NIE an)
# - eigene 48-h-Retention (rotiert nur intraday/)
# - LOKAL-only: KEIN Off-Site, KEINE MinIO-Objekte (das macht der Daily —
#   stündliche GB-Transfers wären zu schwer). Intra-Day ist die schnelle
#   lokale Recovery-Quelle gegen Bedienfehler/Bad-Deploys; der Daily bleibt
#   die vollständige Disaster-Recovery-Quelle (off-site + Objekte).
# - Telegram-Notify NUR bei Fehler (4×/Tag-Erfolg würde spammen).
#
# Ein Bug hier kann das bewährte Daily-Backup NICHT beschädigen.
#
# WARTUNG: `db_user_for_container()` ist eine Kopie aus
# `backup-databases.sh` — bei neuem `<app>-postgres`-Container DORT und HIER
# nachziehen.
#
# Run via LaunchD alle 6 h (com.mana.backup-intraday).

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="/Volumes/ManaData/backups/postgres"
INTRADAY_DIR="$BACKUP_DIR/intraday"
LOG_FILE="/tmp/mana-backup-intraday.log"
STAMP=$(date +%Y-%m-%d_%H%M)
RETENTION_MINUTES=2880  # 48 h

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

# Telegram-Config (gleiche Quelle wie der Daily)
if [ -f "$PROJECT_ROOT/.env.notifications" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.env.notifications"
fi
send_notification() {
    local message="$1"
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" -d "text=${message}" -d "parse_mode=HTML" \
            >/dev/null 2>&1 || true
    fi
}

# KOPIE aus backup-databases.sh — bei Änderung dort hier nachziehen.
db_user_for_container() {
    case "$1" in
        wordeck-postgres)          echo "wordeck" ;;
        manaspur-postgres)         echo "manaspur" ;;
        nutriphi-postgres)         echo "nutriphi" ;;
        zitare-postgres)           echo "zitare" ;;
        chorportal-prod-postgres)  echo "chorportal" ;;
        seepuls-postgres)          echo "seepuls" ;;
        manameme-postgres)         echo "manameme" ;;
        moodlit-postgres)          echo "moodlit" ;;
        herbatrium-postgres)       echo "herbatrium" ;;
        pageta-postgres)           echo "pageta" ;;
        uload-postgres)            echo "uload" ;;
        comicello-postgres)        echo "comicello" ;;
        kreisel-postgres)          echo "kreisel" ;;
        mukke-postgres)            echo "mukke" ;;
        viadocu-postgres)          echo "viadocu" ;;
        mana-infra-postgres)       echo "postgres" ;;
        *)                         echo "postgres" ;;
    esac
}

mkdir -p "$INTRADAY_DIR"
log "=== Mana Intra-Day Backup ($STAMP) ==="

CONTAINERS=$(docker ps --format '{{.Names}}' | grep -E 'postgres$|-postgres$' | grep -vE 'exporter|^mana-infra-postgres-backup$')
if [ -z "$CONTAINERS" ]; then
    log "ERROR: no postgres container found"
    send_notification "🚨 <b>Intra-Day-Backup Failed</b>%0ANo postgres container running"
    exit 1
fi

BACKUP_COUNT=0
FAILED_DBS=""

# Globals (Rollen/Passwörter/Grants) — ohne die ist ein Restore der
# per-DB-Dumps nicht lauffähig (FATAL: role does not exist).
if docker exec mana-infra-postgres pg_dumpall -U postgres --globals-only 2>/dev/null \
    | gzip > "$INTRADAY_DIR/mana-infra-postgres_GLOBALS_${STAMP}.sql.gz"; then
    log "  OK: mana-infra-postgres GLOBALS"
else
    log "  FAILED: globals-Dump"
    FAILED_DBS="$FAILED_DBS mana-infra-postgres:globals"
    rm -f "$INTRADAY_DIR/mana-infra-postgres_GLOBALS_${STAMP}.sql.gz"
fi

for CONTAINER in $CONTAINERS; do
    USER=$(db_user_for_container "$CONTAINER")
    if ! DB_LIST=$(docker exec "$CONTAINER" psql -U "$USER" -d template1 -t -c "SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres';" 2>/dev/null | tr -d ' ' | grep -v "^$"); then
        log "  FAILED to list databases in $CONTAINER (user $USER) — skipping"
        FAILED_DBS="$FAILED_DBS ${CONTAINER}:list"
        continue
    fi
    for DB in $DB_LIST; do
        BACKUP_FILE="$INTRADAY_DIR/${CONTAINER}_${DB}_${STAMP}.sql.gz"
        if docker exec "$CONTAINER" pg_dump -U "$USER" "$DB" 2>/dev/null | gzip > "$BACKUP_FILE"; then
            BACKUP_COUNT=$((BACKUP_COUNT + 1))
        else
            log "  FAILED: ${CONTAINER}/${DB}"
            FAILED_DBS="$FAILED_DBS ${CONTAINER}:${DB}"
            rm -f "$BACKUP_FILE"
        fi
    done
done

# Retention: nur intraday/ rotieren (48 h)
find "$INTRADAY_DIR" -name "*.sql.gz" -mmin +"$RETENTION_MINUTES" -delete 2>/dev/null || true

if [ -n "$FAILED_DBS" ]; then
    log "Intra-Day FAILED:$FAILED_DBS (ok: $BACKUP_COUNT)"
    send_notification "⚠️ <b>Intra-Day-Backup teilweise fehlgeschlagen</b>%0AFailed:$FAILED_DBS%0AOK: $BACKUP_COUNT DBs"
    exit 1
fi
log "Intra-Day OK: $BACKUP_COUNT DBs + GLOBALS"
