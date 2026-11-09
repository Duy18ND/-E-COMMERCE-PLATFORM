#!/usr/bin/env bash
# ==============================================================================
# ShopMart E-Commerce Platform — MySQL Automated Backup Script
# Task: ECOM-153 / ECOM-154
#
# Description:
#   Performs a consistent, compressed (gzip) backup of all ShopMart MySQL
#   databases (auth_db, product_db, order_db, payment_db) using mysqldump
#   via Docker container. Enforces strict error checking, password masking,
#   integrity validation, and an automatic retention policy.
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
# Search order: 1) /opt/shopmart/.env (VPS Production), 2) ${PROJECT_ROOT}/backend/.env, 3) ${PROJECT_ROOT}/.env
if [ -f "/opt/shopmart/.env" ]; then
    log_info "Loading environment variables from /opt/shopmart/.env"
    set -a
    # shellcheck disable=SC1091
    source "/opt/shopmart/.env"
    set +a
elif [ -f "${PROJECT_ROOT}/backend/.env" ]; then
    log_info "Loading environment variables from ${PROJECT_ROOT}/backend/.env"
    set -a
    # shellcheck disable=SC1091
    source "${PROJECT_ROOT}/backend/.env"
    set +a
elif [ -f "${PROJECT_ROOT}/.env" ]; then
    log_info "Loading environment variables from ${PROJECT_ROOT}/.env"
    set -a
    # shellcheck disable=SC1091
    source "${PROJECT_ROOT}/.env"
    set +a
fi

# --- Default Configurations ---
MYSQL_CONTAINER="${MYSQL_CONTAINER:-ecommerce-mysql}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_ROOT_PASSWORD:-rootpassword}"
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
BACKUP_TARGET="${BACKUP_TARGET:-all}" # "all" or specific database name (e.g. auth_db)
CORE_DATABASES=("auth_db" "product_db" "order_db" "payment_db")

# --- Parse Optional CLI Arguments ---
while [[ $# -gt 0 ]]; do
    case "$1" in
        -d|--database)
            BACKUP_TARGET="$2"
            shift 2
            ;;
        -c|--container)
            MYSQL_CONTAINER="$2"
            shift 2
            ;;
        -o|--output-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -r|--retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -d, --database <name>   Target database name (default: 'all')"
            echo "  -c, --container <name>  MySQL container name (default: 'ecommerce-mysql')"
            echo "  -o, --output-dir <path> Directory to store backups (default: '../../backups')"
            echo "  -r, --retention <days>  Retention threshold in days (default: 7)"
            echo "  -h, --help              Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown argument: $1"
            exit 1
            ;;
    esac
done

# --- 1. Validate Prerequisites ---
log_info "=== [1/5] Validating Backup Environment & Prerequisites ==="

# Check docker availability
if ! command -v docker &>/dev/null; then
    log_error "Docker CLI is not installed or not in PATH."
    exit 2
fi

# Check gzip availability
if ! command -v gzip &>/dev/null; then
    log_error "gzip utility is required for compression but was not found in PATH."
    exit 2
fi

# Ensure backup destination directory exists
if [ ! -d "${BACKUP_DIR}" ]; then
    log_info "Creating backup directory: ${BACKUP_DIR}"
    mkdir -p "${BACKUP_DIR}"
fi

# Check if MySQL container is running
if ! docker ps --format '{{.Names}}' | grep -wq "^${MYSQL_CONTAINER}$"; then
    log_error "MySQL container '${MYSQL_CONTAINER}' is NOT running."
    log_error "Please start the database container before initiating backup (e.g. docker compose up -d mysql)."
    exit 3
fi

# Check database ping response inside container (without logging password)
log_info "Verifying database connectivity on container '${MYSQL_CONTAINER}'..."
if ! docker exec -e MYSQL_PWD="${MYSQL_PASSWORD}" "${MYSQL_CONTAINER}" \
    mysqladmin ping -u "${MYSQL_USER}" --silent; then
    log_error "Failed to authenticate or connect to MySQL inside '${MYSQL_CONTAINER}'."
    exit 4
fi
log_success "MySQL service is healthy and responsive."

# --- 2. Determine Backup Target & Filename ---
TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"
if [ "${BACKUP_TARGET}" = "all" ]; then
    BACKUP_FILE="${BACKUP_DIR}/mysql_backup_${TIMESTAMP}.sql.gz"
    DUMP_TITLE="All System Databases (--all-databases)"
    DUMP_CMD=(mysqldump -u "${MYSQL_USER}" \
        --all-databases \
        --single-transaction \
        --quick \
        --routines \
        --triggers \
        --events \
        --default-character-set=utf8mb4)
else
    BACKUP_FILE="${BACKUP_DIR}/mysql_backup_${BACKUP_TARGET}_${TIMESTAMP}.sql.gz"
    DUMP_TITLE="Database: ${BACKUP_TARGET}"
    DUMP_CMD=(mysqldump -u "${MYSQL_USER}" \
        --databases "${BACKUP_TARGET}" \
        --single-transaction \
        --quick \
        --routines \
        --triggers \
        --default-character-set=utf8mb4)
fi

log_info "=== [2/5] Initiating MySQL Dump: ${DUMP_TITLE} ==="
log_info "Target Destination: ${BACKUP_FILE}"

# --- 3. Execute mysqldump with Streaming Gzip Compression ---
START_TIME=$(date +%s)

# Execute via docker exec passing password via MYSQL_PWD to prevent CLI exposure
# pipefail ensures pipeline fails if mysqldump or gzip fails
if docker exec -e MYSQL_PWD="${MYSQL_PASSWORD}" "${MYSQL_CONTAINER}" \
    "${DUMP_CMD[@]}" | gzip -9 > "${BACKUP_FILE}"; then
    DUMP_STATUS=0
else
    DUMP_STATUS=$?
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ ${DUMP_STATUS} -ne 0 ]; then
    log_error "mysqldump command failed with exit code ${DUMP_STATUS}."
    [ -f "${BACKUP_FILE}" ] && rm -f "${BACKUP_FILE}"
    exit 5
fi

# --- 4. Validate Backup Archive Integrity ---
log_info "=== [3/5] Verifying Generated Archive Integrity ==="

# Check file exists and has non-zero size
if [ ! -s "${BACKUP_FILE}" ]; then
    log_error "Backup archive was created but is EMPTY (0 bytes). Removing corrupt file."
    rm -f "${BACKUP_FILE}"
    exit 6
fi

# Test gzip integrity
if ! gzip -t "${BACKUP_FILE}"; then
    log_error "Backup archive failed gzip integrity check! Archive is corrupted."
    rm -f "${BACKUP_FILE}"
    exit 7
fi

# Verify SQL structure inside archive (inspect header)
HEADER_SNIPPET=$(gzip -dc "${BACKUP_FILE}" | head -n 15 || true)
if ! echo "${HEADER_SNIPPET}" | grep -qEi "MySQL dump|Host:"; then
    log_error "Backup content does not match a valid MySQL dump structure."
    rm -f "${BACKUP_FILE}"
    exit 8
fi

FILE_SIZE_BYTES=$(wc -c < "${BACKUP_FILE}" | tr -d ' ')
FILE_SIZE_HUMAN=$(du -h "${BACKUP_FILE}" | cut -f1)

log_success "Backup archive verified successfully!"
log_info "Archive: $(basename "${BACKUP_FILE}")"
log_info "Compressed Size: ${FILE_SIZE_HUMAN} (${FILE_SIZE_BYTES} bytes)"
log_info "Duration: ${DURATION} second(s)"

# --- 5. Apply Retention Policy ---
log_info "=== [4/5] Enforcing Retention Policy (Keep last ${RETENTION_DAYS} days) ==="
CLEANED_COUNT=0

# Safely search ONLY within BACKUP_DIR for matching backup files older than RETENTION_DAYS
if [ -d "${BACKUP_DIR}" ]; then
    while IFS= read -r old_file; do
        if [ -f "${old_file}" ]; then
            log_info "Removing expired backup archive: $(basename "${old_file}")"
            rm -f "${old_file}"
            CLEANED_COUNT=$((CLEANED_COUNT + 1))
        fi
    done < <(find "${BACKUP_DIR}" -maxdepth 1 -type f \( -name "mysql_backup_*.sql.gz" -o -name "mysql_backup_*.sql" \) -mtime +"${RETENTION_DAYS}")
fi

if [ ${CLEANED_COUNT} -gt 0 ]; then
    log_success "Cleaned up ${CLEANED_COUNT} expired backup file(s)."
else
    log_info "No backup files exceeded the ${RETENTION_DAYS}-day retention threshold."
fi

# --- 6. Summary ---
log_info "=== [5/5] Backup Operation Completed ==="
log_success "BACKUP OPERATION SUCCEEDED."
echo "OUTPUT_FILE=${BACKUP_FILE}"
echo "OUTPUT_SIZE_BYTES=${FILE_SIZE_BYTES}"
echo "STATUS=SUCCESS"
exit 0
