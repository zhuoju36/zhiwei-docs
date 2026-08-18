# 止危——开源的结构健康监测平台文档

> 止危结构健康监测（Structural Health Monitoring）平台用户与开发者文档站
> 版本：**0.1.9** · 文档同步于 2026-08-18

本站基于 VitePress 1.6 构建，对外提供「指南 / 用户手册 / 开发者 / 部署 / 案例 / 社区」六大板块的完整文档。版本号与 `package.json` 同步，每次内容变更通过 `chore(release): bump version to x.y.z` 提交推送。

## 内容导览

| 板块 | 路径 | 适合 |
| --- | --- | --- |
| 指南 | `docs/guide/` | 快速了解止危：什么是止危 / 快速开始 / 系统架构 / 术语表 / FAQ |
| 用户手册 | `docs/user/` | 平台使用者：项目管理 / 传感器与通道 / 数据采集与查看 / 告警规则 / 报表与导出 / 可视化看板 |
| 开发者 | `docs/developer/` | 系统集成与扩展：环境 / 前端模块 / 后端模块 / 数据采集器 / 接口文档 / 数据模型 / 接入协议 / 插件开发 / 贡献指南 |
| 部署 | `docs/deploy/` | 运维：Docker 部署 / Kubernetes 部署 / 配置项 / 备份与恢复 / 版本升级 |
| 案例 | `docs/examples/` | 业务实践：桥梁 / 建筑 / 风机 / 铁路监测 |
| 社区 | `docs/community/` | 团队 / 路线图 / 更新日志 / 联系我们 |

## 技术栈

| 层级 | 选型 |
| --- | --- |
| 站点框架 | VitePress 1.6 |
| 包管理 | pnpm 10（`packageManager` 字段锁定） |
| 类型 | TypeScript 5.3（仅 `config.ts`） |
| 渲染 | Vue 3.5 + Vite（VitePress 内置） |
| 部署产物 | 静态站点（Nginx 镜像） |

## 快速开始

环境要求：Node.js ≥ 20、pnpm ≥ 10。

```bash
# 1. 安装依赖
pnpm install

# 2. 本地开发（热重载，默认 http://localhost:5174/docs/）
pnpm docs:dev

# 3. 生产构建（产物在 docs/.vitepress/dist/）
pnpm docs:build

# 4. 预览生产产物
pnpm docs:preview
```

`pnpm docs:dev` 启动后所有 `docs/` 下 Markdown 改动会自动热重载；侧边栏与导航配置集中在 `docs/.vitepress/config.ts`。

## 目录结构

```
shm-docs/
├── docs/
│   ├── .vitepress/
│   │   ├── config.ts          # VitePress 配置：导航 / 侧边栏 / 主题
│   │   └── public/            # 静态资源（图标 / favicon / logo）
│   ├── guide/                 # 指南
│   ├── user/                  # 用户手册
│   ├── developer/             # 开发者文档
│   │   ├── api/               # 16 页完整 REST + WebSocket 接口参考
│   │   ├── backend/           # 后端模块技术说明
│   │   ├── collector/         # 数据采集器（边缘进程）
│   │   ├── frontend/          # 前端模块概览
│   │   ├── architecture-backend.md
│   │   ├── coding-standards.md
│   │   ├── database/          # 数据模型
│   │   ├── frontend-coding.md
│   │   ├── plugin/            # 协议 + 分析插件开发
│   │   ├── protocol/          # 协议层接入
│   │   ├── testing.md
│   │   └── simulation.md
│   ├── deploy/                # 部署运维
│   ├── examples/              # 实践案例
│   ├── community/             # 社区 / 更新日志
│   ├── about/                 # 关于 / 协议
│   └── index.md               # 首页（hero + 特性）
├── Dockerfile                 # 文档站镜像（Nginx 静态托管）
├── nginx.conf                 # Nginx 配置（gzip / SPA fallback）
├── package.json
├── pnpm-lock.yaml
└── README.md
```

## 镜像构建与发布

```bash
docker build -t zhiwei-docs:0.1.9 .
docker run -d --name zhiwei-docs -p 8080:80 zhiwei-docs:0.1.9
```

健康检查：

```bash
docker inspect --format '{{.State.Health.Status}}' zhiwei-docs
```

镜像基于 `nginx:stable-alpine`，把 `docs/.vitepress/dist/` 复制到 `/usr/share/nginx/html`，`nginx.conf` 配置了 gzip 压缩与 SPA fallback（虽然本站无客户端路由，但保留以防扩展）。

## 贡献指南

文档改动流程：

1. 编辑 `docs/<section>/<page>.md`
2. `pnpm docs:dev` 本地预览
3. 在 `package.json` 把 `version` patch +1（如 0.1.4 → 0.1.5）
4. 在 `docs/community/changelog.md` 加一条变更记录（按日期段）
5. 提交 + push

侧边栏、导航、社交链接等结构改动只动 `docs/.vitepress/config.ts`；新增板块要先在 `config.ts` 加 `nav` 与 `sidebar` 条目再加内容。

详细规则见 [贡献指南](docs/developer/contribute.md) 与 [后端开发规范](https://github.com/zhuoju36/zhiwei-backend/tree/main/AGENTS.md)（最高优先级）。

## 仓库镜像

| 平台 | 地址 |
| --- | --- |
| GitHub | https://github.com/zhuoju36/zhiwei-shm |
| Gitee | https://gitee.com/zhuoju36/zhiwei-shm |
| CNB（CI 镜像仓库） | https://cnb.cool/nedop/shm/shm-docs |

## 相关仓库

| 仓库 | 用途 |
| --- | --- |
| [zhiwei-backend](https://github.com/zhuoju36/zhiwei-backend) | FastAPI 主进程 + Celery + 协议 / 分析插件 |
| [zhiwei-frontend](https://github.com/zhuoju36/zhiwei-frontend) | Vue 3 + Three.js + ECharts 数据大屏 |
| [zhiwei-collector](https://github.com/zhuoju36/zhiwei-shm)（v1.0 起独立） | 独立边缘采集进程 |

## 协议

[MIT](LICENSE)