#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
# shellcheck source=/dev/null
. "$SCRIPT_DIR/image-metadata.sh"

: "${DEPLOY_SHA:?DEPLOY_SHA is required}"

IMAGE_TARBALL="${IMAGE_TARBALL:-/tmp/${DEPLOY_IMAGE_PACKAGE}}"
USE_IMAGE=""
PREV_IMAGE=""
SUDO=""

setup_sudo() {
  if sudo -n true 2>/dev/null; then
    SUDO="sudo"
    echo "Using passwordless sudo."
    return 0
  fi
  if [ -z "${SUDO_PASSWORD:-}" ]; then
    echo "sudo needs password. Provide SUDO_PASSWORD or configure NOPASSWD." >&2
    exit 1
  fi
  sudo_pw() { sudo -S "$@" <<<"$SUDO_PASSWORD"; }
  export -f sudo_pw
  SUDO="sudo_pw"
  $SUDO -v || true
  echo "Using sudo with password."
}

resolve_image_ref() {
  if [ -n "${ALIYUN_ACR_REGISTRY:-}" ] && [ -n "${ALIYUN_ACR_NAMESPACE:-}" ]; then
    USE_IMAGE="${ALIYUN_ACR_REGISTRY}/${ALIYUN_ACR_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"
    return 0
  fi
  if [ -n "${DOCKER_REGISTRY:-}" ] && [ -n "${DOCKER_REPOSITORY:-}" ]; then
    USE_IMAGE="${DOCKER_REGISTRY}/${DOCKER_REPOSITORY}/${IMAGE_NAME}:${IMAGE_TAG}"
    return 0
  fi
  echo "Cannot resolve image reference; set ACR or GHCR env." >&2
  exit 1
}

load_image_from_tarball() {
  if [ ! -f "${IMAGE_TARBALL}" ]; then
    echo "Image tarball not found: ${IMAGE_TARBALL}" >&2
    exit 1
  fi
  echo "docker load from ${IMAGE_TARBALL}..."
  if ! gzip -t "${IMAGE_TARBALL}" 2>/dev/null; then
    echo "Image tarball is corrupt (gzip check failed)." >&2
    exit 1
  fi
  local temp_tar
  temp_tar="$(mktemp)"
  gunzip -c "${IMAGE_TARBALL}" >"${temp_tar}"
  $SUDO docker load -i "${temp_tar}"
  rm -f "${temp_tar}" "${IMAGE_TARBALL}"
}

ensure_network() {
  if ! $SUDO docker network ls --format '{{.Name}}' | grep -q "^${NETWORK_NAME}$"; then
    echo "Creating Docker network ${NETWORK_NAME}..."
    $SUDO docker network create "${NETWORK_NAME}"
  fi
}

record_previous_image() {
  if $SUDO docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    PREV_IMAGE="$($SUDO docker inspect --format '{{.Config.Image}}' "${CONTAINER_NAME}" 2>/dev/null || true)"
    if [ -n "${PREV_IMAGE}" ]; then
      echo "Previous image: ${PREV_IMAGE}"
    fi
  fi
}

replace_container() {
  if $SUDO docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    $SUDO docker stop "${CONTAINER_NAME}" || true
    $SUDO docker rm "${CONTAINER_NAME}" || true
  fi

  echo "Run container ${CONTAINER_NAME} with ${USE_IMAGE}"
  $SUDO docker run -d \
    --name "${CONTAINER_NAME}" \
    --network "${NETWORK_NAME}" \
    --restart unless-stopped \
    -p "${APP_PORT}:${APP_PORT}" \
    "${USE_IMAGE}"
}

rollback_container() {
  $SUDO docker logs --tail 100 "${CONTAINER_NAME}" || true
  $SUDO docker stop "${CONTAINER_NAME}" || true
  $SUDO docker rm "${CONTAINER_NAME}" || true
  if [ -n "${PREV_IMAGE}" ]; then
    echo "Rollback to ${PREV_IMAGE}"
    $SUDO docker run -d \
      --name "${CONTAINER_NAME}" \
      --network "${NETWORK_NAME}" \
      --restart unless-stopped \
      -p "${APP_PORT}:${APP_PORT}" \
      "${PREV_IMAGE}"
    $SUDO docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"
    echo "Deployment rolled back."
    return 0
  fi
  echo "No previous image for rollback." >&2
  return 1
}

verify_health() {
  echo "Health check http://127.0.0.1:${APP_PORT}${HEALTH_PATH} ..."
  sleep 5
  local i
  for i in $(seq 1 45); do
    if $SUDO docker exec "${CONTAINER_NAME}" wget -qO- -T 3 "http://127.0.0.1:${APP_PORT}${HEALTH_PATH}" >/dev/null 2>&1; then
      echo "Health check passed (attempt ${i})"
      $SUDO docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"
      return 0
    fi
    sleep 2
  done
  echo "Health check failed." >&2
  rollback_container || true
  exit 1
}

echo "=========================================="
echo "Deploying ${CONTAINER_NAME}"
echo "Image tag: ${IMAGE_TAG}"
echo "=========================================="

setup_sudo
resolve_image_ref
load_image_from_tarball
ensure_network
record_previous_image
replace_container
verify_health

echo "=========================================="
echo "${CONTAINER_NAME} deployment completed"
echo "=========================================="
