# 后端模块

止危后端（`shm-backend`）负责业务逻辑、数据存储、实时计算与告警引擎。采用全异步栈：FastAPI + Pydantic v2 + SQLAlchemy 2.0(async) + asyncpg + Celery + Redis + MinIO + TimescaleDB。

## 技术栈

| 层级 | 选型 | 用途 |
| --- | --- | --- |
| Web 框架 | FastAPI 0.141+ | 路由、Pydantic 校验、自动 OpenAPI |
| ORM | SQLAlchemy 2.0 async | 关系表（`Mapped[]` 风格类型注解） |
| 原生驱动 | asyncpg | 时序热路径（`copy_records_to_table`） |
| 配置 | Pydantic v2 Settings | `.env` 加载 + 类型校验 |
| 任务队列 | Celery | 4 队列异步任务 |
| 消息 | Redis Pub/Sub | WebSocket 跨实例广播 |
| 时序 | TimescaleDB 2.x | hypertable + 连续聚合（规划）+ 保留策略 |
| 对象存储 | MinIO（S3 兼容） | 3D 模型、分析附件、报表 |
| 鉴权 | JWT（access 15min + refresh 7d）+ bcrypt | API Key 用于边缘网关 |
| 测试 | pytest + pytest-asyncio | session 级 event loop 复用 |

## 目录结构

```
shm-backend/
├── app/
│   ├── main.py              # FastAPI 应用工厂 + 中间件挂载
│   ├── lifespan.py          # 启动：插件发现、Redis 监听；关闭：释放连接
│   ├── config.py            # Pydantic Settings（环境变量集中管理）
│   ├── database.py          # SQLAlchemy async engine + session 工厂
│   ├── dependencies.py      # FastAPI Depends：DB / JWT / 权限 / API Key
│   ├── core/
│   │   ├── constants.py     # 角色、设备状态、告警级别、分页常量
│   │   ├── exceptions.py    # BizException / AuthException
│   │   ├── security.py      # JWT 编解码、bcrypt（线程池异步化）
│   │   └── middleware.py    # EnvelopeMiddleware + 异常处理工厂
│   ├── models/              # ORM 模型（每个表一个文件）
│   ├── schemas/             # Pydantic 请求 / 响应模型（按领域拆分）
│   ├── routers/             # API 路由（按领域拆分，统一注册到 /api/v1）
│   ├── services/            # 业务逻辑层（路由薄、服务厚）
│   ├── plugins/
│   │   ├── protocols/       # 协议适配器（base 契约 + registry 自动发现）
│   │   └── analyzers/       # 分析算法插件（同上）
│   ├── tasks/               # Celery 应用 + 4 队列任务模块
│   ├── ws/                  # WebSocket 连接管理、Redis Pub/Sub
│   └── utils/               # 纯工具函数
├── scripts/                 # init_db / init_admin / modbus_simulator / mqtt_injector / run_edge_adapter / simulate_data
├── alembic/                 # 数据库迁移
├── tests/                   # pytest 测试集
├── docker-compose.yml       # Postgres / Redis / MinIO / api / worker
├── Dockerfile
├── pyproject.toml           # ruff / pytest 配置
├── requirements.txt
├── .env.example
└── AGENTS.md                # 后端开发规范（最高优先级）
```

## 核心服务

| 模块 | 职责 |
| --- | --- |
| **数据服务**（`services/data_service.py`） | 持有 asyncpg Pool，批量写入 + Redis 缓存与发布；`batch_ingest` 一次完成编码→ID 映射→COPY→缓存→广播 |
| **项目 / 设备 / 传感器 / 通道服务** | 元数据 CRUD + RBAC 校验 |
| **告警服务** | Celery `alerts` 队列异步评估；同 `(channel_id, level)` 唯一未恢复告警 + 抑制窗口 |
| **分析服务** | 提交 / 查询任务；Celery `analysis` 队列消费，结果存 MinIO + 摘要回写数据库 |
| **模型服务** | 3D 模型上传 → MinIO → Celery `reports` 队列 GLB 转换 → 下载 / 删除 |
| **通知服务** | Webhook + Email 多通道并发派发，失败隔离 |
| **WebSocket 管理器**（`ws/manager.py`） | 项目频道管理 + Redis Pub/Sub 跨实例广播 |
| **平台服务** | 单行表 `platform_settings` 维护平台元数据 |
| **用户服务** | admin CRUD + `SELF_PROTECTED` + `LAST_ADMIN` 守卫 |

## Celery 队列

| 队列 | 任务 | 优先级 |
| --- | --- | --- |
| `alerts` | 阈值告警评估、通知派发 | 高 |
| `analysis` | FFT / statistics / 自定义分析 | 中 |
| `reports` | 3D 模型 GLB 转换、报表生成 | 低 |
| `maintenance` | 归档、清理、统计 | 后台 |

启动：

```bash
celery -A app.tasks.celery_app:celery_app worker \
    -Q alerts,analysis,reports,maintenance -c 4 -l info
```

> Celery task 函数内必须自己管理 DB 连接（不能复用 FastAPI 的 session 注入），用 `with engine.connect()` 或独立 `async_session`。

## 持久化层

| 组件 | 用途 | 关键代码 |
| --- | --- | --- |
| PostgreSQL + TimescaleDB | 关系 + 时序 | `scripts/init_db.py`（hypertable / 连续聚合 / 保留策略） |
| Redis 7 | 最新值缓存 + Pub/Sub + Celery broker | `app/services/data_service.py` |
| MinIO | 3D 模型 / 分析附件 / 报表 | `app/services/model_service.py` |

## 横切关注

- **统一响应包装**：`EnvelopeMiddleware`（`app/core/middleware.py`），ASGI 层缓冲后包装
- **异常处理**：`BizException` → 业务码；`RequestValidationError` → 422 + 详细错误数组
- **鉴权**：`Depends(get_current_user)` 注入登录用户；`Depends(check_project_access)` 项目级授权
- **API Key**：`Depends(verify_api_key)` 仅挂在 `POST /data/ingest`
- **跨域**：`CORSMiddleware`，生产禁止 `["*"]`

## 相关链接

- [开发环境](/developer/environment)
- [数据模型](/developer/database/)
- [接口文档](/developer/api/)
- [接入协议](/developer/protocol/)
- [插件开发](/developer/plugin/)