#!/bin/bash
# Mana Container Health Enforcer
# Stellt sicher, dass Container, die laufen SOLLTEN, auch laufen.
#
# SICHERHEITS-LEITPRINZIP (nach dem Vorfall 2026-05-26): Recovery
# BESTEHENDER Container NUR via `docker start`/`docker restart` — das
# behaelt die bereits einkompilierte Container-Env. NIEMALS `docker rm`
# + `docker compose up` zur Recovery: viele Apps setzen Secrets per
# `${VAR}`-Interpolation aus der Deploy-Shell (nicht via env_file); der
# launchd-Watchdog hat diese Vars NICHT -> ein compose-up wuerde LEERE
# Secrets einkompilieren. Genau so wurde comicello-api (Postgres-PW +
# MANA_SERVICE_KEY) am 2026-05-26 zerlegt — und frueher mana-auth (KEK,
# 2026-04-08). Der fruehere Rewrite, der label-getrieben rm+compose-up
# machte, ist deshalb zurueckgenommen.
#
# Erkennt und heilt:
# - Exited/Created (restart always/unless-stopped) -> docker start
# - Crash-Loop (Restarting)                        -> docker restart (Backoff)
# - FEHLENDE mana-core-Container                    -> aus Core-Compose neu
#   erstellen. Sicher, weil mana-core seine Env via `env_file:` (+ co-
#   located .env) IM Compose-Verzeichnis traegt -> compose laedt sie
#   unabhaengig von der Shell. Ein KOMPLETT fehlender App-Container (${VAR}-
#   Interpolation) wird NICHT auto-neu-erstellt (Blank-Secret-Risiko) —
#   das braucht einen echten Re-Deploy; der Watchdog flaggt es nur.
#
# Bewusst gestoppte (restart=no, z.B. watchtower) + One-Shot-Init: nie
# anfassen. DRY_RUN=1 -> loggt nur, veraendert nichts.
#
# Run via LaunchD alle 5 Minuten oder nach Boot.

set -e

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="/tmp/mana-container-health.log"
RESTART_TRACKER="/tmp/mana-restart-tracker"
DRY_RUN="${DRY_RUN:-0}"

# mana-core (Plattform-Kern) — eigenes Compose-Projekt. Traegt seine Env via
# env_file (+ co-located .env) im Compose-Dir, daher ist compose-up vom
# Watchdog hier sicher. Pfad serverseitig.
MANA_CORE_PROJECT="mana-core"
MANA_CORE_COMPOSE="/Users/mana/projects/mana-platform/infrastructure/core/docker-compose.core.yml"

# Wartungs-Lock (geteilt mit dem colima-Guard): pausiert das Neu-Erstellen
# fehlender Core-Container, damit bewusste Stop/Debug-Sessions nicht
# unterlaufen werden.
MAINT_LOCK="/tmp/mana-colima-maintenance"

# Container, die nach einem One-Shot-Job legitim "exited" sind — NICHT heilen.
# (Zusaetzlich greift das Restart-Policy-Gate: One-Shots nutzen no/on-failure.)
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

# Nur Container mit Dauerlaeufer-Restart-Policy auto-(wieder-)starten. So
# fassen wir bewusst gestoppte (restart=no, z.B. watchtower) und One-Shot-
# Jobs nie an.
should_autostart() {
    local pol
    pol=$(docker inspect "$1" --format '{{.HostConfig.RestartPolicy.Name}}' 2>/dev/null || echo "")
    case "$pol" in
        always | unless-stopped) return 0 ;;
        *) return 1 ;;
    esac
}

# Load notification config if exists
if [ -f "$PROJECT_ROOT/.env.notifications" ]; then
    source "$PROJECT_ROOT/.env.notifications"
fi

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Fuehrt einen Befehl aus — oder loggt ihn nur im DRY_RUN. Bricht das Skript
# bei Fehler NICHT ab (Recovery soll weiterlaufen).
run() {
    if [ "$DRY_RUN" = "1" ]; then
        log "  [DRY_RUN] wuerde ausfuehren: $*"
        return 0
    fi
    "$@" >>"$LOG_FILE" 2>&1 || {
        log "  WARN: Befehl fehlgeschlagen (exit $?): $*"
        return 1
    }
}

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

    if [ -n "$NTFY_TOPIC" ]; then
        curl -s -d "$message" \
            -H "Title: Mana Container Health" \
            -H "Priority: $priority" \
            -H "Tags: white_check_mark" \
            "https://ntfy.sh/$NTFY_TOPIC" >/dev/null 2>&1 || true
    fi
}

# --- colima-VM-Liveness-Guard ---------------------------------------------
# Heilt einen Mid-Run-Crash der colima-VM (startup.sh laeuft nur beim Boot).
# Wartungs-Lock pausiert; Backoff verhindert Endlos-Haemmern.
COLIMA_FAIL_TRACKER="/tmp/mana-colima-start-fails"
COLIMA_MAX_FAILS=3

if ! colima status >/dev/null 2>&1; then
    if [ -f "$MAINT_LOCK" ]; then
        log "colima-Guard: VM down, aber Wartungs-Lock aktiv ($MAINT_LOCK) — kein Auto-Start"
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
        echo $((FAILS + 1)) >"$COLIMA_FAIL_TRACKER"
        log "colima-Guard: colima start FEHLGESCHLAGEN (Fehlstart $((FAILS + 1))/$COLIMA_MAX_FAILS)"
        exit 1
    fi
else
    rm -f "$COLIMA_FAIL_TRACKER" 2>/dev/null || true
fi
# --- Ende colima-Guard ----------------------------------------------------

# Check if docker is running
if ! docker info >/dev/null 2>&1; then
    log "ERROR: Docker is not running"
    exit 1
fi

[ "$DRY_RUN" = "1" ] && log "DRY_RUN aktiv — es wird nichts veraendert, nur geloggt."

# Restart-Versuche tracken (Loop-Guard). DRY_RUN persistiert NICHT.
track_restart() {
    local container="$1"
    local count_file="$RESTART_TRACKER/$container"
    mkdir -p "$RESTART_TRACKER"

    local count=0 age
    if [ -f "$count_file" ]; then
        count=$(cat "$count_file" 2>/dev/null || echo 0)
        case "$count" in '' | *[!0-9]*) count=0 ;; esac
        age=$(($(date +%s) - $(stat -f %m "$count_file" 2>/dev/null || stat -c %Y "$count_file" 2>/dev/null)))
        [ "$age" -gt 3600 ] && count=0 # nach 1h zuruecksetzen
    fi
    count=$((count + 1))
    [ "$DRY_RUN" = "1" ] || echo "$count" >"$count_file"
    echo "$count"
}

# --- mana-core Reconciliation: fehlende Core-Container neu erstellen -------
# Nur mana-core, weil dessen Env via env_file (+ co-located .env) im
# Compose-Dir liegt -> compose-up laedt sie sicher (keine Blank-Secrets).
# Ein komplett fehlender Container hat keine Labels -> gegen die Core-
# Compose abgleichen.
reconcile_mana_core() {
    [ -f "$MANA_CORE_COMPOSE" ] || {
        log "core-reconcile: Compose nicht gefunden ($MANA_CORE_COMPOSE) — skip"
        return 0
    }
    [ -f "$MAINT_LOCK" ] && {
        log "core-reconcile: Wartungs-Lock aktiv — skip"
        return 0
    }

    local services svc cid missing=""
    services=$(docker compose -p "$MANA_CORE_PROJECT" -f "$MANA_CORE_COMPOSE" config --services 2>/dev/null || true)
    [ -z "$services" ] && {
        log "core-reconcile: keine Services lesbar — skip"
        return 0
    }

    for svc in $services; do
        cid=$(docker ps -a \
            --filter "label=com.docker.compose.project=$MANA_CORE_PROJECT" \
            --filter "label=com.docker.compose.service=$svc" \
            --format '{{.ID}}' 2>/dev/null | head -1)
        [ -z "$cid" ] && missing="${missing:+$missing }$svc"
    done

    if [ -n "$missing" ]; then
        log "core-reconcile: FEHLENDE Core-Container: $missing"
        for svc in $missing; do
            log "  (re-)erstelle Core-Service: $svc"
            run docker compose -p "$MANA_CORE_PROJECT" -f "$MANA_CORE_COMPOSE" up -d --no-deps --no-build "$svc"
        done
        send_notification "🔧 <b>mana-core</b>\n\nFehlende Container neu erstellt: $missing" "high"
    fi
}

reconcile_mana_core

# Nicht-laufende Container (created/exited), die laufen sollten —
# projektuebergreifend (auch nicht-mana-*). Recovery via `docker start`
# (behaelt Env).
STUCK_CONTAINERS=""
for c in $(docker ps -a --filter "status=created" --filter "status=exited" --format "{{.Names}}"); do
    is_oneshot_init "$c" && continue
    should_autostart "$c" || continue
    STUCK_CONTAINERS="${STUCK_CONTAINERS:+$STUCK_CONTAINERS$'\n'}$c"
done

# Crash-loopende Container (Restarting) — projektuebergreifend.
CRASHLOOP_CONTAINERS=$(docker ps -a --filter "status=restarting" --format "{{.Names}}" || true)

if [ -z "$STUCK_CONTAINERS" ] && [ -z "$CRASHLOOP_CONTAINERS" ]; then
    log "OK: Alle Container laufen (oder sind bewusst gestoppt)"
    exit 0
fi

# Crash-Loops zuerst — `docker restart` (KEIN rm/compose-up: Env bleibt),
# Backoff + Notify wenn es persistent crasht (echter Bug, nicht heilbar).
if [ -n "$CRASHLOOP_CONTAINERS" ]; then
    log "WARNING: Crash-loopende Container:"
    for container in $CRASHLOOP_CONTAINERS; do
        RC=$(docker inspect "$container" --format '{{.RestartCount}}' 2>/dev/null || echo "0")
        log "  - $container (restart count: $RC)"
    done
    for container in $CRASHLOOP_CONTAINERS; do
        ATTEMPTS=$(track_restart "$container")
        if [ "$ATTEMPTS" -gt 3 ]; then
            log "  SKIP: $container in der letzten Stunde $ATTEMPTS-mal angestossen — manueller Eingriff noetig"
            send_notification "🚨 <b>Container braucht manuellen Fix</b>\n\n$container crasht wiederholt ($ATTEMPTS-mal). Logs:\n<code>docker logs $container</code>" "high"
            continue
        fi
        log "  docker restart $container (Versuch $ATTEMPTS/3)..."
        run docker restart "$container"
    done
fi

# Stuck (Created/Exited) — `docker start` (Env bleibt).
if [ -n "$STUCK_CONTAINERS" ]; then
    log "WARNING: Container nicht laufend (sollten aber):"
    for container in $STUCK_CONTAINERS; do
        STATUS=$(docker inspect "$container" --format '{{.State.Status}}' 2>/dev/null || echo "unknown")
        log "  - $container (status: $STATUS)"
    done
    for container in $STUCK_CONTAINERS; do
        log "  docker start $container..."
        run docker start "$container"
    done
fi

ALL_PROBLEM_CONTAINERS=$(printf '%s\n%s\n' "$STUCK_CONTAINERS" "$CRASHLOOP_CONTAINERS" | grep -v "^$" | sort -u || true)

if [ "$DRY_RUN" = "1" ]; then
    log "DRY_RUN: geplante Recovery fuer: $(echo $ALL_PROBLEM_CONTAINERS | tr '\n' ' ')"
    exit 0
fi

sleep 10

STILL_STUCK=""
for c in $(docker ps -a --filter "status=created" --filter "status=exited" --format "{{.Names}}"); do
    is_oneshot_init "$c" && continue
    should_autostart "$c" || continue
    STILL_STUCK="${STILL_STUCK:+$STILL_STUCK$'\n'}$c"
done
STILL_CRASHING=$(docker ps -a --filter "status=restarting" --format "{{.Names}}" || true)
ALL_STILL_BROKEN=$(printf '%s\n%s\n' "$STILL_STUCK" "$STILL_CRASHING" | grep -v "^$" | sort -u || true)

if [ -z "$ALL_STILL_BROKEN" ]; then
    FIXED_MSG="Auto-fixed: $(echo $ALL_PROBLEM_CONTAINERS | tr '\n' ', ')"
    log "SUCCESS: $FIXED_MSG"
    send_notification "🔧 <b>Mana Auto-Recovery</b>\n\n$FIXED_MSG"
else
    log "ERROR: Weiterhin kaputt:"
    for container in $ALL_STILL_BROKEN; do
        STATUS=$(docker inspect "$container" --format '{{.State.Status}}' 2>/dev/null || echo "unknown")
        log "  - $container (status: $STATUS)"
    done
    send_notification "⚠️ <b>Mana Container Issue</b>\n\nWeiterhin kaputt: $(echo $ALL_STILL_BROKEN | tr '\n' ', ')" "high"
    exit 1
fi
