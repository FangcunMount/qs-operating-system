# ============================================================================
# 多阶段构建：前端静态资源构建与生产服务
# ============================================================================

# syntax=docker/dockerfile:1

FROM node:18-alpine AS build
WORKDIR /app

ARG REACT_APP_BUILD_SHA=unknown
ARG REACT_APP_BUILD_REF=unknown
ENV REACT_APP_BUILD_SHA=${REACT_APP_BUILD_SHA}
ENV REACT_APP_BUILD_REF=${REACT_APP_BUILD_REF}

COPY package*.json ./
RUN npm ci

COPY . .

# 你的项目在 Node 18 下如果还需要 legacy provider，就保留
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npm run build


FROM node:18-alpine AS runtime
WORKDIR /app

ARG REACT_APP_BUILD_SHA=unknown
ARG REACT_APP_BUILD_REF=unknown
LABEL org.opencontainers.image.revision="${REACT_APP_BUILD_SHA}"
LABEL org.opencontainers.image.ref.name="${REACT_APP_BUILD_REF}"

# 安装静态文件服务 + 创建运行用户
RUN npm i -g serve@14 \
  && addgroup -S app \
  && adduser -S -G app appuser

# 拷贝产物并赋权（关键：让 appuser 能读 dist）
COPY --from=build /app/dist ./dist
COPY serve.json ./serve.json
RUN chown -R appuser:app /app

USER appuser

EXPOSE 3000

# 可选：健康检查（node:alpine 自带 busybox wget）
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["serve", "-s", "dist", "-l", "3000"]
