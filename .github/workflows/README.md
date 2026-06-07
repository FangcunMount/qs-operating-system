# CI/CD 部署说明

工作流分工：

1. `CI` (`ci.yml`)：测试与 ESLint，不读生产 secrets，不构建镜像。
2. `Production Deploy` (`cd.yml`)：`main`/`master` 上 CI 成功后由 `workflow_run` 触发，或手动 `workflow_dispatch`；绑定 `production` environment。
3. 编排走 `cd.yml` + `Makefile` + `scripts/cd/*`。

部署链路（与 qs-server / iam 一致）：

1. **GitHub-hosted** `docker` job：构建镜像 → 推 GHCR → 镜像同步 Docker Hub、阿里云 ACR。
2. **ServerD** `deploy` job：从 **ACR** `docker pull` → `save | gzip` → SCP → **serverB** `docker load` → `docker run`。
3. 镜像 tag：`sha-<commit-sha>`（不可变）；`main`/`master` 额外打 `latest`。
4. 容器：`qs-operating-system`，端口 `3000`，网络 `infra-network`。

Makefile 入口：

- `make cd-validate SERVICE=ops`
- `make cd-image SERVICE=ops DEPLOY_REF=main DEPLOY_SHA=<sha> REACT_APP_GRAFANA_URL=<url>`
- `make cd-export-image SERVICE=ops DEPLOY_SHA=<sha>`
- `make cd-remote-deploy SERVICE=ops DEPLOY_SHA=<sha>`

## Secrets / Variables

**组织级（与 qs-server / iam 共用）**

| 名称 | 用途 |
| ---- | ---- |
| `SVRB_HOST`, `SVRB_USERNAME`, `SVRB_SSH_KEY`, `SVRB_SSH_PORT` | serverB SSH |
| `SVRB_SUDO_PASSWORD` | 远端 sudo（可选，已配 NOPASSWD 可省略） |
| `ALIYUN_ACR_*` | ACR 推送与 ServerD pull |
| `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` | 镜像备份 |
| `QS_DEPLOY_RUNNER=serverd` | deploy job 跑在 ServerD |
| `QS_DEPLOY_EXPORT_REGISTRY=acr` | 默认 ACR 导出（可省略） |
| `QS_DEPLOY_HTTP_PROXY` 等 | ServerD 代理 |

**本仓库**

| 名称 | 用途 |
| ---- | ---- |
| `QS_OPS_DEPLOY_KEY` | Deploy Key 私钥（只读），ServerD SSH checkout；**不可复用** qs-server / iam 的 key |
| `REACT_APP_GRAFANA_URL` | 构建时注入（或用 org/repo Variable） |

### 配置 Deploy Key

1. 本机生成：`ssh-keygen -t ed25519 -C "qs-ops-deploy" -f qs-ops-deploy -N ""`
2. 仓库 **Settings → Deploy keys → Add**：粘贴 `qs-ops-deploy.pub`，只读
3. 仓库 **Settings → Secrets → Actions**：`QS_OPS_DEPLOY_KEY` = `qs-ops-deploy` 私钥全文

## ServerD 前置

与 qs-server 相同：Docker daemon/containerd 代理、`NO_PROXY` 含 `.aliyuncs.com,.personal.cr.aliyuncs.com,100.64.0.0/10`，runner `.env` 见 `scripts/cd/runner-dotenv.example`。

首次 push 本分支后，ServerD 上 `curl` bootstrap 的 `setup-runner-network.sh` 才会在 raw.githubusercontent.com 可用；首次 CD 前可先 merge 到 main，或临时设 `NETWORK_SCRIPT_REF=main`。
