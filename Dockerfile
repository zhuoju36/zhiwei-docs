# ============ 构建阶段 ============
FROM node:20-alpine AS build

# VitePress 构建需要 git 计算页面「最后更新」时间
RUN apk add --no-cache git

# 启用 pnpm
RUN corepack enable && corepack prepare pnpm@10.16.0 --activate

WORKDIR /app

# 先复制依赖清单，充分利用 Docker 层缓存
COPY package.json pnpm-lock.yaml .npmrc* ./
RUN pnpm install --frozen-lockfile

# 复制源码并构建静态站点
COPY . .
RUN pnpm run docs:build

# ============ 运行阶段 ============
FROM nginx:stable-alpine AS runtime

# 复制构建产物与 nginx 配置
COPY --from=build /app/docs/.vitepress/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
