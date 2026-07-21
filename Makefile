.PHONY: cd-validate cd-export-image cd-image cd-remote-deploy

CD_SCRIPT_DIR := scripts/cd
DOCKER_REGISTRY ?= ghcr.io
DOCKER_REPOSITORY ?= fangcunmount

cd-validate: ## 校验 CD 脚本 (SERVICE=ops)
	@SERVICE="$(SERVICE)" DEPLOY_SHA="$(DEPLOY_SHA)" IMAGE_METADATA_PRINT=1 "$(CD_SCRIPT_DIR)/image-metadata.sh" >/dev/null
	@test -x "$(CD_SCRIPT_DIR)/build-image.sh"
	@test -x "$(CD_SCRIPT_DIR)/push-dockerhub.sh"
	@test -x "$(CD_SCRIPT_DIR)/push-acr.sh"
	@test -x "$(CD_SCRIPT_DIR)/export-image.sh"
	@test -x "$(CD_SCRIPT_DIR)/setup-runner-network.sh"
	@test -x "$(CD_SCRIPT_DIR)/setup-runner-ssh.sh"
	@test -x "$(CD_SCRIPT_DIR)/runner-upload-and-deploy.sh"
	@test -x "$(CD_SCRIPT_DIR)/remote-deploy.sh"
	@echo "CD metadata validated for SERVICE=$(SERVICE)"

cd-export-image: cd-validate ## Runner 从 ACR pull 并导出镜像 tarball（linux/amd64）
	@SERVICE="$(SERVICE)" DEPLOY_SHA="$(DEPLOY_SHA)" "$(CD_SCRIPT_DIR)/export-image.sh"

cd-image: cd-validate ## 构建并发布到 GHCR、Docker Hub、ACR
	@SERVICE="$(SERVICE)" DEPLOY_REF="$(DEPLOY_REF)" DEPLOY_SHA="$(DEPLOY_SHA)" \
		REACT_APP_GRAFANA_URL="$(REACT_APP_GRAFANA_URL)" "$(CD_SCRIPT_DIR)/build-image.sh"
	@SERVICE="$(SERVICE)" DEPLOY_REF="$(DEPLOY_REF)" DEPLOY_SHA="$(DEPLOY_SHA)" "$(CD_SCRIPT_DIR)/push-dockerhub.sh"
	@SERVICE="$(SERVICE)" DEPLOY_REF="$(DEPLOY_REF)" DEPLOY_SHA="$(DEPLOY_SHA)" "$(CD_SCRIPT_DIR)/push-acr.sh"

cd-remote-deploy: cd-validate ## 在 serverB 执行远端部署
	@SERVICE="$(SERVICE)" DEPLOY_SHA="$(DEPLOY_SHA)" "$(CD_SCRIPT_DIR)/remote-deploy.sh"
