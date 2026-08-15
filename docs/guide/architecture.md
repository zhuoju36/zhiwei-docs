# 系统架构

止危采用前后端分离 + 多服务编排的架构：前端负责交互与可视化，后端负责业务 API、实时计算与告警引擎，数据基础设施由 PostgreSQL（TimescaleDB 扩展）、Redis 与 MinIO 组成。**数据采集**支持两种部署位置——中央采集（后端进程内）和边缘采集（独立 `shm-collector` 进程），通过 HTTP `POST /api/v1/data/ingest` 统一接入。

## 整体拓扑

```
┌─────────────────────────────────────────────────────────────┐
│                     前端 (Vue 3 + Three.js)                  │
│   · 数据大屏 · 数据分析 · 管理后台 · WebSocket 客户端         │
└─────────────────────────────────────────────────────────────┘
                              │  REST + JWT  │  WebSocket
                              ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (反向代理 + 静态托管)                 │
│   / → 前端静态资源  ·  /api/* → FastAPI  ·  /ws/* → /ws/data │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              FastAPI 后端 (uvicorn · 全异步)                  │
│  · routers/ 薄路由        · services/ 业务编排               │
│  · plugins/ 协议 + 分析    · ws/ Redis Pub/Sub 广播          │
└─────────────────────────────────────────────────────────────┘
                              │                │             │
                              ▼                ▼             ▼
                ┌─────────────────┐  ┌───────────────┐ ┌────────────┐
                │ TimescaleDB     │  │ Redis         │ │ MinIO      │
                │ · 关系表        │  │ · 最新值缓存   │ │ · 3D 模型  │
                │ · readings 表   │  │ · Pub/Sub     │ │ · 分析附件  │
                │   (hypertable)  │  │ · Celery broker│ │ · 冷归档   │
                └─────────────────┘  └───────────────┘ └────────────┘
                              ▲
                              │  Celery (alerts / analysis / reports / maintenance)
                              │
                ┌─────────────────────────────┐
                │   Celery Worker (独立进程)    │
                │  · 阈值告警评估              │
                │  · FFT / 统计 / 自定义分析   │
                │  · 3D 模型 GLB 转换          │
                └─────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  shm-collector（可选 · 边缘网关进程 / 现场 PC）                │
│  · 协议适配（Modbus / MQTT / OPC-UA / 自定义）              │
│  · 本地缓存 · 断网续传 · 标准化为 readings 数组              │
│  · 默认 HTTP POST /api/v1/data/ingest (X-API-Key)            │
└─────────────────────────────────────────────────────────────┘
```

> v0.9 阶段 `shm-collector` 与 `shm-backend` 共进程（协议插件收在 `app/plugins/protocols/`）；**v1.0 起重新独立**，作为可选的边缘采集进程部署。后端 `app/plugins/protocols/` 仍保留，承担**中央采集**模式下的协议适配。

## 核心模块

| 模块 | 职责 | 技术栈 |
| --- | --- | --- |
| `shm-frontend` | 前端 SPA、可视化看板、用户交互 | Vue 3 + TypeScript + Vite + Element Plus + Three.js + ECharts + Pinia |
| `shm-backend` | 业务 API、实时计算、告警引擎、中央采集的协议适配、分析插件 | FastAPI + Pydantic v2 + SQLAlchemy 2.0(async) + asyncpg + Celery |
| `shm-collector` | 独立数据采集进程（边缘采集，可选）；协议适配、断网缓存、标准化 | Python 3.11+ · TOML 配置 · 同 /api/v1/data/ingest 契约 |
| `shm-docs` | 文档网站（当前仓库） | VitePress 1.6 + TypeScript |

## 六层数据拓扑

```
用户 → 项目（project）→ 设备（device）→ 传感器（sensor，测点+仪器合一）
                                       → 通道（channel，单位/采样率/告警规则）
                                                  → 读数（readings，hypertable）
```

- **项目**：数据隔离的最小单元，admin 创建 / 普通用户按 `user_projects` 授权访问
- **设备**：协议网关或采集仪，绑定一种协议适配器
- **传感器**：物理位置（`position: {x,y,z}`） + 仪器元数据（型号、厂商、校准日期）
- **通道**：单位、采样率、告警规则都在通道；一个传感器可有 N 个通道（如 IMU 的 X/Y/Z）
- **读数**：`(time, channel_id)` 复合主键，写入 TimescaleDB hypertable

## 数据流

### 高频采集链路

```
边缘网关 ──HTTP/MQTT──▶ POST /api/v1/data/ingest (X-API-Key)
                                  │
                                  ▼
                app/services/data_service.batch_ingest()
                                  │
              ┌───────────────────┼─────────────────────────┐
              ▼                   ▼                         ▼
      asyncpg COPY         Redis SET                Redis PUBLISH
      readings(hypertable) latest:{channel_id}      project:{project_id}
              │                   │                         │
              ▼                   ▼                         ▼
        TimescaleDB        GET /data/latest         WebSocket 广播
                          （毫秒级返回）             （多实例共享频道）
```

### 历史查询 / 告警 / 分析链路

```
前端 ──JWT──▶ GET /api/v1/data/timeseries?channel_id=&start=&end=&interval=
                │
                ▼
        check_project_access (RBAC + 项目级授权)
                │
                ▼
        DataService.query_timeseries → readings hypertable
                （v0.9+ 在 readings 上重建 1min/1h 连续聚合）
```

告警按通道配置规则，由 Celery `alerts` 队列在 `POST /data/ingest` 后异步评估；分析任务由用户提交，Celery `analysis` 队列消费，结果以 NPZ 等附件写入 MinIO。

> **采集位置对下游透明**：采集发生在后端进程内（中央采集）还是独立 `shm-collector` 进程（边缘采集），告警 / 分析 / WebSocket 行为完全一致——这些都是由 `POST /data/ingest` 之后的链路驱动的，与适配器位置无关。

## 持久化层

| 组件 | 用途 |
| --- | --- |
| PostgreSQL + TimescaleDB | 关系表（users / projects / devices / sensors / channels / alerts / 3d_models / analysis_jobs / platform_settings）+ readings hypertable |
| Redis 7 | 最新值缓存（`latest:{channel_id}`）、Pub/Sub（`project:{id}` 频道）、Celery broker |
| MinIO | 3D 模型源文件 + GLB 产物、分析任务附件、报表、冷数据归档 |

## 横切关注

- **协议适配器插件**（`app/plugins/protocols/`）：中央采集场景下由 `pkgutil` 自动扫描注册，新增协议 = 新增一个模块文件
- **数据采集器**（`shm-collector`）：边缘采集场景下的独立进程，自带协议适配器；与后端插件接口签名一致但代码独立，详见 [数据采集器](/developer/collector/)
- **分析算法插件**（`app/plugins/analyzers/`）：内置 FFT、statistics；社区插件通过 Python entry_points（组 `shm_analyzers`）自动发现
- **Celery 任务**（`app/tasks/`）：4 队列 `alerts` / `analysis` / `reports` / `maintenance`
- **WebSocket 实时推送**（`app/ws/`）：Redis Pub/Sub 跨实例广播

## 核心概念

- **项目**：监测范围 / 工程合同，数据隔离的最小单元
- **设备**：采集网关或采集仪，通过协议适配器接入
- **传感器**：物理测点（位置）+ 仪器（型号/校准）
- **通道**：单位、采样率、告警规则；时序数据的寻址粒度
- **读数**：单条时序数据 `(time, channel_id, value, quality)`
- **告警规则**：基于通道 `alert_rules` 数组的阈值条件
- **分析插件**：FFT、统计等异步计算单元

## 扩展性

- 中央采集新协议：在 `shm-backend/app/plugins/protocols/` 加一个 `<name>_adapter.py`（由 `AdapterRegistry` 自动注册）
- 边缘采集新协议：在 `shm-collector` 仓内自带目录加一个 `<name>_adapter.py`，接口签名与后端插件一致；启动时由 collector 扫描加载
- 新分析算法：在 `app/plugins/analyzers/` 加一个插件，或打包成 PyPI 包声明 entry point
- 新可视化组件：前端基于 Vue 3 + ECharts + Three.js 自定义

## 下一步

- [术语表](/guide/glossary)：查看完整术语解释
- [数据采集器](/developer/collector/)：边缘采集场景下的独立进程
- [接入协议](/developer/protocol/)：了解如何接入自定义设备
- [插件开发](/developer/plugin/)：开发自定义扩展