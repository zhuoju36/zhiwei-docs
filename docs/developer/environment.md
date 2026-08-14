# 开发环境

本文介绍如何从源码运行止危的前后端服务，方便本地开发与调试。

## 环境要求

- Node.js >= 20
- pnpm >= 9（或 npm / yarn）
- Docker（用于启动 PostgreSQL、时序数据库、Redis）
- Git

## 仓库结构

```
zhiwei/
├── shm-frontend/     # 前端项目
├── shm-backend/      # 后端项目
├── shm-collector/    # 数据采集网关
└── shm-docs/         # 文档网站
```

## 1. 克隆仓库

```bash
git clone https://github.com/zhiwei-shm/zhiwei.git
cd zhiwei
```

## 2. 启动基础设施

```bash
docker compose -f docker-compose.dev.yml up -d postgres timescaledb redis mqtt
```

## 3. 启动后端

```bash
cd shm-backend
pnpm install
pnpm dev
```

后端默认运行在 `http://localhost:3000`。

## 4. 启动前端

```bash
cd shm-frontend
pnpm install
pnpm dev
```

前端默认运行在 `http://localhost:5173`。

## 5. 启动文档站

```bash
cd shm-docs
pnpm install
pnpm docs:dev
```

文档站默认运行在 `http://localhost:5174`。

## 下一步

- [前端模块](/developer/frontend/)
- [后端模块](/developer/backend/)
- [贡献指南](/developer/contribute)
