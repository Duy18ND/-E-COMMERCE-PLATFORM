#!/usr/bin/env bash
# ==============================================================================
# ShopMart E-Commerce Platform — MySQL Safe Restore Script
# Task: ECOM-153 / ECOM-154
#
# Description:
#   Restores a ShopMart database or full MySQL instance from a compressed
#   or plain SQL dump archive. Enforces confirmation safeguards, pre-flight
#   integrity validation, container state checks, and support for isolated
#   drill verification databases (preventing production overwrite).
# ==============================================================================

set -euo pipefail

# --- Color Output Helpers ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] [INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] [SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] [WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR]${NC} $1" >&2
}

# --- Resolve Script & Project Directories ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# --- Load Environment Variables if available ---
if [ -f "/opt/shopmart/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "/opt/shopmart/.env"
    set +a
elif [ -f "${PROJECT_ROOT}/backend/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "${PROJECT_ROOT}/backend/.env"
    set +a
elif [ -f "${PROJECT_ROOT}/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "${PROJECT_ROOT}/.env"
    set +a
fi

# --- Default Configurations ---
MYSQL_CONTAINER="${MYSQL_CONTAINER:-ecommerce-mysql}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_ROOT_PASSWORD:-rootpassword}"
FORCE_RESTORE=false
TARGET_DB=""
TEST_RESTORE_DB=""
BACKUP_FILE=""

# --- Parse Arguments ---
show_usage() {
    echo "Usage: $0 <backup_file> [OPTIONS]"
    echo ""
    echo "Arguments:"
    echo "  backup_file             Path to .sql.gz or .sql backup archive (Required)"
    echo ""
    echo "Options:"
    echo "  -d, --database <name>   Target database name to restore into"
    echo "  -t, --test-db <name>    Restore into an isolated test database (e.g. 'auth_db_test')"
    echo "  -c, --container <name>  MySQL container name (default: 'ecommerce-mysql')"
    echo "  -y, --force             Bypass interactive confirmation (USE WITH CAUTION)"
    echo "  -h, --help              Show this help message"
    exit 0
}

if [ $# -eq 0 ]; then
    show_usage
fi

while [[ $# -gt 0 ]]; do
    case "$1" in
        -d|--database)
            TARGET_DB="$2"
            shift 2
            ;;
        -t|--test-db)
            TEST_RESTORE_DB="$2"
            shift 2
            ;;
        -c|--container)
            MYSQL_CONTAINER="$2"
            shift 2
            ;;
        -y|--force)
            FORCE_RESTORE=true
            shift
            ;;
        -h|--help)
            show_usage
            ;;
        -*)
            log_error "Unknown option: $1"
            exit 1
            ;;
        *)
            if [ -z "${BACKUP_FILE}" ]; then
                BACKUP_FILE="$1"
                shift
            else
                log_error "Unexpected positional parameter: $1"
                exit 1
            fi
            ;;
    esac
done

# --- 1. Validate Input File ---
log_info "=== [1/5] Validating Backup Archive File ==="

if [ -z "${BACKUP_FILE}" ]; then
    log_error "No backup archive specified. Please provide the path to a backup file."
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    log_error "Backup file does not exist: ${BACKUP_FILE}"
    exit 2
fi

if [ ! -s "${BACKUP_FILE}" ]; then
    log_error "Backup file is empty (0 bytes): ${BACKUP_FILE}"
    exit 3
fi

# Detect compression format
IS_GZ=false
if [[ "${BACKUP_FILE}" =~ \.gz$ ]]; then
    IS_GZ=true
    if ! command -v gzip &>/dev/null; then
        log_error "Archive is gzipped, but 'gzip' command is not available."
        exit 4
    fi

    log_info "Verifying gzip compression integrity..."
    if ! gzip -t "${BACKUP_FILE}"; then
        log_error "Corrupted gzip archive! 'gzip -t' failed."
        exit 5
    fi
    log_success "Gzip integrity verified."
fi

# --- 2. Check Database Service Status ---
log_info "=== [2/5] Checking MySQL Service & Connectivity ==="

if ! command -v docker &>/dev/null; then
    log_error "Docker CLI is not installed or not in PATH."
    exit 6
fi

if ! docker ps --format '{{.Names}}' | grep -wq "^${MYSQL_CONTAINER}$"; then
    log_error "MySQL container '${MYSQL_CONTAINER}' is NOT running."
    exit 7
fi

if ! docker exec -e MYSQL_PWD="${MYSQL_PASSWORD}" "${MYSQL_CONTAINER}" \
    mysqladmin ping -u "${MYSQL_USER}" --silent; then
    log_error "Failed to connect to MySQL service inside '${MYSQL_CONTAINER}'."
    exit 8
fi
log_success "MySQL service is online and accessible."

# --- 3. Determine Restore Strategy & Safety Guard ---
log_info "=== [3/5] Determining Restore Target & Safety Controls ==="

RESTORE_DESTINATION="Production Databases (From Dump Headers)"
if [ -n "${TEST_RESTORE_DB}" ]; then
    RESTORE_DESTINATION="Isolated Test Database: '${TEST_RESTORE_DB}' (SAFE DRILL MODE)"
    # Create test database if not exists
    log_info "Ensuring test database '${TEST_RESTORE_DB}' exists..."
    docker exec -e MYSQL_PWD="${MYSQL_PASSWORD}" "${MYSQL_CONTAINER}" \
        mysql -u "${MYSQL_USER}" -e "CREATE DATABASE IF NOT EXISTS \`${TEST_RESTORE_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
elif [ -n "${TARGET_DB}" ]; then
    RESTORE_DESTINATION="Specific Database: '${TARGET_DB}'"
fi

echo -e "${YELLOW}"
echo "=========================================================================="
echo "                       ATTENTION: RESTORE OPERATION                       "
echo "=========================================================================="
echo "  Container:         ${MYSQL_CONTAINER}"
echo "  Backup File:       ${BACKUP_FILE}"
echo "  Restore Target:    ${RESTORE_DESTINATION}"
echo "  File Size:         $(du -h "${BACKUP_FILE}" | cut -f1)"
echo "  Execution Time:    $(date +'%Y-%m-%d %H:%M:%S')"
echo "=========================================================================="
echo -e "${NC}"

if [ "${FORCE_RESTORE}" != "true" ]; then
    echo -e "${RED}WARNING: This operation may OVERWRITE existing tables and data!${NC}"
    read -r -p "Are you sure you want to proceed with restore? [y/N]: " CONFIRMATION
    case "${CONFIRMATION}" in
        [yY]|[yY][eE][sS])
            log_info "Confirmation received. Proceeding with restore..."
            ;;
        *)
            log_warn "Restore operation cancelled by user. No changes were made."
            exit 0
            ;;
    esac
else
    log_warn "Force mode enabled (--force / -y). Bypassing confirmation prompt."
fi

# --- 4. Execute Restoration ---
log_info "=== [4/5] Executing Data Restoration ==="
START_TIME=$(date +%s)

# Construct command pipe safely
# If a specific or test database is given, feed into that database
MYSQL_EXEC_ARGS=(-u "${MYSQL_USER}" --default-character-set=utf8mb4)
if [ -n "${TEST_RESTORE_DB}" ]; then
    MYSQL_EXEC_ARGS+=("${TEST_RESTORE_DB}")
elif [ -n "${TARGET_DB}" ]; then
    MYSQL_EXEC_ARGS+=("${TARGET_DB}")
fi

if [ "${IS_GZ}" = true ]; then
    log_info "Streaming decompression and importing into MySQL..."
    if gzip -dc "${BACKUP_FILE}" | docker exec -i -e MYSQL_PWD="${MYSQL_PASSWORD}" \
        "${MYSQL_CONTAINER}" mysql "${MYSQL_EXEC_ARGS[@]}"; then
        RESTORE_STATUS=0
    else
        RESTORE_STATUS=$?
    fi
else
    log_info "Importing plain SQL file into MySQL..."
    if docker exec -i -e MYSQL_PWD="${MYSQL_PASSWORD}" \
        "${MYSQL_CONTAINER}" mysql "${MYSQL_EXEC_ARGS[@]}" < "${BACKUP_FILE}"; then
        RESTORE_STATUS=0
    else
        RESTORE_STATUS=$?
    fi
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ ${RESTORE_STATUS} -ne 0 ]; then
    log_error "Database restore failed with exit code ${RESTORE_STATUS}."
    exit 9
fi

# --- 5. Post-Restore Verification ---
log_info "=== [5/5] Post-Restore Verification ==="

CHECK_DB="${TEST_RESTORE_DB:-${TARGET_DB:-auth_db}}"
TABLE_COUNT=$(docker exec -e MYSQL_PWD="${MYSQL_PASSWORD}" "${MYSQL_CONTAINER}" \
    mysql -u "${MYSQL_USER}" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${CHECK_DB}';" 2>/dev/null || echo "0")

log_success "Restore completed successfully in ${DURATION} second(s)!"
log_info "Verified database '${CHECK_DB}': Contains ${TABLE_COUNT} table(s)."

echo "RESTORE_STATUS=SUCCESS"
echo "RESTORE_DURATION_SEC=${DURATION}"
exit 0
