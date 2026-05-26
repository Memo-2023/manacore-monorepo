#!/bin/bash
# Mana Container Health Enforcer
# Stellt sicher, dass alle Container, die laufen SOLLTEN, auch laufen.
#
# Erkennt und heilt:
# - Exited/Created mit Restart-Policy always/unless-stopped -> recover
# - Crash-Loop (Restarting)                                 -> recreate (Backoff)
# - FEHLENDE mana-core-Container (gar kein Container da)     -> aus Core-Compose neu erstellen
#
# Recovery ist LABEL-GETRIEBEN: jeder Container wird über SEIN EIGENES
# Compose-Projekt/-Config (Docker-Labels com.docker.compose.*) wieder
# hochgefahren. Dadurch funktioniert die Heilung projektübergreifend
# (mana-core, managarten, sowie eigenständige App-Stacks wie nutriphi/
# viadocu/zitare) — nicht mehr nur gegen die eine managarten-Compose.
#
# Bewusst gestoppte Container (Restart-Policy "no", z.B. watchtower) werden
# NIE auto-gestartet. One-Shot-Init-Container werden übersprungen.
#
# Lücken-Historie (2026-05-26, project_uptime_hardening): nach einem
# VM-Crash kam `mana-auth` (Core, fehlte komplett) nicht zurück und
# nicht-`mana-*`-Apps (viadocu/nutriphi) wurden gar nicht abgedeckt —
# beides fixt diese Version.
#
# Run via LaunchD alle 5 Minuten oder nach Boot.
# DRY_RUN=1 -> loggt nur die geplanten Aktionen, führt nichts aus.

set -e

# Ensure PATH includes docker
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="/tmp/mana-container-health.log"
RESTART_TRACKER="/tmp/mana-restart-tracker"
DRY_RUN="${DRY_RUN:-0}"

# mana-core (Plattform-Kern) — eigenes Compose-Projekt seit der Core-
# Isolation (project_uptime_hardening / CORE_ISOLATION.md). Pfad ist
# serverseitig. Gebraucht für die "fehlender Core-Container"-Reconciliation,
# weil ein komplett fehlender Container keine Labels zum Auslesen hat.
MANA_CORE_PROJECT="mana-core"
MANA_CORE_COMPOSE="/Users/mana/projects/mana-platform/infrastructure/core/docker-compose.core.yml"

# Wartungs-Lock (geteilt mit dem colima-Guard): pausiert die aggressivste
# Aktion — das Neu-Erstellen fehlender Core-Container —, damit bewusste
# Stop/Debug-Sessions nicht unterlaufen werden.
MAINT_LOCK="/tmp/mana-colima-maintenance"

# Container, die nach einem One-Shot-Job legitim "exited" sind — NICHT heilen
# (sonst Log-Spam + unnötiges Re-Run des Init-Jobs alle 5 min). Zusätzlich
# greift das Restart-Policy-Gate (One-Shots nutzen i.d.R. "no"/"on-failure").
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

# Soll dieser Container automatisch (wieder-)gestartet werden? Nur wenn seine
# Restart-Policy ihn als "Dauerläufer" markiert. So fassen wir bewusst
# gestoppte (restart=no, z.B. watchtower) und One-Shot-Jobs nie an.
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

# Führt einen Befehl aus — oder loggt ihn nur im DRY_RUN. Bricht das Skript
# bei Fehler NICHT ab (Recovery soll weiterlaufen).
run() {
    if [ "$DRY_RUN" = "1" ]; then
        log "  [DRY_RUN] würde ausführen: $*"
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
    # VM laeuft normal — Fehlerzaehler zuruecksetzen
    rm -f "$COLIMA_FAIL_TRACKER" 2>/dev/null || true
fi
# --- Ende colima-Guard ----------------------------------------------------

# Check if docker is running
if ! docker info >/dev/null 2>&1; then
    log "ERROR: Docker is not running"
    exit 1
fi

[ "$DRY_RUN" = "1" ] && log "DRY_RUN aktiv — es wird nichts verändert, nur geloggt."

# Track restart attempts to avoid infinite loops
track_restart() {
    local container="$1"
    local count_file="$RESTART_TRACKER/$container"
    mkdir -p "$RESTART_TRACKER"

    if [ -f "$count_file" ]; then
        local count age
        count=$(cat "$count_file")
        age=$(($(date +%s) - $(stat -f %m "$count_file" 2>/dev/null || stat -c %Y "$count_file" 2>/dev/null)))
        if [ "$age" -gt 3600 ]; then
            echo "1" >"$count_file"
            echo "1"
        else
            count=$((count + 1))
            echo "$count" >"$count_file"
            echo "$count"
        fi
    else
        echo "1" >"$count_file"
        echo "1"
    fi
}

# Bringt einen Container über SEIN eigenes Compose-Projekt wieder hoch
# (Labels). recreate=1 entfernt ihn vorher (für Crash-Loops, damit ein
# frischer Container entsteht). Ohne Compose-Labels: docker start/restart.
bring_up() {
    local name="$1"
    local recreate="${2:-0}"
    local proj cfg svc
    proj=$(docker inspect "$name" --format '{{index .Config.Labels "com.docker.compose.project"}}' 2>/dev/null || echo "")
    cfg=$(docker inspect "$name" --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}' 2>/dev/null || echo "")
    svc=$(docker inspect "$name" --format '{{index .Config.Labels "com.docker.compose.service"}}' 2>/dev/null || echo "")
    cfg="${cfg%%,*}" # bei mehreren -f das erste nehmen

    if [ -n "$proj" ] && [ -n "$cfg" ] && [ -n "$svc" ] && [ -f "$cfg" ]; then
        if [ "$recreate" = "1" ]; then
            log "  recreate $name via compose (project=$proj service=$svc)"
            run docker rm -f "$name"
            run docker compose -p "$proj" -f "$cfg" up -d --no-deps "$svc"
        else
            log "  recover $name via compose (project=$proj service=$svc)"
            run docker compose -p "$proj" -f "$cfg" up -d --no-deps "$svc"
        fi
    else
        # Kein Compose-Container (oder Config-Datei fehlt) — direkter Start.
        log "  recover $name via docker start (keine nutzbaren Compose-Labels)"
        run docker start "$name"
    fi
}

# --- mana-core Reconciliation: fehlende Core-Container neu erstellen -------
# Ein komplett fehlender Container hat keine Labels — daher gegen die
# Core-Compose abgleichen, welche Services definiert, aber ohne Container
# sind, und nur die gezielt (re-)erzeugen.
reconcile_mana_core() {
    if [ ! -f "$MANA_CORE_COMPOSE" ]; then
        log "core-reconcile: Compose nicht gefunden ($MANA_CORE_COMPOSE) — skip"
        return 0
    fi
    if [ -f "$MAINT_LOCK" ]; then
        log "core-reconcile: Wartungs-Lock aktiv ($MAINT_LOCK) — skip"
        return 0
    fi

    local services svc cid missing=""
    services=$(docker compose -p "$MANA_CORE_PROJECT" -f "$MANA_CORE_COMPOSE" config --services 2>/dev/null || true)
    [ -z "$services" ] && {
        log "core-reconcile: keine Services aus Compose lesbar — skip"
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
            run docker compose -p "$MANA_CORE_PROJECT" -f "$MANA_CORE_COMPOSE" up -d --no-deps "$svc"
        done
        send_notification "🔧 <b>mana-core</b>\n\nFehlende Container neu erstellt: $missing" "high"
    fi
}

reconcile_mana_core

# Nicht-laufende Container (created/exited), die laufen sollten.
STUCK_CONTAINERS=""
for c in $(docker ps -a --filter "status=created" --filter "status=exited" --format "{{.Names}}"); do
    is_oneshot_init "$c" && continue
    should_autostart "$c" || continue
    STUCK_CONTAINERS="${STUCK_CONTAINERS:+$STUCK_CONTAINERS$'\n'}$c"
done

# Crash-loopende Container (Restarting) — haben per Definition eine Policy.
CRASHLOOP_CONTAINERS=$(docker ps -a --filter "status=restarting" --format "{{.Names}}" || true)

if [ -z "$STUCK_CONTAINERS" ] && [ -z "$CRASHLOOP_CONTAINERS" ]; then
    log "OK: Alle Container laufen (oder sind bewusst gestoppt)"
    exit 0
fi

# Crash-Loops zuerst (kritischer) — mit Backoff, dann sauber neu erstellen.
if [ -n "$CRASHLOOP_CONTAINERS" ]; then
    log "WARNING: Crash-loopende Container gefunden:"
    for container in $CRASHLOOP_CONTAINERS; do
        RESTART_COUNT=$(docker inspect "$container" --format '{{.RestartCount}}' 2>/dev/null || echo "0")
        log "  - $container (restart count: $RESTART_COUNT)"
    done

    for container in $CRASHLOOP_CONTAINERS; do
        ATTEMPTS=$(track_restart "$container")
        if [ "$ATTEMPTS" -gt 3 ]; then
            log "  SKIP: $container wurde in der letzten Stunde $ATTEMPTS× neu gestartet — manueller Eingriff noetig"
            send_notification "🚨 <b>Container braucht manuellen Fix</b>\n\n$container crasht wiederholt ($ATTEMPTS×). Logs:\n<code>docker logs $container</code>" "high"
            continue
        fi
        log "  Recreate $container (Versuch $ATTEMPTS/3)..."
        bring_up "$container" 1
    done
fi

# Stuck (Created/Exited) — einfach hochfahren.
if [ -n "$STUCK_CONTAINERS" ]; then
    log "WARNING: Container nicht laufend (sollten aber):"
    for container in $STUCK_CONTAINERS; do
        STATUS=$(docker inspect "$container" --format '{{.State.Status}}' 2>/dev/null || echo "unknown")
        log "  - $container (status: $STATUS)"
    done
    for container in $STUCK_CONTAINERS; do
        bring_up "$container" 0
    done
fi

ALL_PROBLEM_CONTAINERS=$(printf '%s\n%s\n' "$STUCK_CONTAINERS" "$CRASHLOOP_CONTAINERS" | grep -v "^$" | sort -u || true)

if [ "$DRY_RUN" = "1" ]; then
    log "DRY_RUN: Geplante Recovery für: $(echo $ALL_PROBLEM_CONTAINERS | tr '\n' ' ')"
    exit 0
fi

# Warten und verifizieren.
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
    FIXED_MSG="Auto-fixed containers: $(echo $ALL_PROBLEM_CONTAINERS | tr '\n' ', ')"
    log "SUCCESS: $FIXED_MSG"
    send_notification "🔧 <b>Mana Auto-Recovery</b>\n\n$FIXED_MSG"
else
    log "ERROR: Manche Container sind weiterhin kaputt:"
    for container in $ALL_STILL_BROKEN; do
        STATUS=$(docker inspect "$container" --format '{{.State.Status}}' 2>/dev/null || echo "unknown")
        log "  - $container (status: $STATUS)"
    done
    send_notification "⚠️ <b>Mana Container Issue</b>\n\nWeiterhin kaputt: $(echo $ALL_STILL_BROKEN | tr '\n' ', ')" "high"
    exit 1
fi
