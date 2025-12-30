# ============================================================================
# 多阶段构建：前端静态资源构建与生产服务
# ============================================================================

# 阶段 1: 构建阶段
FROM node:18.20.8-alpine AS builder

WORKDIR /app

# 安装依赖（利用 Docker 缓存层）
COPY package*.json ./
RUN npm ci --only=production=false

# 复制源代码并构建
COPY . .
RUN NODE_OPTIONS=--openssl-legacy-provider npm run build

# 阶段 2: 生产阶段（使用 serve 提供静态文件服务）
FROM node:18.20.8-alpine AS production

WORKDIR /app

# 安装 curl（用于健康检查）和 serve
RUN apk add --no-cache curl && \
    npm install -g serve@14.2.1

# 复制构建产物
COPY --from=builder /app/dist ./dist

# 可选：支持从 CI 传 UID/GID
ARG UID=1000
ARG GID=1000

# 创建非 root 用户（幂等 + 复用已有 GID）
RUN set -eux; \
  # 找到是否已有 GID 对应的组名
  EXISTING_GROUP="$(awk -F: -v gid="$GID" '$3==gid{print $1; exit}' /etc/group || true)"; \
  if [ -n "$EXISTING_GROUP" ]; then \
    echo "GID $GID already exists as group: $EXISTING_GROUP"; \
    adduser -S -u "$UID" -G "$EXISTING_GROUP" appuser || true; \
  else \
    addgroup -S -g "$GID" appuser; \
    adduser -S -u "$UID" -G appuser appuser; \
  fi; \
  chown -R "$UID:$GID" /app

USER appuser

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# 暴露端口给宿主机 nginx 反向代理
EXPOSE 3000

# 启动静态文件服务器
CMD ["serve", "-s", "dist", "-l", "3000"]

