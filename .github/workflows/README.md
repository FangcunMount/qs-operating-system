# CI/CD 部署说明

工作流分工：

1. `CI` (`ci.yml`)：测试与 ESLint，不读生产 secrets，不构建镜像。
2. `Production Deploy` (`cd.yml`)：`main`/`master` 上 CI 成功后由 `workflow_run` 触发，或手动 `workflow_dispatch`；绑定 `production` environment。
3. 编排走 `cd.yml` + `Makefile` + `scripts/cd/*`。

部署链路：

1. **GitHub-hosted** `docker` job：构建镜像 → 推 GHCR → 镜像同步 Docker Hub、阿里云 ACR。
2. **Mac mini** `deploy` job：从 **ACR** `docker pull --platform linux/amd64` → `save | gzip` → 公网 SCP → **serverB** `docker load` → `docker run`。
3. 镜像 tag：`sha-<commit-sha>`（不可变）；`main`/`master` 额外打 `latest`。
4. 容器：`qs-operating-system`，端口 `3000`，网络 `infra-network`。

Makefile 入口：

- `make cd-validate SERVICE=ops`
- `make cd-image SERVICE=ops DEPLOY_REF=main DEPLOY_SHA=<sha> REACT_APP_GRAFANA_URL=<url>`
- `make cd-export-image SERVICE=ops DEPLOY_SHA=<sha>`
- `make cd-remote-deploy SERVICE=ops DEPLOY_SHA=<sha>`

## Secrets / Variables

**组织级（与 qs-server / iam / qlume 共用）**

| 名称 | 用途 |
| ---- | ---- |
| `SVR_MINI_SSH_KEY` | Mac mini 部署优先使用的 SSH 私钥（可回退 `SVRB_SSH_KEY`） |
| `SVRB_SSH_KEY` | serverB SSH 私钥（回退） |
| `SVRB_SUDO_PASSWORD` | 远端 sudo（可选，已配 NOPASSWD 可省略） |
| `SVRB_PUBLIC_HOST` | serverB 公网 IP（推荐，大文件上传用） |
| `SVRB_HOST`, `SVRB_USERNAME`, `SVRB_SSH_PORT` | serverB 连接信息（`HOST` 为 Tailscale，作回退） |
| `ALIYUN_ACR_*` | ACR 推送与 Mac mini pull |
| `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` | 镜像备份 |
| `QS_DEPLOY_EXPORT_REGISTRY=acr` | 默认 ACR 导出（可省略） |

**本仓库**

| 名称 | 用途 |
| ---- | ---- |
| `REACT_APP_GRAFANA_URL` | 构建时注入（或用 org/repo Variable） |

> 原 `QS_OPS_DEPLOY_KEY`（ServerD SSH checkout）与 `QS_DEPLOY_RUNNER=serverd` 已不再需要：Mac mini 用 HTTPS checkout，runner 由 workflow 固定为 `group: qlume` + `macOS/ARM64`。

## Mac mini 前置

1. Runner 在组织 runner group `qlume`，标签含 `self-hosted, macOS, ARM64`，且该 group 允许本仓库使用。
2. Docker Desktop 可用；`~/.docker/config.json` 建议去掉 `credsStore`（workflow 也会用隔离 `DOCKER_CONFIG`）。
3. 确认公钥已授权到 serverB `deploy` 用户（与 `SVR_MINI_SSH_KEY` / `SVRB_SSH_KEY` 对应）。
4. 大文件上传走 `SVRB_PUBLIC_HOST`（公网），避免 Tailscale DERP 中继过慢。

手动冒烟：

```bash
# 公网 SSH
ssh -i ~/.ssh/<key> -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
  deploy@$SVRB_PUBLIC_HOST 'echo ok'
```
