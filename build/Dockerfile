# ============================================================================
# 多阶段构建：前端静态资源构建与生产服务
# ============================================================================

# syntax=docker/dockerfile:1

FROM node:18-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# 你的项目在 Node 18 下如果还需要 legacy provider，就保留
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npm run build


FROM node:18-alpine AS runtime
WORKDIR /app

# 安装静态文件服务 + 创建运行用户
RUN npm i -g serve@14 \
  && addgroup -S app \
  && adduser -S -G app appuser

# 拷贝产物并赋权（关键：让 appuser 能读 dist）
COPY --from=build /app/dist ./dist
RUN chown -R appuser:app /app

USER appuser

EXPOSE 3000

# 可选：健康检查（node:alpine 自带 busybox wget）
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["serve", "-s", "dist", "-l", "3000"]
