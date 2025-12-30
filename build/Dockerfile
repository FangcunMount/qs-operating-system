# ============================================================================
# 多阶段构建：前端静态资源构建与生产服务
# ============================================================================

FROM node:18.20.8-alpine AS builder
WORKDIR /app

# 只拷贝依赖清单，利用缓存
COPY package.json package-lock.json ./
RUN npm ci

# 构建
COPY . .
RUN NODE_OPTIONS=--openssl-legacy-provider npm run build

FROM node:18.20.8-alpine AS production
WORKDIR /app

RUN apk add --no-cache curl && npm i -g serve@14.2.1

COPY --from=builder /app/dist ./dist

ARG UID=1000
ARG GID=1000

RUN set -eux; \
  EXISTING_GROUP="$(awk -F: -v gid="$GID" '$3==gid{print $1; exit}' /etc/group || true)"; \
  if [ -n "$EXISTING_GROUP" ]; then \
    adduser -S -u "$UID" -G "$EXISTING_GROUP" appuser || true; \
  else \
    addgroup -S -g "$GID" appuser; \
    adduser -S -u "$UID" -G appuser appuser; \
  fi; \
  chown -R "$UID:$GID" /app

USER appuser

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
