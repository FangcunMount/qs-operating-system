# ============================================================================
# Multi-stage build: build frontend assets, then serve static files
# ============================================================================

FROM node:18.20.8-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# 如果你项目确实依赖 legacy provider（webpack4 等），保留这句；不需要也不会影响构建
RUN NODE_OPTIONS=--openssl-legacy-provider npm run build

FROM node:18.20.8-alpine AS runner
WORKDIR /app

# busybox 自带 wget，不需要装 curl；保持镜像更小
RUN npm i -g serve@14.2.1

COPY --from=builder /app/dist ./dist

# 非 root 运行（避免容器里用 root）
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

CMD ["serve", "-s", "dist", "-l", "3000"]
