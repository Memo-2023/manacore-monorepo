#!/bin/bash
# Mana Mac Mini Startup Script
# Called by launchd on boot — starts Colima + all containers
#
# LaunchAgent: ~/Library/LaunchAgents/com.mana.docker-startup.plist

set -uo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

LOG_FILE="/tmp/mana-startup.log"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.macmini.yml"
ENV_FILE="$PROJECT_ROOT/.env.macmini"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Mana Startup Script ==="
log "Project root: $PROJECT_ROOT"

# ─── Kill Docker Desktop if it auto-started ───
if pgrep -f "Docker.app" >/dev/null 2>&1; then
    log "Docker Desktop detected, stopping..."
    osascript -e 'quit app "Docker"' 2>/dev/null
    sleep 5
    pkill -f "Docker.app" 2>/dev/null || true
    sleep 3
    log "Docker Desktop stopped"
fi

# ─── Verify Colima datadisk symlink (must be on external SSD) ───
COLIMA_DISK_LINK="$HOME/.colima/_lima/_disks/colima"
EXPECTED_TARGET="/Volumes/ManaData/colima-disk"
if [ -e "$COLIMA_DISK_LINK" ] && [ ! -L "$COLIMA_DISK_LINK" ]; then
    log "ERROR: Colima datadisk is a directory, not a symlink!"
    log "The datadisk must live on the external SSD to prevent filling the internal SSD."
    log "Run: scripts/mac-mini/move-colima-to-external-ssd.sh"
    exit 1
fi
if [ -L "$COLIMA_DISK_LINK" ]; then
    actual_target=$(readlink "$COLIMA_DISK_LINK")
    if [ "$actual_target" != "$EXPECTED_TARGET" ]; then
        log "WARNING: Colima datadisk symlink points to $actual_target (expected $EXPECTED_TARGET)"
    else
        log "Colima datadisk symlink OK → $EXPECTED_TARGET"
    fi
fi
if [ ! -d "/Volumes/ManaData" ]; then
    log "ERROR: External SSD /Volumes/ManaData not mounted!"
    exit 1
fi

# ─── Start Colima ───
# Use `docker info` as the source of truth for "is the runtime usable" instead
# of `colima status`, which can mis-report and trigger a destructive restart.
if docker info >/dev/null 2>&1; then
    log "Colima already running (docker reachable)"
else
    log "Colima not reachable, preparing fresh start..."

    # Reap zombie colima/limactl processes from previously failed starts.
    # These hold locks that prevent a clean start. Do NOT touch a running VM.
    for pat in "colima stop" "limactl stop" "colima daemon" "limactl hostagent" "limactl usernet"; do
        pids=$(pgrep -f "$pat" || true)
        if [ -n "$pids" ]; then
            log "  reaping stale: $pat ($pids)"
            echo "$pids" | xargs kill -9 2>/dev/null || true
        fi
    done
    sleep 1

    # Clear stale disk lock if no process actually owns it.
    # The lock is a symlink at /Volumes/ManaData/colima-disk/in_use_by → ~/.colima/_lima/colima
    # If the symlink exists but no limactl/vz process is running, the lock is stale.
    LOCK="/Volumes/ManaData/colima-disk/in_use_by"
    if [ -L "$LOCK" ] && ! pgrep -f "limactl hostagent" >/dev/null 2>&1; then
        log "  removing stale disk lock: $LOCK"
        rm -f "$LOCK"
    fi

    log "Starting Colima..."
    colima start \
        --cpu 8 \
        --memory 12 \
        --disk 200 \
        --vm-type vz \
        --vz-rosetta \
        --mount-type virtiofs \
        --mount /Users/mana:w \
        --mount /Volumes/ManaData:w \
        2>&1 | tee -a "$LOG_FILE"

    # Verify with docker info, not colima status (more reliable)
    if ! docker info >/dev/null 2>&1; then
        log "ERROR: Colima failed to start (docker not reachable)"
        exit 1
    fi
    log "Colima started successfully"
fi

# ─── Verify Docker CLI works ───
if ! docker info >/dev/null 2>&1; then
    log "ERROR: Docker CLI not connected to Colima"
    exit 1
fi
log "Docker CLI connected"

# ─── Restore named volumes if missing ───
BACKUP_DIR="/Volumes/ManaData/backups/docker-migration-20260328"
for vol in mana-redis-data mana-victoria-data mana-alertmanager-data mana-grafana-data mana-analytics-data mana-loki-data; do
    if ! docker volume inspect "$vol" >/dev/null 2>&1; then
        BACKUP_FILE="$BACKUP_DIR/${vol}.tar.gz"
        if [ -f "$BACKUP_FILE" ]; then
            log "Restoring volume: $vol"
            docker volume create "$vol" >/dev/null
            docker run --rm -v "$vol":/target -v "$BACKUP_DIR":/backup:ro \
                alpine sh -c "tar xzf /backup/${vol}.tar.gz -C /target 2>/dev/null"
        fi
    fi
done

# ─── Check prerequisites ───
if [ ! -f "$COMPOSE_FILE" ]; then
    log "ERROR: $COMPOSE_FILE not found"
    exit 1
fi
if [ ! -f "$ENV_FILE" ]; then
    log "ERROR: $ENV_FILE not found"
    exit 1
fi

# ─── Start containers ───
log "Starting Docker containers..."
cd "$PROJECT_ROOT"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-build 2>&1 | tee -a "$LOG_FILE"

# ─── Wait and verify ───
log "Waiting 45s for services to initialize..."
sleep 45

RUNNING=$(docker ps -q | wc -l | tr -d ' ')
log "Containers running: $RUNNING"

# ─── Create missing databases ───
log "Ensuring databases exist..."
for db in mana_auth mana_credits chat todo calendar clock contacts storage; do
    docker exec mana-infra-postgres psql -U postgres -c "CREATE DATABASE $db;" 2>/dev/null || true
done

log "=== Startup Complete ($RUNNING containers running) ==="
