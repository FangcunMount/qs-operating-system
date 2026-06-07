#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
# shellcheck source=/dev/null
. "$SCRIPT_DIR/image-metadata.sh"

: "${RUNNER_SSH_ALIAS:?RUNNER_SSH_ALIAS is required}"
: "${DEPLOY_SHA:?DEPLOY_SHA is required}"

IMAGE_FILE="${DEPLOY_IMAGE_PACKAGE}"
REMOTE_DIR="/tmp/qs-ops-cd-${DEPLOY_SHA}"

if [ ! -f "$IMAGE_FILE" ]; then
  echo "Missing file: $IMAGE_FILE" >&2
  exit 1
fi

echo "Preparing ${REMOTE_DIR} on ${RUNNER_SSH_ALIAS}..."
ssh "${RUNNER_SSH_ALIAS}" "mkdir -p '${REMOTE_DIR}'"

echo "Uploading image and deploy scripts..."
scp "$IMAGE_FILE" \
  "${SCRIPT_DIR}/remote-deploy.sh" \
  "${SCRIPT_DIR}/image-metadata.sh" \
  "${RUNNER_SSH_ALIAS}:${REMOTE_DIR}/"

echo "Running remote-deploy.sh on ${RUNNER_SSH_ALIAS}..."
ssh "${RUNNER_SSH_ALIAS}" \
  DEPLOY_SHA="$DEPLOY_SHA" \
  IMAGE_TARBALL="${REMOTE_DIR}/${DEPLOY_IMAGE_PACKAGE}" \
  DOCKER_REGISTRY="${DOCKER_REGISTRY:-}" \
  DOCKER_REPOSITORY="${DOCKER_REPOSITORY:-}" \
  ALIYUN_ACR_REGISTRY="${ALIYUN_ACR_REGISTRY:-}" \
  ALIYUN_ACR_NAMESPACE="${ALIYUN_ACR_NAMESPACE:-}" \
  SUDO_PASSWORD="${SUDO_PASSWORD:-}" \
  "cd '${REMOTE_DIR}' && bash remote-deploy.sh"
