#!/bin/bash
# Mana Weekly Maintenance Report
# Generates a comprehensive system health summary
#
# Includes:
#   - Backup status
#   - Disk usage
#   - Container health & restart counts
#   - Database statistics
#   - Error log summary
#
# Run via LaunchD every Sunday at 10:00 AM

set -e

# Ensure PATH includes required tools
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="/tmp/mana-weekly-report.log"
REPORT_FILE="/tmp/mana-weekly-report.txt"

# Load notification config if exists
if [ -f "$PROJECT_ROOT/.env.notifications" ]; then
    source "$PROJECT_ROOT/.env.notifications"
fi

# Nur die benoetigten Telegram-Vars aus .env.macmini ziehen — NICHT `source`n.
# .env.macmini enthaelt mehrzeilige PEM-Werte (JWT_PUBLIC_KEY,
# MANA_AI_PUBLIC_KEY_PEM); naives `source` interpretiert deren Folgezeilen als
# Befehle ("PUBLIC: command not found") und der Job stirbt mit Exit 127.
if [ -f "$PROJECT_ROOT/.env.macmini" ]; then
    for _v in TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID; do
        _val=$(grep -E "^${_v}=" "$PROJECT_ROOT/.env.macmini" | head -1 | cut -d= -f2-)
        [ -n "$_val" ] && export "${_v}=${_val}"
    done
    unset _v _val
fi

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

send_notification() {
    local message="$1"

    # Telegram
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=${message}" \
            -d "parse_mode=HTML" \
            >/dev/null 2>&1 || true
    fi
}

# Initialize report
init_report() {
    cat > "$REPORT_FILE" << EOF
📊 <b>Mana Weekly Report</b>
$(date '+%Y-%m-%d %H:%M')
━━━━━━━━━━━━━━━━━━━━━━

EOF
}

# Add section to report
add_section() {
    local title="$1"
    echo "" >> "$REPORT_FILE"
    echo "<b>$title</b>" >> "$REPORT_FILE"
}

# Check backup status
check_backups() {
    add_section "💾 Backup Status"

    local backup_dir="/Volumes/ManaData/backups/postgres"

    if [ ! -d "$backup_dir" ]; then
        echo "⚠️ Backup directory not found" >> "$REPORT_FILE"
        return
    fi

    # Count recent backups
    local daily_count
    daily_count=$(find "$backup_dir/daily" -name "*.sql.gz" -mtime -7 2>/dev/null | wc -l | tr -d ' ')

    local weekly_count
    weekly_count=$(find "$backup_dir/weekly" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')

    # Get latest backup
    local latest_backup
    latest_backup=$(ls -t "$backup_dir/daily"/*.sql.gz 2>/dev/null | head -1)
    local latest_date=""
    if [ -n "$latest_backup" ]; then
        latest_date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$latest_backup" 2>/dev/null || stat -c "%y" "$latest_backup" 2>/dev/null | cut -d'.' -f1)
    fi

    # Get total backup size
    local total_size
    total_size=$(du -sh "$backup_dir" 2>/dev/null | awk '{print $1}')

    echo "Daily backups (7 days): $daily_count" >> "$REPORT_FILE"
    echo "Weekly backups: $weekly_count" >> "$REPORT_FILE"
    echo "Latest: $latest_date" >> "$REPORT_FILE"
    echo "Total size: $total_size" >> "$REPORT_FILE"

    # Verify backup integrity (check if files are not empty)
    local empty_backups
    empty_backups=$(find "$backup_dir/daily" -name "*.sql.gz" -size 0 2>/dev/null | wc -l | tr -d ' ')
    if [ "$empty_backups" -gt 0 ]; then
        echo "⚠️ $empty_backups empty backup files found!" >> "$REPORT_FILE"
    fi
}

# Check disk usage
check_disk_usage() {
    add_section "💿 Disk Usage"

    # System disk
    local system_usage
    system_usage=$(df -h / 2>/dev/null | awk 'NR==2 {print $5 " used (" $4 " free)"}')
    echo "System: $system_usage" >> "$REPORT_FILE"

    # ManaData SSD
    if [ -d "/Volumes/ManaData" ]; then
        local data_usage
        data_usage=$(df -h "/Volumes/ManaData" 2>/dev/null | awk 'NR==2 {print $5 " used (" $4 " free)"}')
        echo "ManaData: $data_usage" >> "$REPORT_FILE"
    fi

    # Docker disk usage
    if docker info >/dev/null 2>&1; then
        local docker_images
        docker_images=$(docker system df --format '{{.Type}}: {{.Size}}' 2>/dev/null | head -3 | tr '\n' ', ' | sed 's/,$//')
        echo "Docker: $docker_images" >> "$REPORT_FILE"
    fi
}

# Check container health
check_containers() {
    add_section "🐳 Container Health"

    if ! docker info >/dev/null 2>&1; then
        echo "⚠️ Docker not running" >> "$REPORT_FILE"
        return
    fi

    # Count containers by status
    local running
    running=$(docker ps -q 2>/dev/null | wc -l | tr -d ' ')

    local total
    total=$(docker ps -aq 2>/dev/null | wc -l | tr -d ' ')

    local healthy
    healthy=$(docker ps --filter "health=healthy" -q 2>/dev/null | wc -l | tr -d ' ')

    local unhealthy
    unhealthy=$(docker ps --filter "health=unhealthy" -q 2>/dev/null | wc -l | tr -d ' ')

    echo "Running: $running / $total" >> "$REPORT_FILE"
    echo "Healthy: $healthy" >> "$REPORT_FILE"

    if [ "$unhealthy" -gt 0 ]; then
        echo "⚠️ Unhealthy: $unhealthy" >> "$REPORT_FILE"
        # List unhealthy containers
        docker ps --filter "health=unhealthy" --format "  - {{.Names}}" 2>/dev/null >> "$REPORT_FILE"
    fi

    # Get containers with most restarts this week
    echo "" >> "$REPORT_FILE"
    echo "Top restarts:" >> "$REPORT_FILE"

    docker ps -a --format '{{.Names}} {{.Status}}' 2>/dev/null | \
        grep -E "mana-" | \
        while read name status; do
            local restarts
            restarts=$(docker inspect "$name" --format '{{.RestartCount}}' 2>/dev/null || echo "0")
            if [ "$restarts" -gt 0 ]; then
                echo "  $name: $restarts" >> "$REPORT_FILE"
            fi
        done

    # Check for any container that restarted in the last week
    local recent_restarts=0
    for container in $(docker ps -aq 2>/dev/null); do
        local restart_count
        restart_count=$(docker inspect "$container" --format '{{.RestartCount}}' 2>/dev/null || echo "0")
        if [ "$restart_count" -gt 0 ]; then
            recent_restarts=$((recent_restarts + restart_count))
        fi
    done

    if [ "$recent_restarts" -eq 0 ]; then
        echo "  None (stable week!)" >> "$REPORT_FILE"
    fi
}

# Check database health
check_database() {
    add_section "🗄️ Database"

    if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "mana-infra-postgres"; then
        echo "⚠️ PostgreSQL not running" >> "$REPORT_FILE"
        return
    fi

    # Get database sizes
    local db_sizes
    db_sizes=$(docker exec mana-infra-postgres psql -U postgres -t -c "
        SELECT datname, pg_size_pretty(pg_database_size(datname))
        FROM pg_database
        WHERE datistemplate = false AND datname != 'postgres'
        ORDER BY pg_database_size(datname) DESC
        LIMIT 5;
    " 2>/dev/null | grep -v "^$" || echo "Could not fetch")

    echo "Database sizes:" >> "$REPORT_FILE"
    echo "$db_sizes" | while read line; do
        [ -n "$line" ] && echo "  $line" >> "$REPORT_FILE"
    done

    # Get total connection count
    local connections
    connections=$(docker exec mana-infra-postgres psql -U postgres -t -c "
        SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
    " 2>/dev/null | tr -d ' ' || echo "?")

    echo "Active connections: $connections" >> "$REPORT_FILE"
}

# Check for errors in logs
check_errors() {
    add_section "⚠️ Recent Errors"

    local error_count=0
    local containers_with_errors=""

    # Check each mana container for errors in the last 24h
    for container in $(docker ps --format '{{.Names}}' 2>/dev/null | grep "^mana-"); do
        local errors
        errors=$(docker logs "$container" --since 168h 2>&1 | grep -ci "error\|exception\|fatal" || echo "0")

        if [ "$errors" -gt 10 ]; then
            containers_with_errors="$containers_with_errors\n  $container: $errors errors"
            error_count=$((error_count + errors))
        fi
    done

    if [ -z "$containers_with_errors" ]; then
        echo "No significant errors in the last week" >> "$REPORT_FILE"
    else
        echo "Total errors: $error_count" >> "$REPORT_FILE"
        echo -e "$containers_with_errors" >> "$REPORT_FILE"
    fi
}

# Check uptime and system resources
check_system() {
    add_section "🖥️ System"

    # System uptime
    local uptime_str
    uptime_str=$(uptime | sed 's/.*up //' | sed 's/,.*//')
    echo "Uptime: $uptime_str" >> "$REPORT_FILE"

    # Load average
    local load
    load=$(uptime | sed 's/.*load averages: //' | awk '{print $1 " " $2 " " $3}')
    echo "Load: $load" >> "$REPORT_FILE"

    # Memory (macOS specific)
    if command -v vm_stat &> /dev/null; then
        local pages_free
        pages_free=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
        local pages_active
        pages_active=$(vm_stat | grep "Pages active" | awk '{print $3}' | tr -d '.')
        # Calculate rough memory usage (page size is 16384 on Apple Silicon, 4096 on Intel)
        local page_size
        page_size=$(pagesize 2>/dev/null || echo "16384")
        local mem_free_gb
        mem_free_gb=$(echo "scale=1; $pages_free * $page_size / 1024 / 1024 / 1024" | bc 2>/dev/null || echo "?")
        echo "Memory free: ~${mem_free_gb}GB" >> "$REPORT_FILE"
    fi
}

# Generate summary
generate_summary() {
    echo "" >> "$REPORT_FILE"
    echo "━━━━━━━━━━━━━━━━━━━━━━" >> "$REPORT_FILE"
    echo "<i>Generated by Mana</i>" >> "$REPORT_FILE"
}

# Main execution
log "=== Generating Weekly Report ==="

init_report
check_backups
check_disk_usage
check_containers
check_database
check_errors
check_system
generate_summary

log "Report generated at $REPORT_FILE"

# Send report via Telegram
REPORT_CONTENT=$(cat "$REPORT_FILE")
send_notification "$REPORT_CONTENT"

log "Report sent via Telegram"
log "=== Weekly Report Complete ==="
