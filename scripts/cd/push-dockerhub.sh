#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
# shellcheck source=/dev/null
. "$SCRIPT_DIR/image-metadata.sh"

: "${DOCKER_REGISTRY:?DOCKER_REGISTRY is required}"
: "${DOCKER_REPOSITORY:?DOCKER_REPOSITORY is required}"
: "${DOCKERHUB_USERNAME:?DOCKERHUB_USERNAME is required}"
: "${DEPLOY_SHA:?DEPLOY_SHA is required}"

SRC="${DOCKER_REGISTRY}/${DOCKER_REPOSITORY}/${IMAGE_NAME}:${IMAGE_TAG}"
docker pull "$SRC"
docker tag "$SRC" "${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}"
docker push "${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}"

if [ "${DEPLOY_REF:-}" = "main" ] || [ "${DEPLOY_REF:-}" = "master" ]; then
  docker tag "$SRC" "${DOCKERHUB_USERNAME}/${IMAGE_NAME}:latest"
  docker push "${DOCKERHUB_USERNAME}/${IMAGE_NAME}:latest"
fi

echo "Image pushed to Docker Hub:"
echo "  - ${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}"
