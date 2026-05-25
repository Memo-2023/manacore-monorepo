#!/bin/bash
# Mana Container Health Enforcer
# Ensures all containers are actually running and healthy
#
# This script detects containers that are:
# - Stuck in "Created" or "Exited" status -> starts them
# - Crash-looping in "Restarting" status -> recreates them
#
# Run via LaunchD every 5 minutes or after system startup.

set -e

# Ensure PATH includes docker
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.macmini.yml"
LOG_FILE="/tmp/mana-container-health.log"
RESTART_TRACKER="/tmp/mana-restart-tracker"

# Container names that legitimately exit after a one-shot job completes.
# These are NOT broken when in "exited" state — skip them entirely instead
# of trying to "recover" them every 5 minutes (which both spams the log
# and would actually re-run the init job needlessly).
ONESHOT_INIT_CONTAINERS=(
    mana-infra-minio-init
)

is_oneshot_init() {
    local name="$1"
    for c in "${ONESHOT_INIT_CONTAINERS[@]}"; do
        [ "$c" = "$name" ] && return 0
    done
    return 1
}

# Load notification config if exists
if [ -f "$PROJECT_ROOT/.env.notifications" ]; then
    source "$PROJECT_ROOT/.env.notifications"
fi

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

send_notification() {
    local message="$1"
    local priority="${2:-default}"

    # Telegram
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=${message}" \
            -d "parse_mode=HTML" \
            >/dev/null 2>&1 || true
    fi

    # ntfy
    if [ -n "$NTFY_TOPIC" ]; then
        curl -s -d "$message" \
            -H "Title: Mana Container Health" \
            -H "Priority: $priority" \
            -H "Tags: white_check_mark" \
            "https://ntfy.sh/$NTFY_TOPIC" >/dev/null 2>&1 || true
    fi
}

# --- colima-VM-Liveness-Guard ---------------------------------------------
# Wenn die colima-VM im laufenden Betrieb stirbt (Crash/OOM), bringt sonst
# nichts sie zurueck — startup.sh laeuft nur beim Boot. Dieser Guard heilt
# einen Mid-Run-Crash. Schutz vor ungewollten Starts in bewussten Wartungs-/
# Debug-Stopps (colima restart/stop gegen die egress-/ssh-mux-Bugs): das
# Lock-File pausiert den Guard. Backoff verhindert Endlos-Haemmern, wenn
# colima nicht hochkommt (z.B. stale in_use_by-Symlink auf der ManaData-Disk).
COLIMA_MAINT_LOCK="/tmp/mana-colima-maintenance"   # `touch` = Guard pausiert
COLIMA_FAIL_TRACKER="/tmp/mana-colima-start-fails"
COLIMA_MAX_FAILS=3

if ! colima status >/dev/null 2>&1; then
    if [ -f "$COLIMA_MAINT_LOCK" ]; then
        log "colima-Guard: VM down, aber Wartungs-Lock aktiv ($COLIMA_MAINT_LOCK) — kein Auto-Start"
        exit 0
    fi
    FAILS=$(cat "$COLIMA_FAIL_TRACKER" 2>/dev/null || echo 0)
    case "$FAILS" in '' | *[!0-9]*) FAILS=0 ;; esac
    if [ "$FAILS" -ge "$COLIMA_MAX_FAILS" ]; then
        log "colima-Guard: VM down + bereits $FAILS Fehlstarts — KEIN weiterer Auto-Start, manueller Eingriff noetig (z.B. in_use_by-Symlink loeschen, dann '$COLIMA_FAIL_TRACKER' entfernen)"
        send_notification "colima-VM down + $FAILS Fehlstarts auf mana-server — manueller Eingriff noetig" "urgent"
        exit 1
    fi
    log "colima-Guard: VM ist DOWN — starte colima (Versuch $((FAILS + 1))/$COLIMA_MAX_FAILS)"
    if colima start >/dev/null 2>&1; then
        log "colima-Guard: colima start erfolgreich — VM wieder oben"
        send_notification "colima-VM war down, automatisch neu gestartet (mana-server)" "high"
        rm -f "$COLIMA_FAIL_TRACKER"
    else
        echo $((FAILS + 1)) > "$COLIMA_FAIL_TRACKER"
        log "colima-Guard: colima start FEHLGESCHLAGEN (Fehlstart $((FAILS + 1))/$COLIMA_MAX_FAILS)"
        exit 1
    fi
else
    # VM laeuft normal — Fehlerzaehler zuruecksetzen
    rm -f "$COLIMA_FAIL_TRACKER" 2>/dev/null || true
fi
# --- Ende colima-Guard ----------------------------------------------------

# Check if docker is running
if ! docker info >/dev/null 2>&1; then
    log "ERROR: Docker is not running"
    exit 1
fi

# Get containers that are NOT running (Created, Exited), excluding one-shot
# init containers that are *expected* to be in "exited" state.
ALL_STUCK=$(docker ps -a --filter "status=created" --filter "status=exited" --format "{{.Names}}" | grep "^mana-" || true)
STUCK_CONTAINERS=""
for c in $ALL_STUCK; do
    if is_oneshot_init "$c"; then
        continue
    fi
    STUCK_CONTAINERS="${STUCK_CONTAINERS:+$STUCK_CONTAINERS$'\n'}$c"
done

# Get containers that are crash-looping (Restarting)
CRASHLOOP_CONTAINERS=$(docker ps -a --filter "status=restarting" --format "{{.Names}}" | grep "^mana-" || true)

# Track restart attempts to avoid infinite loops
track_restart() {
    local container="$1"
    local count_file="$RESTART_TRACKER/$container"
    mkdir -p "$RESTART_TRACKER"

    if [ -f "$count_file" ]; then
        local count=$(cat "$count_file")
        local age=$(( $(date +%s) - $(stat -f %m "$count_file" 2>/dev/null || stat -c %Y "$count_file" 2>/dev/null) ))
        # Reset counter if more than 1 hour old
        if [ "$age" -gt 3600 ]; then
            echo "1" > "$count_file"
            echo "1"
        else
            count=$((count + 1))
            echo "$count" > "$count_file"
            echo "$count"
        fi
    else
        echo "1" > "$count_file"
        echo "1"
    fi
}

if [ -z "$STUCK_CONTAINERS" ] && [ -z "$CRASHLOOP_CONTAINERS" ]; then
    log "OK: All containers are running"
    exit 0
fi

# Handle crash-looping containers first (more critical)
if [ -n "$CRASHLOOP_CONTAINERS" ]; then
    log "WARNING: Found crash-looping containers:"
    for container in $CRASHLOOP_CONTAINERS; do
        RESTART_COUNT=$(docker inspect "$container" --format '{{.RestartCount}}' 2>/dev/null || echo "0")
        log "  - $container (restart count: $RESTART_COUNT)"
    done

    log "Attempting to recover crash-looping containers..."
    for container in $CRASHLOOP_CONTAINERS; do
        ATTEMPTS=$(track_restart "$container")

        if [ "$ATTEMPTS" -gt 3 ]; then
            log "  SKIP: $container has been restarted $ATTEMPTS times in the last hour, needs manual intervention"
            send_notification "🚨 <b>Container needs manual fix</b>\n\n$container has crashed $ATTEMPTS times. Check logs:\n<code>docker logs $container</code>" "high"
            continue
        fi

        log "  Recreating $container (attempt $ATTEMPTS/3)..."
        # Stop, remove and recreate the container
        docker stop "$container" 2>/dev/null || true
        docker rm "$container" 2>/dev/null || true
    done
fi

# Handle stuck containers (Created/Exited)
if [ -n "$STUCK_CONTAINERS" ]; then
    log "WARNING: Found containers not running:"
    for container in $STUCK_CONTAINERS; do
        STATUS=$(docker inspect "$container" --format '{{.State.Status}}' 2>/dev/null || echo "unknown")
        log "  - $container (status: $STATUS)"
    done
fi

# Combine all containers that need to be started
ALL_PROBLEM_CONTAINERS=$(echo -e "$STUCK_CONTAINERS\n$CRASHLOOP_CONTAINERS" | grep -v "^$" | sort -u || true)

if [ -z "$ALL_PROBLEM_CONTAINERS" ]; then
    log "OK: No containers need recovery"
    exit 0
fi

log "Starting containers via docker compose..."

cd "$PROJECT_ROOT"

# Use docker compose up for the specific services
# This ensures dependencies are respected
for container in $ALL_PROBLEM_CONTAINERS; do
    # Extract service name from container name (remove mana-app- or mana-* prefix)
    # Container naming: mana-{category}-{service} or mana-app-{service}-{type}
    SERVICE_NAME=""

    case "$container" in
        mana-app-todo-web) SERVICE_NAME="todo-web" ;;
        mana-app-todo-backend) SERVICE_NAME="todo-backend" ;;
        mana-app-chat-web) SERVICE_NAME="chat-web" ;;
        mana-app-chat-backend) SERVICE_NAME="chat-backend" ;;
        mana-app-calendar-web) SERVICE_NAME="calendar-web" ;;
        mana-app-calendar-backend) SERVICE_NAME="calendar-backend" ;;
        mana-app-clock-web) SERVICE_NAME="clock-web" ;;
        mana-app-contacts-web) SERVICE_NAME="contacts-web" ;;
        mana-app-contacts-backend) SERVICE_NAME="contacts-backend" ;;
        mana-app-storage-web) SERVICE_NAME="storage-web" ;;
        mana-app-storage-backend) SERVICE_NAME="storage-backend" ;;
        mana-app-presi-web) SERVICE_NAME="presi-web" ;;
        mana-app-food-web) SERVICE_NAME="food-web" ;;
        mana-app-food-backend) SERVICE_NAME="food-backend" ;;
        mana-app-skilltree-web) SERVICE_NAME="skilltree-web" ;;
        # mana-app-skilltree-backend: REMOVED
        mana-app-photos-web) SERVICE_NAME="photos-web" ;;
        # mana-app-photos-backend: REMOVED
        mana-app-web) SERVICE_NAME="mana-web" ;;
        mana-auth) SERVICE_NAME="mana-auth" ;;
        mana-core-gateway) SERVICE_NAME="api-gateway" ;;
        mana-core-search) SERVICE_NAME="mana-search" ;;
        mana-core-searxng) SERVICE_NAME="searxng" ;;
        mana-core-media) SERVICE_NAME="mana-media" ;;
        mana-infra-postgres) SERVICE_NAME="postgres" ;;
        mana-infra-redis) SERVICE_NAME="redis" ;;
        mana-infra-minio) SERVICE_NAME="minio" ;;
        mana-mon-*) SERVICE_NAME="${container#mana-mon-}" ;;
        mana-auto-*) SERVICE_NAME="${container#mana-auto-}" ;;
        mana-service-*) SERVICE_NAME="${container#mana-service-}" ;;
        mana-app-llm-playground) SERVICE_NAME="llm-playground" ;;
        *)
            log "  Unknown container pattern: $container, trying direct start"
            docker start "$container" 2>&1 || true
            continue
            ;;
    esac

    if [ -n "$SERVICE_NAME" ]; then
        log "  Starting service: $SERVICE_NAME"
        # NOTE: do NOT pass --env-file here. docker compose auto-loads .env
        # from $PROJECT_ROOT, which is what every other compose invocation
        # in this repo relies on (build-app.sh, deploy.sh, manual ops). The
        # previous --env-file pointed at .env.macmini which never existed
        # on the server, so recoveries silently created containers with
        # blank secrets — that's how mana-auth ended up in a crash loop
        # with empty MANA_AUTH_KEK on 2026-04-08.
        (cd "$PROJECT_ROOT" && docker compose -f "$COMPOSE_FILE" up -d "$SERVICE_NAME") 2>&1 | tee -a "$LOG_FILE" || {
            log "  WARNING: Failed to start $SERVICE_NAME via compose, trying direct start"
            docker start "$container" 2>&1 || true
        }
    fi
done

# Wait for containers to start
sleep 10

# Verify containers are now running (check for created, exited, AND restarting)
ALL_STILL_STUCK=$(docker ps -a --filter "status=created" --filter "status=exited" --format "{{.Names}}" | grep "^mana-" || true)
STILL_STUCK=""
for c in $ALL_STILL_STUCK; do
    if is_oneshot_init "$c"; then
        continue
    fi
    STILL_STUCK="${STILL_STUCK:+$STILL_STUCK$'\n'}$c"
done
STILL_CRASHING=$(docker ps -a --filter "status=restarting" --format "{{.Names}}" | grep "^mana-" || true)
ALL_STILL_BROKEN=$(echo -e "$STILL_STUCK\n$STILL_CRASHING" | grep -v "^$" | sort -u || true)

if [ -z "$ALL_STILL_BROKEN" ]; then
    FIXED_MSG="Auto-fixed containers: $(echo $ALL_PROBLEM_CONTAINERS | tr '\n' ', ')"
    log "SUCCESS: $FIXED_MSG"
    send_notification "🔧 <b>Mana Auto-Recovery</b>\n\n$FIXED_MSG"
else
    log "ERROR: Some containers still have issues:"
    for container in $ALL_STILL_BROKEN; do
        STATUS=$(docker inspect "$container" --format '{{.State.Status}}' 2>/dev/null || echo "unknown")
        log "  - $container (status: $STATUS)"
    done
    send_notification "⚠️ <b>Mana Container Issue</b>\n\nContainers still broken: $(echo $ALL_STILL_BROKEN | tr '\n' ', ')" "high"
    exit 1
fi
