#!/usr/bin/env bash
set -Eeuo pipefail

: "${RUNNER_SSH_KEY:?RUNNER_SSH_KEY is required}"
: "${RUNNER_SSH_HOST:?RUNNER_SSH_HOST is required}"
: "${RUNNER_SSH_USER:?RUNNER_SSH_USER is required}"

RUNNER_SSH_PORT="${RUNNER_SSH_PORT:-22}"
RUNNER_SSH_ALIAS="${RUNNER_SSH_ALIAS:-deploy-target}"

# 写到 RUNNER_TEMP，避免覆盖 runner 用户 ~/.ssh 下的个人密钥/config
SSH_HOME="${RUNNER_TEMP:-/tmp}/qs-ops-ssh-${GITHUB_RUN_ID:-$$}"
mkdir -p "${SSH_HOME}"
chmod 700 "${SSH_HOME}"

KEY_FILE="${RUNNER_SSH_KEY_FILE:-${SSH_HOME}/runner_${RUNNER_SSH_ALIAS}_key}"
CONFIG="${RUNNER_SSH_CONFIG:-${SSH_HOME}/config}"

umask 077
printf '%s\n' "$RUNNER_SSH_KEY" | tr -d '\r' >"$KEY_FILE"
chmod 600 "$KEY_FILE"
ssh-keygen -lf "$KEY_FILE"

# 每次重写 Host 块，避免旧 Tailscale IP 残留导致仍走 DERP
cat >"$CONFIG" <<EOF
Host ${RUNNER_SSH_ALIAS}
  HostName ${RUNNER_SSH_HOST}
  User ${RUNNER_SSH_USER}
  Port ${RUNNER_SSH_PORT}
  IdentityFile ${KEY_FILE}
  IdentitiesOnly yes
  BatchMode yes
  StrictHostKeyChecking accept-new
EOF
chmod 600 "$CONFIG"

if [ -n "${GITHUB_ENV:-}" ]; then
  {
    echo "RUNNER_SSH_KEY_FILE=${KEY_FILE}"
    echo "RUNNER_SSH_CONFIG=${CONFIG}"
  } >>"${GITHUB_ENV}"
fi

echo "SSH config ready for ${RUNNER_SSH_ALIAS} (${RUNNER_SSH_USER}@${RUNNER_SSH_HOST}:${RUNNER_SSH_PORT})"
echo "  IdentityFile=${KEY_FILE}"
echo "  Config=${CONFIG}"
