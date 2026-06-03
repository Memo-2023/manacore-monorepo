#!/bin/bash
# Mana Object-Storage Backup Script
# Sichert die Daten ALLER MinIO-Container (hochgeladene Dateien: Audio, PDF,
# Bilder, …) — das Gegenstück zu backup-databases.sh, das nur Postgres dumpt.
#
# Zwei Verfahren, größen-gated (CAP_MB), damit beides skaliert:
#   • Store ≤ CAP_MB  → gzip-Tar mit Rotation 7 daily / 4 weekly (Point-in-time,
#                       identisch zum pg-Dump-Schema). Für die kleinen App-Stores.
#   • Store >  CAP_MB → inkrementeller `mc mirror` in einen persistenten Spiegel
#                       (kein tägliches Voll-Kopieren). Für den großen mana-infra-Store.
#
# Beides läuft ohne externen mc-Client/Netzwerk-Namen:
#   - Tar:    transienter Alpine via `--volumes-from` (bind & named volume ok).
#   - Mirror: transienter `minio/mc` via `--network container:<minio>` (spricht
#             127.0.0.1:9000 im Namespace des MinIO), Creds aus Container-ENV.
#
# Restore:
#   - Tar:    Tarball in /data einer (gestoppten/leeren) MinIO entpacken:
#               docker run --rm --volumes-from <minio> -i alpine \
#                 sh -c 'cd /data && tar xzf -' < <container>_<date>.tar.gz
#   - Mirror: `mc mirror <mirror-dir> <ziel-alias>` zurück in eine frische MinIO.
#
# Hinweis: Backup-Ziel liegt auf /Volumes/ManaData (gleiche Disk wie die Quelle)
# — schützt gegen versehentliches Löschen/Korruption, NICHT gegen Disk-Verlust.
# Echtes Off-Site (GPU-Box/Cloud) gilt für pg UND Objekte gleichermaßen und
# bleibt Phase 2 (siehe BACKUP_STRATEGY.md).
#
# Wird am Ende von backup-databases.sh aufgerufen (gleicher nächtlicher FDA-
# fähiger LaunchD-Lauf), ist aber auch standalone lauffähig.

export PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="/Volumes/ManaData/backups/minio"
LOG_FILE="/tmp/mana-backup.log"
DATE=$(date +%Y-%m-%d)
DAY_OF_WEEK=$(date +%u)
CAP_MB="${OBJECT_BACKUP_CAP_MB:-2048}"  # ≤ → Tar+Rotation, > → mc mirror

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [objects] $1" | tee -a "$LOG_FILE"; }

if [ -f "$PROJECT_ROOT/.env.notifications" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.env.notifications"
fi
send_notification() {
    [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ] && \
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" -d "text=$1" -d "parse_mode=HTML" >/dev/null 2>&1 || true
}

# Liest MinIO-Root-Creds aus der Container-ENV (direkt oder via *_FILE-Secret).
minio_cred() {  # $1=container  $2=VARBASE (MINIO_ROOT_USER|MINIO_ROOT_PASSWORD)
    local c="$1" base="$2" v
    v=$(docker exec "$c" printenv "$base" 2>/dev/null)
    if [ -z "$v" ]; then
        local f; f=$(docker exec "$c" printenv "${base}_FILE" 2>/dev/null)
        [ -n "$f" ] && v=$(docker exec "$c" cat "$f" 2>/dev/null)
    fi
    printf '%s' "$v"
}

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly" "$BACKUP_DIR/mirror"
log "=== Mana Object-Storage Backup (cap=${CAP_MB}MB) ==="

CONTAINERS=$(docker ps --format '{{.Names}}' | grep -E 'minio$|-minio$' | grep -vE 'console|exporter|backup')
if [ -z "$CONTAINERS" ]; then
    log "Keine MinIO-Container gefunden — nichts zu sichern."; exit 0
fi
log "Container: $(echo $CONTAINERS | tr '\n' ' ')"

OK_COUNT=0; FAILED=""
for CONTAINER in $CONTAINERS; do
    SIZE_MB=$(docker run --rm --volumes-from "$CONTAINER" alpine du -sm /data 2>/dev/null | awk '{print $1}')
    SIZE_MB=${SIZE_MB:-0}

    if [ "$SIZE_MB" -le "$CAP_MB" ]; then
        # ── Kleiner Store: gzip-Tar mit Rotation ──
        OUT="$BACKUP_DIR/daily/${CONTAINER}_${DATE}.tar.gz"
        if docker run --rm --volumes-from "$CONTAINER" alpine \
                tar cf - -C /data . 2>/dev/null | gzip > "$OUT" && [ -s "$OUT" ]; then
            log "  OK (tar): ${CONTAINER} ($(ls -lh "$OUT" | awk '{print $5}'), ${SIZE_MB}MB roh)"
            OK_COUNT=$((OK_COUNT + 1))
        else
            log "  FAILED (tar): ${CONTAINER}"; FAILED="$FAILED ${CONTAINER}"; rm -f "$OUT"
        fi
    else
        # ── Großer Store: inkrementeller mc mirror ──
        local_user=$(minio_cred "$CONTAINER" MINIO_ROOT_USER)
        local_pass=$(minio_cred "$CONTAINER" MINIO_ROOT_PASSWORD)
        if [ -z "$local_user" ] || [ -z "$local_pass" ]; then
            log "  FAILED (mirror): ${CONTAINER} — keine Root-Creds in ENV"; FAILED="$FAILED ${CONTAINER}"; continue
        fi
        # mc mirror legt das Ziel-Unterverzeichnis NICHT selbst an → mkdir vorweg.
        # --quiet unterdrückt Fortschritt; Fehler bleiben auf stderr (→ Log) sichtbar.
        if docker run --rm --network "container:${CONTAINER}" \
                -v "$BACKUP_DIR/mirror:/backup" \
                -e MC_U="$local_user" -e MC_P="$local_pass" \
                --entrypoint sh minio/mc -c '
                    mkdir -p "/backup/'"$CONTAINER"'" &&
                    mc alias set src http://127.0.0.1:9000 "$MC_U" "$MC_P" >/dev/null &&
                    mc mirror --overwrite --quiet src "/backup/'"$CONTAINER"'"
                '; then
            log "  OK (mirror): ${CONTAINER} (${SIZE_MB}MB inkrementell gespiegelt)"
            OK_COUNT=$((OK_COUNT + 1))
        else
            log "  FAILED (mirror): ${CONTAINER}"; FAILED="$FAILED ${CONTAINER}"
        fi
    fi
done

# Sonntag: Wochenkopie der getarrten (kleinen) Stores
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    WEEKLY_DIR="$BACKUP_DIR/weekly/$DATE"; mkdir -p "$WEEKLY_DIR"
    cp "$BACKUP_DIR/daily/"*"_${DATE}.tar.gz" "$WEEKLY_DIR/" 2>/dev/null || true
    log "Weekly object-backup in $WEEKLY_DIR"
fi
find "$BACKUP_DIR/daily" -name "*.tar.gz" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR/weekly" -mindepth 1 -maxdepth 1 -type d -mtime +28 -exec rm -rf {} \; 2>/dev/null || true

log "=== Object-Backup Summary: $OK_COUNT Store(s) OK, gesamt $(du -sh "$BACKUP_DIR" 2>/dev/null | awk '{print $1}') ==="
if [ -n "$FAILED" ]; then
    log "FAILED stores:$FAILED"
    send_notification "⚠️ <b>Object-Backup teilweise fehlgeschlagen</b>\n\nFailed:$FAILED\nOK: $OK_COUNT"
    exit 1
fi
exit 0
