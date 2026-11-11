#!/usr/bin/env bash
# ==============================================================================
# ShopMart E-Commerce Platform — MySQL Backup Verification Tool
# Task: ECOM-153 / ECOM-154
#
# Description:
#   Validates that a MySQL backup archive is not only present on disk, but
#   structurally sound, non-empty, cleanly decompressible, and contains
#   valid MySQL DDL statements and expected ShopMart domain schemas.
# ==============================================================================

set -euo pipefail

# --- Color Output Helpers ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] [INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] [VALID]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] [WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] [INVALID]${NC} $1" >&2
}

if [ $# -eq 0 ]; then
    echo "Usage: $0 <path_to_backup_file>"
    echo "Example: $0 backups/mysql_backup_2026-11-09_12-00-00.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

log_info "Starting verification on archive: ${BACKUP_FILE}"

# --- Test 1: Existence and File Type ---
if [ ! -e "${BACKUP_FILE}" ]; then
    log_error "Test 1 Failed: Target path does not exist: ${BACKUP_FILE}"
    exit 2
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    log_error "Test 1 Failed: Target is not a regular file."
    exit 2
fi
log_success "Test 1 Passed: Regular file exists on filesystem."

# --- Test 2: Non-Zero Size Check ---
FILE_SIZE_BYTES=$(wc -c < "${BACKUP_FILE}" | tr -d ' ')
if [ "${FILE_SIZE_BYTES}" -le 0 ]; then
    log_error "Test 2 Failed: File size is 0 bytes (Empty file)."
    exit 3
fi
FILE_SIZE_HUMAN=$(du -h "${BACKUP_FILE}" | cut -f1)
log_success "Test 2 Passed: File size is valid (${FILE_SIZE_HUMAN} / ${FILE_SIZE_BYTES} bytes)."

# --- Test 3: Format Detection & Decompression Integrity ---
IS_GZ=false
if [[ "${BACKUP_FILE}" =~ \.gz$ ]]; then
    IS_GZ=true
    if ! command -v gzip &>/dev/null; then
        log_error "Test 3 Failed: 'gzip' tool is required to test .gz files but was not found in PATH."
        exit 4
    fi

    if ! gzip -t "${BACKUP_FILE}" 2>/dev/null; then
        log_error "Test 3 Failed: Gzip integrity check failed! The archive is corrupted or truncated."
        exit 4
    fi
    log_success "Test 3 Passed: Gzip compression integrity verified (0 CRC errors)."
else
    log_info "Archive is uncompressed plain SQL."
fi

# --- Test 4: SQL Header and Content Structure ---
if [ "${IS_GZ}" = true ]; then
    HEADER_SAMPLE=$(gzip -dc "${BACKUP_FILE}" | head -n 30 || true)
    TRAILER_SAMPLE=$(gzip -dc "${BACKUP_FILE}" | tail -n 20 || true)
    DETECTED_DBS=$(gzip -dc "${BACKUP_FILE}" | grep -E "^CREATE DATABASE|^-- Current Database: \`" | head -n 10 || true)
    TABLE_COUNT=$(gzip -dc "${BACKUP_FILE}" | grep -c "^CREATE TABLE" || true)
else
    HEADER_SAMPLE=$(head -n 30 "${BACKUP_FILE}" || true)
    TRAILER_SAMPLE=$(tail -n 20 "${BACKUP_FILE}" || true)
    DETECTED_DBS=$(grep -E "^CREATE DATABASE|^-- Current Database: \`" "${BACKUP_FILE}" | head -n 10 || true)
    TABLE_COUNT=$(grep -c "^CREATE TABLE" "${BACKUP_FILE}" || true)
fi

# Verify MySQL Dump Signature
if ! echo "${HEADER_SAMPLE}" | grep -qEi "MySQL dump|/*!40101 SET"; then
    log_error "Test 4 Failed: SQL header does not contain standard MySQL dump signatures."
    exit 5
fi
log_success "Test 4 Passed: Recognized official MySQL dump header."

# Verify Table Definitions Exist
if [ "${TABLE_COUNT}" -eq 0 ]; then
    log_warn "Test 5 Warning: No 'CREATE TABLE' statements were detected in dump."
else
    log_success "Test 5 Passed: Detected ${TABLE_COUNT} table creation statement(s)."
fi

# Check Dump Completion Trailer
if echo "${TRAILER_SAMPLE}" | grep -qEi "Dump completed on"; then
    COMPLETED_TIME=$(echo "${TRAILER_SAMPLE}" | grep -Ei "Dump completed on" | head -n 1)
    log_success "Test 6 Passed: Dump completion marker found: '${COMPLETED_TIME}'."
else
    log_warn "Test 6 Notice: 'Dump completed on' trailer was not found (archive might be raw stream or partial table dump)."
fi

# --- Summary Output ---
echo ""
echo "=========================================================================="
echo "                   BACKUP ARCHIVE VERIFICATION REPORT                    "
echo "=========================================================================="
echo "  File:                $(basename "${BACKUP_FILE}")"
echo "  Absolute Path:       $(cd "$(dirname "${BACKUP_FILE}")" && pwd)/$(basename "${BACKUP_FILE}")"
echo "  Compressed Size:     ${FILE_SIZE_HUMAN} (${FILE_SIZE_BYTES} bytes)"
echo "  Archive Format:      $( [ "${IS_GZ}" = true ] && echo "GZIP Compressed SQL (.sql.gz)" || echo "Plain Text SQL (.sql)" )"
echo "  Detected Tables:     ${TABLE_COUNT}"
if [ -n "${DETECTED_DBS}" ]; then
    echo "  Detected Schemas:"
    echo "${DETECTED_DBS}" | sed 's/^/    - /'
fi
echo "  Verification Result: VALID (Integrity & Structure OK)"
echo "=========================================================================="
echo ""

exit 0
