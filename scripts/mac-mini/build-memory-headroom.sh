#!/usr/bin/env bash
#
# Frees RAM in the Colima VM by pausing the non-critical monitoring
# stack while a heavy build (mana-web's Vite bundler) runs. The stack
# resumes via a trap on script exit, so a failed build still restores
# observability.
#
# Why this exists: the unified mana-web Vite build needs 8 GB of Node
# heap (NODE_OPTIONS="--max-old-space-size=8192" in the Dockerfile).
# Colima's VM is sized at 12 GB; with ~3.5 GiB of other containers
# running and BuildKit's own overhead, peak RSS occasionally spills
# over and the build OOMs with "cannot allocate memory" mid-Vite. The
# 2026-04-28 mana-web deploy hit this, then succeeded on retry once
# concurrent traffic settled.
#
# What we pause: every container with a `mana-mon-*` name. That's the
# observability stack (VictoriaMetrics, Loki, Glitchtip, cAdvisor,
# blackbox, exporters, …) — combined ~700 MiB resident, large
# enough to give Vite the headroom it needs without touching anything
# load-bearing. Postgres, Redis, the auth/api/web tier, all stay up.
#
# Usage:
#   scripts/mac-mini/build-memory-headroom.sh start  # pause monitoring
#   scripts/mac-mini/build-memory-headroom.sh stop   # resume monitoring
#
# Or wrap a command:
#   scripts/mac-mini/build-memory-headroom.sh wrap docker compose build mana-web
#
# Designed to be idempotent: pausing already-stopped containers is a
# no-op, and the resume step skips containers that aren't part of the
# monitoring stack.

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.macmini.yml}"
ENV_FILE="${ENV_FILE:-.env.macmini}"

# Pattern for "non-critical" containers — pause these to free RAM.
# Anything outside this pattern is left alone (load-bearing services).
NON_CRITICAL_PATTERN='^mana-mon-'

list_paused_targets() {
	# Currently-running containers matching the pattern. We capture the
	# list at pause-time so resume only touches what we actually paused.
	docker ps --format '{{.Names}}' | grep -E "$NON_CRITICAL_PATTERN" || true
}

pause_monitoring() {
	cd "$PROJECT_DIR"
	local targets
	targets=$(list_paused_targets)
	if [ -z "$targets" ]; then
		echo "[build-memory-headroom] no monitoring containers running — nothing to pause"
		return 0
	fi
	echo "[build-memory-headroom] pausing for build headroom: $(echo "$targets" | tr '\n' ' ')"
	# Persist the list so `stop` knows what to bring back even if the
	# environment between calls is fresh (CI step boundary).
	mkdir -p /tmp/mana-deploy
	echo "$targets" > /tmp/mana-deploy/paused-monitoring.txt
	# `docker stop` is graceful (SIGTERM, then SIGKILL after 10 s).
	# We don't need data integrity for stateless monitoring; quick
	# stop is fine.
	# shellcheck disable=SC2086
	docker stop --time=5 $targets >/dev/null
}

resume_monitoring() {
	cd "$PROJECT_DIR"
	if [ ! -f /tmp/mana-deploy/paused-monitoring.txt ]; then
		echo "[build-memory-headroom] no record of paused containers — nothing to resume"
		return 0
	fi
	local targets
	targets=$(cat /tmp/mana-deploy/paused-monitoring.txt)
	if [ -z "$targets" ]; then return 0; fi
	echo "[build-memory-headroom] resuming: $(echo "$targets" | tr '\n' ' ')"
	# `docker start` ignores already-running and missing containers
	# silently — best-effort restore.
	# shellcheck disable=SC2086
	docker start $targets >/dev/null 2>&1 || true
	rm -f /tmp/mana-deploy/paused-monitoring.txt
}

case "${1:-}" in
	start | pause)
		pause_monitoring
		;;
	stop | resume)
		resume_monitoring
		;;
	wrap)
		shift
		pause_monitoring
		trap resume_monitoring EXIT INT TERM
		"$@"
		;;
	*)
		echo "Usage: $0 {start|stop|wrap <command...>}" >&2
		exit 1
		;;
esac
