#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
# shellcheck source=/dev/null
. "$SCRIPT_DIR/image-metadata.sh"

: "${DOCKER_REGISTRY:?DOCKER_REGISTRY is required}"
: "${DOCKER_REPOSITORY:?DOCKER_REPOSITORY is required}"
: "${DEPLOY_REF:?DEPLOY_REF is required}"
: "${DEPLOY_SHA:?DEPLOY_SHA is required}"

REACT_APP_GRAFANA_URL="${REACT_APP_GRAFANA_URL:-}"
TAGS="--tag ${DOCKER_REGISTRY}/${DOCKER_REPOSITORY}/${IMAGE_NAME}:${IMAGE_TAG}"
if [ "${DEPLOY_REF}" = "main" ] || [ "${DEPLOY_REF}" = "master" ]; then
  TAGS="${TAGS} --tag ${DOCKER_REGISTRY}/${DOCKER_REPOSITORY}/${IMAGE_NAME}:latest"
fi

# shellcheck disable=SC2086
docker buildx build \
  --file "$DOCKERFILE" \
  --push \
  $TAGS \
  --build-arg "REACT_APP_BUILD_SHA=${DEPLOY_SHA}" \
  --build-arg "REACT_APP_BUILD_REF=${DEPLOY_REF}" \
  --build-arg "REACT_APP_GRAFANA_URL=${REACT_APP_GRAFANA_URL}" \
  --cache-from type=gha \
  --cache-to type=gha,mode=max \
  .
