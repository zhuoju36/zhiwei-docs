# 更新日志

本页面跟踪前端与文档站（`shm-docs`）的变更。后端变更详见 `shm-backend` 仓库的 `CHANGELOG` 与 release notes。

## 2026-08-15（v1.0 文档先行）

### 重写

- [docs] `guide/architecture.md`：拓扑图新增 `shm-collector` 节点；核心模块清单 +1；数据流图分中央 / 边缘两种描述；扩展性章节拆分为「中央采集 / 边缘采集」两条路径
- [docs] `developer/backend/index.md`：`app/plugins/protocols/` 标注为「中央采集场景使用」
- [docs] `developer/environment.md`：仓库结构加入 `shm-collector/`（独立仓）
- [docs] `community/roadmap.md`：「完整边缘网关进程」由 v0.10 移到 v1.0 已完成；新增「Collector 直写 TimescaleDB」v1.0 远期条目

### 新增

- [docs] `developer/collector/index.md`：数据采集器独立进程文档（动机 / 何时使用 / 数据契约 / TOML 配置 / 协议适配器 / 断网缓存 / 部署 / 可观测 / 限制）
- [docs] `guide/glossary.md`：「采集器（Collector）」与「中央采集 / 边缘采集」词条
- [docs] `developer/protocol/index.md`：「部署方式选择」段（中央采集 vs 边缘采集）
- [docs] `developer/plugin/index.md`：插件类型表新增「协议插件（边缘采集）」行
- [docs] `deploy/docker.md`：`collector` 服务行（可选）；附独立 compose 提示
- [docs] `deploy/k8s.md`：服务拓扑表新增 `collector`（DaemonSet / Deployment）；新增「Collector Deployment」最小化 YAML
- [docs] `deploy/config.md`：新增「采集器（`shm-collector`）」配置表
- [docs] `.vitepress/config.ts` 侧边栏 `/developer/` 段插入「数据采集器」入口

### 移除

- [docs] 全部「`shm-collector` 已合并到 `shm-backend`」表述替换为 v1.0 独立说明

> 这是**文档层面的拆分**——`shm-collector` 仓库的代码、Docker 镜像、K8s manifest 将在配套的代码仓库同步发布；本仓库的 `Dockerfile` 仍只构建文档站。

## 2026-08-14（与后端 v0.9 对齐）

### 重写

- [docs] 全量对齐后端 v0.9 六层拓扑：`user → project → device → sensor → channel → readings`
- [docs] 移除「结构物（structure）/ 测点（point）」过时概念，与 v0.9 sensor/channel 拆分对齐
- [docs] 重写 `guide/architecture.md`：FastAPI + Pydantic v2 + SQLAlchemy 2.0 async + asyncpg + TimescaleDB + Redis + MinIO + Celery
- [docs] 重写 `guide/quick-start.md`：走 setup 端点 + CLI 创建首个 admin，对齐 `scripts/init_admin.py`
- [docs] 重写 `guide/glossary.md`：补充 channel / sensor / DTU / Continuous Aggregate / GLB 等术语
- [docs] 重写 `user/project/sensor/data/alarm/dashboard/report` 全部页面
- [docs] 重写 `developer/api/backend/database/frontend/protocol/plugin/environment` 全部页面
- [docs] 重写 `deploy/docker/config/backup/k8s/upgrade`：删除 shm-collector、合并 Postgres + TimescaleDB、统一 Celery 4 队列

### 新增

- [docs] `config.ts` 侧边栏删除「结构物与测点」入口
- [docs] `examples/*` 全部按六层拓扑重写并标注通道数 / 采样率
- [docs] `community/roadmap.md` 与后端路线图对齐（v0.9 / v0.10 / v1.0）

## 早期版本

### 0.1.0（未发布 · 旧版快照）

#### 新增

- 项目、结构物、测点、传感器管理（v0.1 旧拓扑，**已废弃**）
- MQTT / HTTP 数据接入
- 实时曲线与特征值查看
- 告警规则与通知
- 可视化看板
- Docker Compose 部署方案
- VitePress 文档网站

> 此版本基于早期拓扑，已被 v0.9 完全重写；保留记录仅为历史参考。