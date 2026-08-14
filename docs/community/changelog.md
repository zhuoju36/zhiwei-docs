# 更新日志

本页面跟踪前端与文档站（`shm-docs`）的变更。后端变更详见 `shm-backend` 仓库的 `CHANGELOG` 与 release notes。

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