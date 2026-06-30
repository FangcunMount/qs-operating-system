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
# 勿把 SUDO_PASSWORD 拼进 ssh 命令行：含空格/引号/! 等字符时会破坏远端 shell，
# 导致 remote-deploy 未执行而 ssh 仍返回 0。密码通过 stdin 单独传递（若需要）。
if ! ssh "${RUNNER_SSH_ALIAS}" bash -s <<EOF
set -Eeuo pipefail
export DEPLOY_SHA='${DEPLOY_SHA//\'/\'\\\'\'}'
export IMAGE_TARBALL='${REMOTE_DIR}/${DEPLOY_IMAGE_PACKAGE}'
export DOCKER_REGISTRY='${DOCKER_REGISTRY:-}'
export DOCKER_REPOSITORY='${DOCKER_REPOSITORY:-}'
export ALIYUN_ACR_REGISTRY='${ALIYUN_ACR_REGISTRY:-}'
export ALIYUN_ACR_NAMESPACE='${ALIYUN_ACR_NAMESPACE:-}'
export SUDO_PASSWORD='${SUDO_PASSWORD//\'/\'\\\'\'}'
cd '${REMOTE_DIR//\'/\'\\\'\'}' && bash remote-deploy.sh
EOF
then
  echo "remote-deploy.sh failed on ${RUNNER_SSH_ALIAS}" >&2
  exit 1
fi

echo "Verifying remote deployment on ${RUNNER_SSH_ALIAS}..."
if ssh "${RUNNER_SSH_ALIAS}" "test -f '${REMOTE_DIR}/${DEPLOY_IMAGE_PACKAGE}'"; then
  echo "Deploy verification failed: image tarball still present on remote host." >&2
  exit 1
fi

running_image="$(ssh "${RUNNER_SSH_ALIAS}" "sudo docker inspect --format '{{.Config.Image}}' ${CONTAINER_NAME} 2>/dev/null || true")"
if [ -z "${running_image}" ] || ! printf '%s' "${running_image}" | grep -q "${DEPLOY_SHA}"; then
  echo "Deploy verification failed: container ${CONTAINER_NAME} is not running image sha-${DEPLOY_SHA}." >&2
  echo "Current image: ${running_image:-<none>}" >&2
  exit 1
fi
echo "Remote deploy verified: ${running_image}"
