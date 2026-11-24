#!/usr/bin/env bash
set -euo pipefail
set +x
umask 077

# Re-validate inputs inside remote shell (exact 7-char sha)
if ! [[ "${IMAGE_TAG:-}" =~ ^sha-[0-9a-fA-F]{7}$ ]]; then
  echo "ERROR: Invalid IMAGE_TAG received on remote host."
  exit 1
fi
if ! [[ "${REPO_OWNER:-}" =~ ^[a-z0-9._-]+$ ]]; then
  echo "ERROR: Invalid REPO_OWNER received on remote host."
  exit 1
fi

PROJECT_ROOT="/opt/shopmart"
COMPOSE_DIR="${PROJECT_ROOT}/backend"
BACKUP_ROOT="${PROJECT_ROOT}/backups"
STAGE_DIR="/tmp/shopmart-deploy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="${BACKUP_ROOT}/${TIMESTAMP}_pre_deploy.sql"
DUMP_GZ="${DUMP_FILE}.gz"
DOCKER_TMP_CONFIG=""
CONFIG_BACKUP_DIR=""
ENV_BACKUP_FILE=""
PRESERVE_BACKUPS=false

cleanup_on_exit() {
  if [[ -n "${DOCKER_TMP_CONFIG:-}" ]] && [[ -d "${DOCKER_TMP_CONFIG}" ]]; then
    rm -rf "${DOCKER_TMP_CONFIG}"
  fi
  rm -rf "${STAGE_DIR}"
  rm -f "${COMPOSE_DIR}/docker-compose.rollback.yml"

  if [[ "${PRESERVE_BACKUPS}" = "true" ]]; then
    echo "BACKUP RETENTION: Preserving recovery files for manual intervention:"
    [[ -n "${CONFIG_BACKUP_DIR:-}" ]] && echo "  CONFIG_BACKUP_DIR=${CONFIG_BACKUP_DIR}"
    [[ -n "${ENV_BACKUP_FILE:-}" ]] && echo "  ENV_BACKUP_FILE=${ENV_BACKUP_FILE}"
  else
    if [[ -n "${CONFIG_BACKUP_DIR:-}" ]] && [[ -d "${CONFIG_BACKUP_DIR}" ]]; then
      rm -rf "${CONFIG_BACKUP_DIR}"
    fi
    if [[ -n "${ENV_BACKUP_FILE:-}" ]] && [[ -f "${ENV_BACKUP_FILE}" ]]; then
      rm -f "${ENV_BACKUP_FILE}"
    fi
  fi
}
trap cleanup_on_exit EXIT

APP_SERVICES="discovery-server auth-service product-service order-service payment-service chatbot-service api-gateway frontend"
INFRA_SERVICES="zookeeper kafka mysql redis nginx"
MANAGED_CONFIG_FILES="docker-compose.yml docker-compose.prod.yml .env.prod.example docker/mysql/init.sql docker/nginx/nginx.prod.conf"

dc() {
  docker compose --env-file .env -p backend -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.vps.yml "$@"
}

container_name_for() {
  case "$1" in
    zookeeper)        echo "ecommerce-zookeeper" ;;
    kafka)            echo "ecommerce-kafka" ;;
    mysql)            echo "ecommerce-mysql" ;;
    redis)            echo "ecommerce-redis" ;;
    discovery-server) echo "ecommerce-discovery-server" ;;
    auth-service)     echo "ecommerce-auth-service" ;;
    product-service)  echo "ecommerce-product-service" ;;
    order-service)    echo "ecommerce-order-service" ;;
    payment-service)  echo "ecommerce-payment-service" ;;
    chatbot-service)  echo "ecommerce-chatbot-service" ;;
    api-gateway)      echo "ecommerce-api-gateway" ;;
    frontend)         echo "ecommerce-frontend" ;;
    nginx)            echo "ecommerce-nginx" ;;
    *)                echo "ecommerce-$1" ;;
  esac
}

assert_service_healthy() {
  local svc="$1"
  local cname running health
  cname=$(container_name_for "$svc")
  running=$(docker inspect -f '{{.State.Running}}' "$cname" 2>/dev/null || echo "false")
  health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cname" 2>/dev/null || echo "missing")
  if [[ "$running" != "true" ]] || [[ "$health" != "healthy" ]]; then
    echo "  [FAIL] Dependency ${cname} is not running+healthy (running=${running}, health=${health})."
    return 1
  fi
  return 0
}

wait_service_healthy() {
  local svc="$1"
  local cname
  cname=$(container_name_for "$svc")
  local attempts=0
  local max_attempts=30
  local running="false"
  local health="missing"
  while [[ $attempts -lt $max_attempts ]]; do
    attempts=$((attempts + 1))
    running=$(docker inspect -f '{{.State.Running}}' "$cname" 2>/dev/null || echo "false")
    health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cname" 2>/dev/null || echo "missing")
    if [[ "$running" = "true" ]] && [[ "$health" = "healthy" ]]; then
      echo "  [OK] ${cname} is running and healthy."
      return 0
    fi
    sleep 5
  done
  echo "  [FAIL] ${cname} did not become healthy within $((max_attempts * 5))s (running=${running}, health=${health})."
  return 1
}

verify_all_health_and_http() {
  local target_svcs="${1:-$APP_SERVICES}"
  local in_rollback="${2:-false}"
  echo "Verifying application containers (${target_svcs}) and Nginx..."
  for svc in $target_svcs nginx; do
    if ! assert_service_healthy "$svc"; then
      return 1
    fi
    echo "  [OK] $(container_name_for "$svc") is running and healthy."
  done

  echo "Verifying endpoints via Nginx loopback..."
  local endpoints="/healthz / /api/v1/products /api/v1/products/categories"
  if [[ " $target_svcs " == *" product-service "* ]]; then
    # Flash Sale is owned by product-service (FlashSaleController).
    # In forward deployment, it MUST be verified. In rollback to legacy Sprint 1, verify if previous version was not unversioned.
    if [[ "$in_rollback" != "true" ]] || [[ -n "${PREV_ENV_IMAGE_TAG:-}" ]]; then
      endpoints="${endpoints} /api/v1/flash-sales/active"
    fi
  fi
  for endpoint in $endpoints; do
    local code="000"
    local status_line=""
    if exec 3<>/dev/tcp/127.0.0.1/80 2>/dev/null; then
      printf 'GET %s HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n' "${endpoint}" >&3
      IFS= read -t 15 -r status_line <&3 || true
      exec 3<&- 3>&-
      status_line="${status_line%$'\r'}"
      if [[ "$status_line" =~ ^HTTP/[0-9.]+[[:space:]]+([0-9]{3}) ]]; then
        code="${BASH_REMATCH[1]}"
      fi
    fi
    if [[ "$code" != "200" ]]; then
      echo "  [FAIL] GET ${endpoint} returned status ${code}"
      return 1
    fi
    echo "  [OK] GET ${endpoint} -> status 200"
  done
  return 0
}

restore_dir_exact() {
  local backup_dir="$1"
  local target_dir="$2"
  if [[ ! -d "$backup_dir" ]]; then
    return 1
  fi
  mkdir -p "$target_dir"
  find "$target_dir" -mindepth 1 -delete
  cp -a "${backup_dir}/." "${target_dir}/"
  diff -qr "$backup_dir" "$target_dir" >/dev/null
}

restore_configs_from_backup() {
  local ok=true
  if [[ -z "${CONFIG_BACKUP_DIR:-}" ]] || [[ ! -d "${CONFIG_BACKUP_DIR}" ]] || [[ ! -f "${CONFIG_BACKUP_DIR}/manifest.txt" ]]; then
    echo "ERROR: CONFIG_BACKUP_DIR or manifest.txt is missing; cannot restore configs."
    return 1
  fi
  echo "Restoring previous production configuration files from manifest..."
  while IFS='|' read -r state rel; do
    if [[ "$state" = "EXISTS" ]]; then
      if [[ ! -f "${CONFIG_BACKUP_DIR}/${rel}" ]]; then
        echo "  [FAIL] Backup missing for ${rel}"
        ok=false
      elif ! cp -p "${CONFIG_BACKUP_DIR}/${rel}" "${COMPOSE_DIR}/${rel}"; then
        echo "  [FAIL] Could not restore ${rel}"
        ok=false
      elif ! cmp -s "${CONFIG_BACKUP_DIR}/${rel}" "${COMPOSE_DIR}/${rel}"; then
        echo "  [FAIL] Restored ${rel} content mismatch!"
        ok=false
      fi
    elif [[ "$state" = "ABSENT" ]]; then
      if ! rm -f "${COMPOSE_DIR}/${rel}"; then
        echo "  [FAIL] Could not remove newly created file ${rel}"
        ok=false
      elif [[ -e "${COMPOSE_DIR}/${rel}" ]]; then
        echo "  [FAIL] Newly created file ${rel} still exists after rollback!"
        ok=false
      fi
    else
      echo "  [FAIL] Unknown manifest state '${state}' for ${rel}"
      ok=false
    fi
  done < "${CONFIG_BACKUP_DIR}/manifest.txt"

  if ! restore_dir_exact "${CONFIG_BACKUP_DIR}/migrations" "${COMPOSE_DIR}/docker/mysql/migrations"; then
    echo "  [FAIL] Could not restore/verify docker/mysql/migrations!"
    ok=false
  fi
  if ! restore_dir_exact "${CONFIG_BACKUP_DIR}/scripts_backup" "${PROJECT_ROOT}/scripts/backup"; then
    echo "  [FAIL] Could not restore/verify scripts/backup!"
    ok=false
  fi

  if [[ "$ok" != "true" ]]; then
    return 1
  fi
  echo "  [OK] All configuration files (existing & absent), migration SQL files, and scripts restored and verified on host filesystem."
  return 0
}

update_env_image_tag() {
  local env_file="$1"
  local new_tag="$2"
  local tmp_env
  tmp_env=$(mktemp "${COMPOSE_DIR}/.env.tmp.XXXXXX")
  chmod --reference="$env_file" "$tmp_env" 2>/dev/null || chmod 600 "$tmp_env"
  awk -v tag="$new_tag" '
    BEGIN { updated = 0 }
    /^IMAGE_TAG=/ {
      if (updated == 0) {
        print "IMAGE_TAG=" tag
        updated = 1
      }
      next
    }
    { print }
    END {
      if (updated == 0) {
        print "IMAGE_TAG=" tag
      }
    }
  ' "$env_file" > "$tmp_env"
  mv -f "$tmp_env" "$env_file"
}

read_env_image_tag() {
  local env_file="$1"
  local tag_count tag_val
  tag_count=$(grep -c '^IMAGE_TAG=' "$env_file" || true)
  if [[ "$tag_count" -ne 1 ]]; then
    return 1
  fi
  tag_val=$(grep -E '^IMAGE_TAG=' "$env_file" | head -n1 | cut -d'=' -f2- | tr -d '\r')
  tag_val="${tag_val%\"}"
  tag_val="${tag_val#\"}"
  tag_val="${tag_val%\'}"
  tag_val="${tag_val#\'}"
  if [[ -z "$tag_val" ]]; then
    return 1
  fi
  printf '%s' "$tag_val"
}

read_env_var() {
  local env_file="$1"
  local key="$2"
  local count val
  count=$(grep -c "^${key}=" "$env_file" || true)
  if [[ "$count" -lt 1 ]]; then
    return 1
  fi
  val=$(grep -E "^${key}=" "$env_file" | head -n1 | cut -d'=' -f2- | tr -d '\r')
  val="${val%\"}"
  val="${val#\"}"
  val="${val%\'}"
  val="${val#\'}"
  if [[ -z "$val" ]]; then
    return 1
  fi
  printf '%s' "$val"
}

extract_service_block_hash() {
  local rendered_yaml="$1"
  local svc="$2"
  printf '%s\n' "$rendered_yaml" \
    | awk -v target="  ${svc}:" '
        /^services:/ { in_svc=1; next }
        in_svc && /^[^ ]/ { exit }
        in_svc && $0 == target { in_target=1; print; next }
        in_target && /^  [^ ]/ { exit }
        in_target { print }
      ' \
    | sha256sum | awk '{print $1}'
}

# ─────────────────────────────────────────────────────────
#  Phases [1..6]: Read-Only Preflight (NO prod files modified)
# ─────────────────────────────────────────────────────────
echo "=== [1/8] Validating Staged Files & Pre-Validating Staged Compose ==="
for dir in "${COMPOSE_DIR}" "${COMPOSE_DIR}/docker/mysql/migrations" "${COMPOSE_DIR}/docker/nginx" "${PROJECT_ROOT}/scripts/backup" "${BACKUP_ROOT}"; do
  if [[ ! -d "$dir" ]]; then
    mkdir -p "$dir"
  fi
done
chmod 700 "${BACKUP_ROOT}"

for required_vps_file in "${COMPOSE_DIR}/.env" "${COMPOSE_DIR}/docker-compose.vps.yml"; do
  if [[ ! -f "$required_vps_file" ]]; then
    echo "ERROR: Required VPS file '${required_vps_file}' is missing! Aborting."
    exit 1
  fi
done

for req_key in "MYSQL_ROOT_PASSWORD" "MYSQL_USER" "MYSQL_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET" "EUREKA_USER" "EUREKA_PASSWORD" "INTERNAL_SERVICE_KEY"; do
  if ! read_env_var "${COMPOSE_DIR}/.env" "$req_key" >/dev/null 2>&1; then
    echo "ERROR: Required production variable '${req_key}' is missing or empty in ${COMPOSE_DIR}/.env! Production untouched."
    exit 1
  fi
done
VPS_MYSQL_USER=$(read_env_var "${COMPOSE_DIR}/.env" "MYSQL_USER")
if ! [[ "$VPS_MYSQL_USER" =~ ^[a-zA-Z0-9_]+$ ]]; then
  echo "ERROR: Invalid MYSQL_USER format in ${COMPOSE_DIR}/.env! Production untouched."
  exit 1
fi
if read_env_var "${COMPOSE_DIR}/.env" "GEMINI_API_KEY" >/dev/null 2>&1 || read_env_var "${COMPOSE_DIR}/.env" "AI_API_KEY" >/dev/null 2>&1; then
  echo "  [ENV OK] All required production secrets and GEMINI_API_KEY/AI_API_KEY are present in .env."
else
  echo "  [ENV WARN] GEMINI_API_KEY is not set in .env; chatbot-service will run with fallback responses until configured."
fi

for rel in $MANAGED_CONFIG_FILES; do
  if [[ ! -f "${STAGE_DIR}/backend/${rel}" ]]; then
    echo "ERROR: Expected staged file '${STAGE_DIR}/backend/${rel}' is missing! Production untouched."
    exit 1
  fi
done
if [[ ! -d "${STAGE_DIR}/backend/docker/mysql/migrations" ]] || [[ ! -d "${STAGE_DIR}/scripts/backup" ]]; then
  echo "ERROR: Staged migrations or backup scripts directory missing! Production untouched."
  exit 1
fi

if ! IMAGE_REGISTRY="ghcr.io" IMAGE_REPO_OWNER="${REPO_OWNER}" IMAGE_TAG="${IMAGE_TAG}" \
  docker compose --env-file "${COMPOSE_DIR}/.env" -p backend \
  -f "${STAGE_DIR}/backend/docker-compose.yml" \
  -f "${STAGE_DIR}/backend/docker-compose.prod.yml" \
  -f "${COMPOSE_DIR}/docker-compose.vps.yml" config --quiet; then
  echo "ERROR: Staged Compose configuration failed validation! Production untouched."
  exit 1
fi

echo "=== [2/8] Verifying Existing Infrastructure Dependencies ==="
for infra in $INFRA_SERVICES; do
  if ! assert_service_healthy "$infra"; then
    echo "ERROR: Infrastructure service '${infra}' must be running and healthy. Production untouched."
    exit 1
  fi
  echo "  [OK] $(container_name_for "$infra") is running and healthy."
done

echo "=== [3/8] Authenticating with Temporary Docker Config & Verifying 8 GHCR Packages ==="
DOCKER_TMP_CONFIG=$(mktemp -d)
chmod 700 "${DOCKER_TMP_CONFIG}"
export DOCKER_CONFIG="${DOCKER_TMP_CONFIG}"

verify_ghcr_packages() {
  for svc in $APP_SERVICES; do
    if ! docker manifest inspect "ghcr.io/${REPO_OWNER}/${svc}:${IMAGE_TAG}" >/dev/null 2>&1; then
      return 1
    fi
  done
  return 0
}

GHCR_AUTH_OK=false
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  if printf '%s' "${GITHUB_TOKEN}" | docker login ghcr.io -u "${GH_ACTOR}" --password-stdin >/dev/null 2>&1; then
    if verify_ghcr_packages; then
      echo "GHCR access verified via temporary Docker config (GITHUB_TOKEN) for all 8 packages (${REPO_OWNER}/*:${IMAGE_TAG})."
      GHCR_AUTH_OK=true
    fi
  fi
fi

if [[ "$GHCR_AUTH_OK" != "true" ]]; then
  if [[ -n "${GHCR_PAT:-}" ]]; then
    if printf '%s' "${GHCR_PAT}" | docker login ghcr.io -u "${GHCR_PAT_USER}" --password-stdin >/dev/null 2>&1; then
      if verify_ghcr_packages; then
        echo "GHCR access verified via temporary Docker config (GHCR_TOKEN PAT) for all 8 packages (${REPO_OWNER}/*:${IMAGE_TAG})."
        GHCR_AUTH_OK=true
      fi
    fi
  fi
fi

if [[ "$GHCR_AUTH_OK" != "true" ]]; then
  echo "ERROR: GHCR authentication or package read verification failed for ghcr.io/${REPO_OWNER}/*:${IMAGE_TAG}. Production untouched."
  exit 1
fi

echo "=== [4/8] Mandatory & Verifiable Pre-Deployment MySQL Backup ==="
if ! docker exec ecommerce-mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqladmin ping -h localhost -u root --silent'; then
  echo "ERROR: MySQL root credential verification failed. Production untouched."
  exit 1
fi

: > "${DUMP_FILE}"
chmod 600 "${DUMP_FILE}"
echo "Creating MySQL backup at ${DUMP_GZ}..."
if ! docker exec ecommerce-mysql sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -u root --single-transaction --quick --routines --triggers --all-databases' > "${DUMP_FILE}"; then
  echo "ERROR: mysqldump exited with non-zero status. Production untouched."
  rm -f "${DUMP_FILE}"
  exit 1
fi

if [[ ! -s "${DUMP_FILE}" ]]; then
  echo "ERROR: Backup dump file is empty! Production untouched."
  exit 1
fi
for expected_db in "auth_db" "product_db" "order_db" "payment_db"; do
  if ! grep -q "$expected_db" "${DUMP_FILE}"; then
    echo "ERROR: Backup dump missing expected database '${expected_db}'. Production untouched."
    exit 1
  fi
done
gzip -f "${DUMP_FILE}"
if ! gzip -t "${DUMP_GZ}"; then
  echo "ERROR: gzip integrity check failed for ${DUMP_GZ}. Production untouched."
  exit 1
fi
chmod 600 "${DUMP_GZ}"
echo "Backup verified: ${DUMP_GZ} (perms=$(stat -c '%a' "${DUMP_GZ}"), size=$(stat -c '%s' "${DUMP_GZ}") bytes)."
echo "Note: gzip -t verifies archive integrity only and does not replace a restore test."

echo "=== [5/8] Capturing, Validating & Pinning Exact Previous Image Identities ==="
PREV_ENV_IMAGE_TAG=$(read_env_image_tag "${COMPOSE_DIR}/.env" || true)
if [[ -z "${PREV_ENV_IMAGE_TAG}" ]]; then
  echo "Current .env does not declare IMAGE_TAG yet (Sprint 1 -> immutable SHA transition mode)."
  ROLLBACK_TAG="pre-deploy-rollback"
else
  echo "Current .env IMAGE_TAG: ${PREV_ENV_IMAGE_TAG}"
  ROLLBACK_TAG="${PREV_ENV_IMAGE_TAG}"
fi

declare -A PREV_IMAGE_REF
declare -A PREV_IMAGE_ID
EXISTING_APP_SERVICES=""
for svc in $APP_SERVICES; do
  cname=$(container_name_for "$svc")
  if ! docker container inspect "$cname" >/dev/null 2>&1; then
    if [[ -z "${PREV_ENV_IMAGE_TAG}" ]] && [[ "$svc" = "chatbot-service" ]]; then
      PREV_IMAGE_REF["$svc"]="ABSENT"
      PREV_IMAGE_ID["$svc"]="ABSENT"
      echo "  [TRANSITION NEW SERVICE] ${svc}: container '${cname}' does not exist yet on VPS (allowed only during Sprint 1 transition; will be created on deploy; removed on rollback)."
      continue
    else
      if [[ -z "${PREV_ENV_IMAGE_TAG}" ]]; then
        echo "ERROR: Required Sprint 1 container '${cname}' for service '${svc}' is missing on VPS! Only chatbot-service may be absent during transition. Aborting deploy before touching production."
      else
        echo "ERROR: Required container '${cname}' for service '${svc}' is missing on VPS in steady-state mode (IMAGE_TAG=${PREV_ENV_IMAGE_TAG})! All 8 application containers must exist. Aborting."
      fi
      exit 1
    fi
  fi

  prev_ref=$(docker inspect -f '{{.Config.Image}}' "$cname" 2>/dev/null || echo "")
  prev_id=$(docker inspect -f '{{.Image}}' "$cname" 2>/dev/null || echo "")
  if [[ -z "$prev_ref" ]] || [[ -z "$prev_id" ]]; then
    echo "ERROR: Could not capture running image identity for existing container ${cname}. Production untouched."
    exit 1
  fi
  if ! docker image inspect "$prev_id" >/dev/null 2>&1; then
    echo "ERROR: Local image ID ${prev_id} for ${svc} is not present locally. Production untouched."
    exit 1
  fi

  if [[ -n "${PREV_ENV_IMAGE_TAG}" ]]; then
    prev_tag="${prev_ref##*:}"
    expected_ref="ghcr.io/${REPO_OWNER}/${svc}:${prev_tag}"
    if [[ "$prev_tag" = "$prev_ref" ]] || [[ "$prev_ref" != "$expected_ref" ]]; then
      echo "ERROR: Running image '${prev_ref}' for ${svc} does not match Compose template '${expected_ref}'. Aborting."
      exit 1
    fi
    if [[ "$prev_tag" != "$PREV_ENV_IMAGE_TAG" ]]; then
      echo "ERROR: Running image tag '${prev_tag}' for ${svc} does not match .env IMAGE_TAG '${PREV_ENV_IMAGE_TAG}'. Aborting."
      exit 1
    fi
  else
    echo "  [TRANSITION] ${svc}: captured heterogeneous Sprint 1 image ref='${prev_ref}' id='${prev_id}'."
  fi

  PREV_IMAGE_REF["$svc"]="$prev_ref"
  PREV_IMAGE_ID["$svc"]="$prev_id"
  EXISTING_APP_SERVICES="${EXISTING_APP_SERVICES} ${svc}"
  docker tag "$prev_id" "shopmart-rollback/${svc}:pre-deploy"
  echo "  [PINNED] ${svc}: ref=${prev_ref} id=${prev_id} -> shopmart-rollback/${svc}:pre-deploy"
done
EXISTING_APP_SERVICES=$(echo "$EXISTING_APP_SERVICES" | xargs)

PREV_NGINX_IMAGE_REF=$(docker inspect -f '{{.Config.Image}}' ecommerce-nginx 2>/dev/null || echo "")
PREV_NGINX_IMAGE_ID=$(docker inspect -f '{{.Image}}' ecommerce-nginx 2>/dev/null || echo "")
if [[ -z "$PREV_NGINX_IMAGE_REF" ]] || [[ -z "$PREV_NGINX_IMAGE_ID" ]] || ! docker image inspect "$PREV_NGINX_IMAGE_ID" >/dev/null 2>&1; then
  echo "ERROR: Could not capture/verify running image identity for ecommerce-nginx. Production untouched."
  exit 1
fi
docker tag "$PREV_NGINX_IMAGE_ID" "shopmart-rollback/nginx:pre-deploy"
echo "  [PINNED] nginx: ref=${PREV_NGINX_IMAGE_REF} id=${PREV_NGINX_IMAGE_ID}"

echo "=== [6/8] Pulling Target Immutable Images (${IMAGE_TAG}) & Detecting Changes ==="
export IMAGE_REGISTRY="ghcr.io"
export IMAGE_REPO_OWNER="${REPO_OWNER}"
export IMAGE_TAG="${IMAGE_TAG}"

cd "${COMPOSE_DIR}"
dc pull $APP_SERVICES

CHANGED_SERVICES=""
for svc in $APP_SERVICES; do
  target_ref="ghcr.io/${REPO_OWNER}/${svc}:${IMAGE_TAG}"
  new_id=$(docker image inspect -f '{{.Id}}' "$target_ref" 2>/dev/null || echo "")
  if [[ -z "$new_id" ]]; then
    echo "ERROR: Target image '${target_ref}' not found locally after pull! Production untouched."
    exit 1
  fi
  if [[ "${PREV_IMAGE_ID[$svc]}" != "$new_id" ]]; then
    echo "  [CHANGED] ${svc}: ${PREV_IMAGE_ID[$svc]} -> ${new_id}"
    CHANGED_SERVICES="${CHANGED_SERVICES} ${svc}"
  else
    echo "  [UNCHANGED] ${svc}: digest unchanged."
  fi
done
CHANGED_SERVICES=$(echo "$CHANGED_SERVICES" | xargs)

# ─────────────────────────────────────────────────────────
#  Phases [7..8]: Backup Prod Configs/.env, Apply & Rollback
# ─────────────────────────────────────────────────────────
echo "=== [7/8] Backing Up (with Manifest) & Applying Production Configs ==="
PRESERVE_BACKUPS=true
CONFIG_BACKUP_DIR=$(mktemp -d)
chmod 700 "${CONFIG_BACKUP_DIR}"
mkdir -p "${CONFIG_BACKUP_DIR}/docker/mysql" "${CONFIG_BACKUP_DIR}/docker/nginx" "${CONFIG_BACKUP_DIR}/migrations" "${CONFIG_BACKUP_DIR}/scripts_backup"
: > "${CONFIG_BACKUP_DIR}/manifest.txt"

BEFORE_NGINX_SHA=$(sha256sum "${COMPOSE_DIR}/docker/nginx/nginx.prod.conf" 2>/dev/null | awk '{print $1}' || echo "absent")
BEFORE_COMPOSE_RENDER=$(IMAGE_REGISTRY="ghcr.io" IMAGE_REPO_OWNER="${REPO_OWNER}" IMAGE_TAG="${IMAGE_TAG}" dc config 2>/dev/null || true)
if [[ -z "$BEFORE_COMPOSE_RENDER" ]]; then
  echo "ERROR: Could not render current production Compose configuration. Production untouched."
  exit 1
fi
declare -A BEFORE_SVC_COMPOSE_HASH
for svc in $APP_SERVICES nginx; do
  BEFORE_SVC_COMPOSE_HASH["$svc"]=$(extract_service_block_hash "$BEFORE_COMPOSE_RENDER" "$svc")
done
BEFORE_NGINX_COMPOSE_HASH="${BEFORE_SVC_COMPOSE_HASH[nginx]}"

for rel in $MANAGED_CONFIG_FILES; do
  if [[ -f "${COMPOSE_DIR}/${rel}" ]]; then
    cp -p "${COMPOSE_DIR}/${rel}" "${CONFIG_BACKUP_DIR}/${rel}"
    echo "EXISTS|${rel}" >> "${CONFIG_BACKUP_DIR}/manifest.txt"
  else
    echo "ABSENT|${rel}" >> "${CONFIG_BACKUP_DIR}/manifest.txt"
  fi
done
cp -a "${COMPOSE_DIR}/docker/mysql/migrations/." "${CONFIG_BACKUP_DIR}/migrations/"
cp -a "${PROJECT_ROOT}/scripts/backup/." "${CONFIG_BACKUP_DIR}/scripts_backup/"

ENV_BACKUP_FILE=$(mktemp)
chmod 600 "${ENV_BACKUP_FILE}"
cp -p "${COMPOSE_DIR}/.env" "${ENV_BACKUP_FILE}"

DEPLOY_OK=true
ATTEMPTED_SERVICES=""
NGINX_RELOADED=false
NGINX_RECREATED=false
COMPOSE_CHANGED_SERVICES=""
SERVICES_TO_RECREATE=""
AFTER_NGINX_COMPOSE_HASH="$BEFORE_NGINX_COMPOSE_HASH"

if ! (
  cp -f "${STAGE_DIR}/backend/docker-compose.yml" "${COMPOSE_DIR}/docker-compose.yml" &&
  cp -f "${STAGE_DIR}/backend/docker-compose.prod.yml" "${COMPOSE_DIR}/docker-compose.prod.yml" &&
  cp -f "${STAGE_DIR}/backend/.env.prod.example" "${COMPOSE_DIR}/.env.prod.example" &&
  cp -f "${STAGE_DIR}/backend/docker/mysql/init.sql" "${COMPOSE_DIR}/docker/mysql/init.sql" &&
  cp -f "${STAGE_DIR}/backend/docker/nginx/nginx.prod.conf" "${COMPOSE_DIR}/docker/nginx/nginx.prod.conf" &&
  cp -a "${STAGE_DIR}/backend/docker/mysql/migrations/." "${COMPOSE_DIR}/docker/mysql/migrations/" &&
  cp -a "${STAGE_DIR}/scripts/backup/." "${PROJECT_ROOT}/scripts/backup/" &&
  chmod +x "${PROJECT_ROOT}/scripts/backup/"*.sh &&
  IMAGE_REGISTRY="ghcr.io" IMAGE_REPO_OWNER="${REPO_OWNER}" IMAGE_TAG="${IMAGE_TAG}" dc config --quiet
); then
  echo "ERROR: Applying or validating production configuration files failed."
  DEPLOY_OK=false
fi

AFTER_NGINX_SHA=$(sha256sum "${COMPOSE_DIR}/docker/nginx/nginx.prod.conf" 2>/dev/null | awk '{print $1}' || echo "absent")
if [[ "$DEPLOY_OK" = "true" ]]; then
  AFTER_COMPOSE_RENDER=$(IMAGE_REGISTRY="ghcr.io" IMAGE_REPO_OWNER="${REPO_OWNER}" IMAGE_TAG="${IMAGE_TAG}" dc config 2>/dev/null || true)
  if [[ -z "$AFTER_COMPOSE_RENDER" ]]; then
    echo "ERROR: Could not render updated production Compose configuration."
    DEPLOY_OK=false
  else
    for svc in $APP_SERVICES; do
      after_svc_hash=$(extract_service_block_hash "$AFTER_COMPOSE_RENDER" "$svc")
      if [[ "${BEFORE_SVC_COMPOSE_HASH[$svc]}" != "$after_svc_hash" ]]; then
        echo "  [COMPOSE CHANGED] ${svc}: Compose configuration updated."
        COMPOSE_CHANGED_SERVICES="${COMPOSE_CHANGED_SERVICES} ${svc}"
      fi
    done
    COMPOSE_CHANGED_SERVICES=$(echo "$COMPOSE_CHANGED_SERVICES" | xargs)
    AFTER_NGINX_COMPOSE_HASH=$(extract_service_block_hash "$AFTER_COMPOSE_RENDER" "nginx")
    for svc in $APP_SERVICES; do
      if [[ " $CHANGED_SERVICES " == *" $svc "* ]] || [[ " $COMPOSE_CHANGED_SERVICES " == *" $svc "* ]]; then
        SERVICES_TO_RECREATE="${SERVICES_TO_RECREATE} ${svc}"
      fi
    done
    SERVICES_TO_RECREATE=$(echo "$SERVICES_TO_RECREATE" | xargs)
  fi
fi

echo "=== [8/8] Idempotent Database Migration, Staged Update, Verification & Unified Rollback ==="
run_and_verify_mysql_migrations() {
  local mig_file="${COMPOSE_DIR}/docker/mysql/migrations/apply_all_migrations.sql"
  if [[ ! -f "$mig_file" ]]; then
    echo "ERROR: Migration file '${mig_file}' is missing!"
    return 1
  fi
  echo "Executing idempotent database migration (${mig_file}) for configured user '${VPS_MYSQL_USER}'..."
  if ! (printf "SET @app_user = '%s';\n" "${VPS_MYSQL_USER}"; cat "${mig_file}") | \
    docker exec -i ecommerce-mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -u root'; then
    echo "ERROR: Database migration script execution failed!"
    return 1
  fi
  if ! docker exec -e TARGET_DB_USER="${VPS_MYSQL_USER}" ecommerce-mysql sh -c '
    set -e
    USER_HOSTS=$(MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -N -s -u root -e "SELECT DISTINCT Host FROM mysql.user WHERE User = '\''${TARGET_DB_USER}'\'';")
    if [ -z "$USER_HOSTS" ]; then
      echo "ERROR: User '\''${TARGET_DB_USER}'\'' does not exist in mysql.user! Cannot verify privileges."
      exit 1
    fi
    SCOPED_PRIVS="SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE"
    for h in $USER_HOSTS; do
      echo "  Verifying and ensuring scoped privileges on all 5 databases for '\''${TARGET_DB_USER}'\''@'\''${h}'\''..."
      MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -u root -e "
        GRANT ${SCOPED_PRIVS} ON auth_db.* TO '\''${TARGET_DB_USER}'\''@'\''${h}'\'';
        GRANT ${SCOPED_PRIVS} ON product_db.* TO '\''${TARGET_DB_USER}'\''@'\''${h}'\'';
        GRANT ${SCOPED_PRIVS} ON order_db.* TO '\''${TARGET_DB_USER}'\''@'\''${h}'\'';
        GRANT ${SCOPED_PRIVS} ON payment_db.* TO '\''${TARGET_DB_USER}'\''@'\''${h}'\'';
        GRANT ${SCOPED_PRIVS} ON chatbot_db.* TO '\''${TARGET_DB_USER}'\''@'\''${h}'\'';
        FLUSH PRIVILEGES;
      "
    done
  '; then
    echo "ERROR: Could not verify/grant privileges on all 5 databases to user '${VPS_MYSQL_USER}'!"
    return 1
  fi

  echo "Verifying post-migration database schemas, columns, and tables..."
  if ! docker exec ecommerce-mysql sh -c '
    set -e
    check_col() {
      local c
      c=$(MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -N -s -u root -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='\''$1'\'' AND TABLE_NAME='\''$2'\'' AND COLUMN_NAME='\''$3'\'';")
      if [ "$c" != "1" ]; then
        echo "  [SCHEMA FAIL] Missing column $1.$2.$3"
        return 1
      fi
    }
    check_tbl() {
      local c
      c=$(MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -N -s -u root -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='\''$1'\'' AND TABLE_NAME='\''$2'\'';")
      if [ "$c" != "1" ]; then
        echo "  [SCHEMA FAIL] Missing table $1.$2"
        return 1
      fi
    }
    check_col order_db orders subtotal_amount
    check_col order_db orders voucher_code
    check_col order_db orders discount_amount
    check_col order_db order_items is_flash_sale
    check_col payment_db payments user_id
    check_col payment_db payments version
    check_col product_db products version
    check_col product_db product_reviews status
    check_col product_db product_reviews hidden_reason
    check_tbl order_db vouchers
    check_tbl order_db voucher_usages
    check_tbl product_db flash_sale_campaigns
    check_tbl product_db flash_sale_items
    check_tbl chatbot_db chat_conversations
    check_tbl chatbot_db chat_messages
  '; then
    echo "ERROR: Post-migration schema verification failed! Aborting rollout before recreating application containers."
    return 1
  fi
  echo "  [OK] Database migration and post-migration schema verification PASSED."
  return 0
}

if [[ "$DEPLOY_OK" = "true" ]]; then
  if ! run_and_verify_mysql_migrations; then
    DEPLOY_OK=false
  fi
fi

update_stage() {
  local stage_svcs="$1"
  local required_deps="$2"
  local to_start=""
  for s in $stage_svcs; do
    if [[ " $SERVICES_TO_RECREATE " == *" $s "* ]]; then
      to_start="${to_start} ${s}"
    fi
  done
  to_start=$(echo "$to_start" | xargs)
  if [[ -z "$to_start" ]]; then
    return 0
  fi
  for dep in $required_deps; do
    if ! assert_service_healthy "$dep"; then
      echo "ERROR: Required dependency '${dep}' is not healthy before starting '${to_start}'."
      return 1
    fi
  done
  ATTEMPTED_SERVICES="${ATTEMPTED_SERVICES} ${to_start}"
  echo "Recreating stage services (--no-deps --no-build, dependencies verified healthy): ${to_start}"
  if ! dc up -d --no-deps --no-build $to_start; then
    return 1
  fi
  for s in $to_start; do
    if ! wait_service_healthy "$s"; then
      return 1
    fi
  done
  return 0
}

if [[ "$DEPLOY_OK" = "true" ]]; then
  if [[ -z "$SERVICES_TO_RECREATE" ]]; then
    echo "No application images or application Compose configurations changed."
  else
    echo "Application services scheduled for staged recreate: ${SERVICES_TO_RECREATE}"
    if ! update_stage "discovery-server" "mysql redis kafka"; then DEPLOY_OK=false; fi
    if [[ "$DEPLOY_OK" = "true" ]] && ! update_stage "auth-service product-service" "mysql redis discovery-server"; then DEPLOY_OK=false; fi
    if [[ "$DEPLOY_OK" = "true" ]] && ! update_stage "order-service payment-service" "mysql kafka discovery-server"; then DEPLOY_OK=false; fi
    if [[ "$DEPLOY_OK" = "true" ]] && ! update_stage "chatbot-service" "mysql discovery-server product-service order-service"; then DEPLOY_OK=false; fi
    if [[ "$DEPLOY_OK" = "true" ]] && ! update_stage "api-gateway" "discovery-server redis auth-service product-service order-service payment-service chatbot-service"; then DEPLOY_OK=false; fi
    if [[ "$DEPLOY_OK" = "true" ]] && ! update_stage "frontend" "api-gateway"; then DEPLOY_OK=false; fi
  fi
fi

if [[ "$DEPLOY_OK" = "true" ]]; then
  if [[ "$BEFORE_NGINX_COMPOSE_HASH" != "$AFTER_NGINX_COMPOSE_HASH" ]]; then
    echo "Nginx Compose configuration changed; verifying health before recreating ecommerce-nginx..."
    if ! assert_service_healthy "nginx"; then
      DEPLOY_OK=false
    else
      NGINX_RECREATED=true
      echo "Pulling (if needed) and recreating ecommerce-nginx (--no-deps)..."
      if ! dc pull nginx || ! dc up -d --no-deps nginx || ! wait_service_healthy "nginx"; then
        echo "  [FAIL] ecommerce-nginx recreate or health check failed!"
        DEPLOY_OK=false
      else
        echo "  [OK] ecommerce-nginx recreated and healthy with updated Compose configuration."
      fi
    fi
  elif [[ "$BEFORE_NGINX_SHA" != "$AFTER_NGINX_SHA" ]]; then
    echo "Nginx configuration file changed; verifying health, testing and reloading ecommerce-nginx in-place..."
    if ! assert_service_healthy "nginx"; then
      DEPLOY_OK=false
    elif docker exec ecommerce-nginx nginx -t && docker exec ecommerce-nginx nginx -s reload && wait_service_healthy "nginx"; then
      NGINX_RELOADED=true
      echo "  [OK] ecommerce-nginx reloaded and healthy with updated configuration."
    else
      echo "  [FAIL] ecommerce-nginx config test, reload, or health check failed!"
      DEPLOY_OK=false
    fi
  else
    echo "Nginx Compose configuration and nginx.prod.conf unchanged; skipping Nginx recreate/reload."
  fi
fi

FINALIZE_OK=false
if [[ "$DEPLOY_OK" = "true" ]] && verify_all_health_and_http "$APP_SERVICES" "false"; then
  if update_env_image_tag "${COMPOSE_DIR}/.env" "${IMAGE_TAG}"; then
    TAG_COUNT=$(grep -c "^IMAGE_TAG=" "${COMPOSE_DIR}/.env" || true)
    ACTIVE_ENV_TAG=$(grep -E '^IMAGE_TAG=' "${COMPOSE_DIR}/.env" | head -n1 | cut -d'=' -f2- || true)
    if [[ "$TAG_COUNT" -eq 1 ]] && [[ "$ACTIVE_ENV_TAG" = "${IMAGE_TAG}" ]]; then
      if IMAGE_REGISTRY="ghcr.io" IMAGE_REPO_OWNER="${REPO_OWNER}" dc config --quiet; then
        FINALIZE_OK=true
      else
        echo "ERROR: Compose config validation failed after updating .env IMAGE_TAG!"
      fi
    else
      echo "ERROR: .env IMAGE_TAG verification failed (count=${TAG_COUNT}, value=${ACTIVE_ENV_TAG})."
    fi
  else
    echo "ERROR: Failed to update IMAGE_TAG in .env!"
  fi
fi

if [[ "$FINALIZE_OK" = "true" ]]; then
  for svc in $APP_SERVICES nginx; do
    docker rmi "shopmart-rollback/${svc}:pre-deploy" >/dev/null 2>&1 || true
  done
  PRESERVE_BACKUPS=false
  echo "DEPLOYMENT COMPLETE: Version ${IMAGE_TAG} is LIVE, HEALTHY, and verified in .env."
  exit 0
fi

echo "CRITICAL: Deployment or finalization FAILED! Initiating verified rollback..."
echo "NOTE: Database migration is additive/backward-compatible; MySQL data is NOT automatically overwritten during container rollback. Pre-deploy SQL dump is preserved at: ${DUMP_GZ}"
ROLLBACK_OK=true

if ! cp -p "${ENV_BACKUP_FILE}" "${COMPOSE_DIR}/.env" || ! cmp -s "${ENV_BACKUP_FILE}" "${COMPOSE_DIR}/.env"; then
  echo "  [FAIL] Could not restore and verify .env from backup!"
  ROLLBACK_OK=false
else
  echo "  [OK] .env restored and verified against backup."
fi
export IMAGE_TAG="${ROLLBACK_TAG}"

if ! restore_configs_from_backup; then
  ROLLBACK_OK=false
fi

ROLLBACK_OVERRIDE="${COMPOSE_DIR}/docker-compose.rollback.yml"
: > "${ROLLBACK_OVERRIDE}"
echo "services:" >> "${ROLLBACK_OVERRIDE}"
for s in $APP_SERVICES; do
  if [[ "${PREV_IMAGE_ID[$s]}" != "ABSENT" ]]; then
    printf '  %s:\n    image: shopmart-rollback/%s:pre-deploy\n' "$s" "$s" >> "${ROLLBACK_OVERRIDE}"
  fi
done
printf '  nginx:\n    image: shopmart-rollback/nginx:pre-deploy\n' >> "${ROLLBACK_OVERRIDE}"

dc_rollback() {
  docker compose --env-file .env -p backend \
    -f docker-compose.yml \
    -f docker-compose.prod.yml \
    -f docker-compose.vps.yml \
    -f docker-compose.rollback.yml "$@"
}

if ! dc_rollback config --quiet; then
  echo "ERROR: Rollback Compose configuration validation failed with override! Aborting safe automated rollback."
  ROLLBACK_OK=false
fi

for svc in discovery-server auth-service product-service order-service payment-service chatbot-service api-gateway frontend; do
  cname=$(container_name_for "$svc")
  prev_ref="${PREV_IMAGE_REF[$svc]}"
  prev_id="${PREV_IMAGE_ID[$svc]}"

  if [[ "$prev_id" = "ABSENT" ]]; then
    if docker container inspect "$cname" >/dev/null 2>&1; then
      echo "  Removing newly created service '${svc}' (${cname}) that did not exist prior to deployment..."
      if ! docker rm -f "$cname" >/dev/null 2>&1; then
        echo "  [FAIL] Could not remove newly created container ${cname}!"
        ROLLBACK_OK=false
      else
        echo "  [OK] Removed newly created container ${cname}."
      fi
    fi
    continue
  fi

  actual_id=$(docker inspect -f '{{.Image}}' "$cname" 2>/dev/null || echo "")
  if [[ " $ATTEMPTED_SERVICES " != *" $svc "* ]] && [[ "$actual_id" = "$prev_id" ]]; then
    continue
  fi

  echo "  Restoring ${svc} to exact pre-deploy image ID ${prev_id} via dedicated rollback compose override..."
  if [[ "$prev_ref" != sha256:* ]] && [[ "$prev_ref" =~ : ]]; then
    docker tag "shopmart-rollback/${svc}:pre-deploy" "${prev_ref}" >/dev/null 2>&1 || true
  fi
  if ! dc_rollback up -d --no-deps --no-build --pull never "$svc"; then
    ROLLBACK_OK=false
    continue
  fi
  actual_id=$(docker inspect -f '{{.Image}}' "$cname" 2>/dev/null || echo "")
  if [[ "$actual_id" != "$prev_id" ]]; then
    echo "  [FAIL] ${svc} rolled back to ${actual_id}, expected ${prev_id}!"
    ROLLBACK_OK=false
  elif ! wait_service_healthy "$svc"; then
    ROLLBACK_OK=false
  fi
done

if [[ "$NGINX_RECREATED" = "true" ]] || [[ "$BEFORE_NGINX_COMPOSE_HASH" != "$AFTER_NGINX_COMPOSE_HASH" ]]; then
  echo "Restoring ecommerce-nginx to previous Compose configuration and image (${PREV_NGINX_IMAGE_ID})..."
  if [[ "$PREV_NGINX_IMAGE_REF" != sha256:* ]] && [[ "$PREV_NGINX_IMAGE_REF" =~ : ]]; then
    docker tag "shopmart-rollback/nginx:pre-deploy" "${PREV_NGINX_IMAGE_REF}" >/dev/null 2>&1 || true
  fi
  if ! dc_rollback up -d --no-deps --pull never nginx; then
    echo "  [FAIL] Could not recreate ecommerce-nginx during rollback!"
    ROLLBACK_OK=false
  else
    actual_nginx_id=$(docker inspect -f '{{.Image}}' ecommerce-nginx 2>/dev/null || echo "")
    if [[ "$actual_nginx_id" != "$PREV_NGINX_IMAGE_ID" ]]; then
      echo "  [FAIL] ecommerce-nginx rolled back to ${actual_nginx_id}, expected ${PREV_NGINX_IMAGE_ID}!"
      ROLLBACK_OK=false
    elif ! wait_service_healthy "nginx"; then
      ROLLBACK_OK=false
    fi
  fi
elif [[ "$NGINX_RELOADED" = "true" ]] || [[ "$BEFORE_NGINX_SHA" != "$AFTER_NGINX_SHA" ]]; then
  echo "Reloading ecommerce-nginx with restored configuration..."
  if ! docker exec ecommerce-nginx nginx -t || ! docker exec ecommerce-nginx nginx -s reload || ! wait_service_healthy "nginx"; then
    echo "  [FAIL] Could not reload ecommerce-nginx after restoring config!"
    ROLLBACK_OK=false
  fi
fi

rm -f "${ROLLBACK_OVERRIDE}"
if [[ "$ROLLBACK_OK" = "true" ]] && verify_all_health_and_http "$EXISTING_APP_SERVICES" "true"; then
  for svc in $APP_SERVICES nginx; do
    docker rmi "shopmart-rollback/${svc}:pre-deploy" >/dev/null 2>&1 || true
  done
  PRESERVE_BACKUPS=false
  echo "ROLLBACK SUCCEEDED: Containers (${EXISTING_APP_SERVICES}), .env, and configuration files restored and verified healthy. Additive database migrations were preserved to protect live data; pre-deploy SQL backup is stored at: ${DUMP_GZ}"
else
  PRESERVE_BACKUPS=true
  echo "ROLLBACK FAILED: Manual intervention required in ${COMPOSE_DIR}! Pinned rollback tags shopmart-rollback/*:pre-deploy and backups preserved."
fi
exit 1
