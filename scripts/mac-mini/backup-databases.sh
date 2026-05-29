#!/bin/bash
# Mana Database Backup Script
# Creates daily backups of all PostgreSQL databases with rotation.
#
# Retention policy:
# - Daily backups: keep last 7 days
# - Weekly backups: keep last 4 weeks (Sundays)
#
# Covers ALL postgres-Container that match `*postgres*` (ohne exporter
# /backup). Pro Container werden alle Datenbanken (außer Templates +
# `postgres`) gedumpt. Dump-Datei-Pattern:
#   ${CONTAINER}_${DB}_${DATE}.sql.gz
# damit Cards-und-Manaspur-DBs mit gleichem Schema-Namen nicht
# überschreiben.
#
# Container-spezifischer DB-User: per-Container ENV-Override
#   BACKUP_USER_<CONTAINER_UPPER>=username (Default: postgres)
# z.B. BACKUP_USER_CARDS_POSTGRES=cards (Cards-Container heißt
# cards-postgres → cards-User).
#
# Run via LaunchD daily at 3 AM.

# NOTE: bewusst KEIN `set -e` global — wir wollen, dass ein Fehler
# in einem Container nicht den Rest abbricht. Failures werden via
# `FAILED_DBS` gesammelt und am Ende reported.

# Ensure PATH includes docker
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="/Volumes/ManaData/backups/postgres"
LOG_FILE="/tmp/mana-backup.log"
DATE=$(date +%Y-%m-%d)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday

# ─── Off-Site-/Zweitkopie auf die GPU-Box (LAN) ─────────────────────────
# Spiegelt die heutigen Dumps verschlüsselt (AES-256 via openssl) auf die
# GPU-Box. Das ist eine ZWEITKOPIE auf einer zweiten Maschine/Disk
# (schützt gegen Mac-Mini-Disk-/Hardware-Ausfall) — KEIN echtes Off-Site
# (gleicher Standort/Strom/LAN). Echtes Off-Site (Cloud) bleibt Phase 2.
# Non-blocking: ein Push-Fehler kippt NIE das lokale Backup, nur Notify.
OFFSITE_ENABLE="${OFFSITE_ENABLE:-1}"
OFFSITE_HOST="${OFFSITE_HOST:-tills@192.168.178.11}"
# Zielordner auf der GPU-Box. Beim Anschluss der externen SSD nur diese
# Zeile auf den SSD-Pfad umbiegen (z.B. D:/ManaData/backups/postgres).
OFFSITE_DIR="${OFFSITE_DIR:-C:/mana/backups/postgres}"
OFFSITE_ENCRYPT="${OFFSITE_ENCRYPT:-1}"
OFFSITE_PASSFILE="${OFFSITE_PASSFILE:-/Users/mana/.config/mana-backup-offsite.pass}"

# Spiegelt $BACKUP_DIR/daily/*_${DATE}.sql.gz auf die GPU-Box. Immer
# `return 0` — das lokale Backup darf hieran nie scheitern.
offsite_mirror() {
    [ "$OFFSITE_ENABLE" = "1" ] || { log "Off-Site: deaktiviert (OFFSITE_ENABLE=0)"; return 0; }

    local today_files
    today_files=$(ls "$BACKUP_DIR/daily/"*"_${DATE}.sql.gz" 2>/dev/null || true)
    if [ -z "$today_files" ]; then
        log "Off-Site: keine heutigen Dumps gefunden — übersprungen"
        return 0
    fi

    # Box evtl. aus / Key (noch) nicht autorisiert → sauber überspringen
    if ! ssh -o BatchMode=yes -o ConnectTimeout=8 "$OFFSITE_HOST" "exit" >/dev/null 2>&1; then
        log "Off-Site: GPU-Box ($OFFSITE_HOST) nicht erreichbar/autorisiert — übersprungen (lokales Backup ist sicher)"
        send_notification "ℹ️ Off-Site-Spiegelung übersprungen: GPU-Box nicht erreichbar" "default"
        return 0
    fi

    # Verschlüsselung gewünscht, aber Passfile fehlt → lieber unverschlüsselt
    # spiegeln als gar nicht, aber laut warnen.
    local encrypt="$OFFSITE_ENCRYPT"
    if [ "$encrypt" = "1" ] && [ ! -f "$OFFSITE_PASSFILE" ]; then
        log "Off-Site: WARNUNG — Passfile $OFFSITE_PASSFILE fehlt, spiegele UNVERSCHLÜSSELT"
        send_notification "⚠️ Off-Site-Passfile fehlt — Spiegelung unverschlüsselt" "high"
        encrypt=0
    fi

    local staging="" pushed=0 failed=0 f base
    [ "$encrypt" = "1" ] && staging=$(mktemp -d)

    for f in $today_files; do
        base=$(basename "$f")
        if [ "$encrypt" = "1" ]; then
            if openssl enc -aes-256-cbc -salt -pbkdf2 -in "$f" -out "$staging/$base.enc" -pass "file:$OFFSITE_PASSFILE" 2>/dev/null \
                && scp -q -o BatchMode=yes -o ConnectTimeout=30 "$staging/$base.enc" "$OFFSITE_HOST:$OFFSITE_DIR/$base.enc" >/dev/null 2>&1; then
                pushed=$((pushed + 1))
            else
                failed=$((failed + 1))
            fi
        else
            if scp -q -o BatchMode=yes -o ConnectTimeout=30 "$f" "$OFFSITE_HOST:$OFFSITE_DIR/$base" >/dev/null 2>&1; then
                pushed=$((pushed + 1))
            else
                failed=$((failed + 1))
            fi
        fi
    done
    [ -n "$staging" ] && rm -rf "$staging"

    if [ "$failed" -eq 0 ]; then
        log "Off-Site: $pushed Dump(s) auf GPU-Box gespiegelt ($OFFSITE_DIR, encrypt=$encrypt)"
    else
        log "Off-Site: $pushed ok, $failed FEHLGESCHLAGEN beim Push auf GPU-Box"
        send_notification "⚠️ Off-Site-Spiegelung: $failed Dump(s) nicht auf GPU-Box gepusht" "high"
    fi
    return 0
}

# .env.macmini ist im DOTENV-Format (Werte enthalten Spaces, BEGIN/END-
# Marker etc.) — kann nicht via `source` in bash geladen werden. Wir
# brauchen aus diesem File auch nichts; Telegram-Tokens kommen aus
# .env.notifications separat.

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Load notification config if exists
if [ -f "$PROJECT_ROOT/.env.notifications" ]; then
    source "$PROJECT_ROOT/.env.notifications"
fi

send_notification() {
    local message="$1"
    local priority="${2:-default}"

    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=${message}" \
            -d "parse_mode=HTML" \
            >/dev/null 2>&1 || true
    fi
}

# Default-DB-User pro Container. Greenfield-Apps (cards, manaspur,
# nutriphi, zitare) nutzen den App-eigenen User; mana-infra-postgres
# läuft als `postgres`-Superuser.
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

# Create backup directories
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"

log "=== Mana Database Backup ==="

# Alle Postgres-Container finden (heuristic: name endet auf `postgres`
# oder enthält `-postgres`; ignoriere exporter/backup-Varianten).
CONTAINERS=$(docker ps --format '{{.Names}}' | grep -E 'postgres$|-postgres$' | grep -vE 'exporter|^mana-infra-postgres-backup$')

if [ -z "$CONTAINERS" ]; then
    log "ERROR: no postgres container found"
    send_notification "🚨 <b>Backup Failed</b>\n\nNo postgres container running" "high"
    exit 1
fi

log "Containers: $(echo $CONTAINERS | tr '\n' ' ')"

BACKUP_COUNT=0
BACKUP_SIZE=0
FAILED_DBS=""

for CONTAINER in $CONTAINERS; do
    USER=$(db_user_for_container "$CONTAINER")
    log "--- Container: $CONTAINER (user: $USER) ---"

    # DB-Liste in diesem Container
    if ! DB_LIST=$(docker exec "$CONTAINER" psql -U "$USER" -d template1 -t -c "SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres';" 2>/dev/null | tr -d ' ' | grep -v "^$"); then
        log "  FAILED to list databases in $CONTAINER (user $USER) — skipping"
        FAILED_DBS="$FAILED_DBS ${CONTAINER}:list"
        continue
    fi

    for DB in $DB_LIST; do
        BACKUP_FILE="$BACKUP_DIR/daily/${CONTAINER}_${DB}_${DATE}.sql.gz"
        if docker exec "$CONTAINER" pg_dump -U "$USER" "$DB" 2>/dev/null | gzip > "$BACKUP_FILE"; then
            SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
            log "  OK: ${CONTAINER}/${DB} ($SIZE)"
            BACKUP_COUNT=$((BACKUP_COUNT + 1))
            BACKUP_SIZE=$((BACKUP_SIZE + $(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)))
        else
            log "  FAILED: ${CONTAINER}/${DB}"
            FAILED_DBS="$FAILED_DBS ${CONTAINER}:${DB}"
            rm -f "$BACKUP_FILE"
        fi
    done
done

# On Sunday, create weekly backup (Sonntag = 7 in date +%u)
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    log "Creating weekly backup (Sunday)..."
    WEEKLY_DIR="$BACKUP_DIR/weekly/$DATE"
    mkdir -p "$WEEKLY_DIR"
    # Alle daily-Dumps für heute kopieren (Pattern enthält jetzt CONTAINER
    # vorne, deshalb `*_${DATE}.sql.gz` greift weiterhin).
    cp "$BACKUP_DIR/daily/"*"_${DATE}.sql.gz" "$WEEKLY_DIR/" 2>/dev/null || true
    log "Weekly backup created in $WEEKLY_DIR"
fi

# Rotate daily backups (keep last 7 days)
log "Rotating daily backups (keeping 7 days)..."
find "$BACKUP_DIR/daily" -name "*.sql.gz" -mtime +7 -delete 2>/dev/null || true

# Rotate weekly backups (keep last 4 weeks)
log "Rotating weekly backups (keeping 4 weeks)..."
find "$BACKUP_DIR/weekly" -mindepth 1 -maxdepth 1 -type d -mtime +28 -exec rm -rf {} \; 2>/dev/null || true

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | awk '{print $1}')

log "=== Backup Summary ==="
log "Databases backed up: $BACKUP_COUNT"
log "Total backup size: $TOTAL_SIZE"

# ─── Objekt-Speicher (MinIO) mitsichern ─────────────────────────────────
# Läuft im selben nächtlichen (FDA-fähigen) Kontext wie die DB-Dumps.
# Non-blocking: ein Objekt-Backup-Fehler kippt den DB-Backup-Status nicht.
if [ -x "$SCRIPT_DIR/backup-objects.sh" ]; then
    "$SCRIPT_DIR/backup-objects.sh" || log "Objekt-Backup meldete Fehler (siehe oben)"
else
    log "WARN: backup-objects.sh fehlt/nicht ausführbar — MinIO-Objekte NICHT gesichert"
fi

if [ -n "$FAILED_DBS" ]; then
    log "FAILED databases:$FAILED_DBS"
    send_notification "⚠️ <b>Backup Partially Failed</b>\n\nFailed:$FAILED_DBS\nSuccessful: $BACKUP_COUNT databases" "high"
    exit 1
else
    log "All backups successful!"
    # Zweitkopie auf die GPU-Box spiegeln (non-blocking)
    offsite_mirror
    # Only send notification on Sundays (weekly summary)
    if [ "$DAY_OF_WEEK" -eq 7 ]; then
        send_notification "💾 <b>Weekly Backup Complete</b>\n\n$BACKUP_COUNT databases backed up\nTotal size: $TOTAL_SIZE"
    fi
fi
