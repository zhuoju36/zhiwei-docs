# 开发环境

本文介绍如何从源码运行止危的后端、前端与文档站，方便本地开发与调试。

## 环境要求

- Python >= 3.11（推荐 3.12，使用 [`uv`](https://github.com/astral-sh/uv) 管理）
- Node.js >= 20
- Docker Desktop / docker-ce（用于启动 Postgres+TimescaleDB、Redis、MinIO）
- Git

## 仓库结构

```
zhiwei/
├── shm-backend/      # 后端（FastAPI + Celery + 插件）
├── shm-collector/    # 数据采集器（独立进程，可选；v1.0 起重新独立）
├── shm-frontend/     # 前端（Vue 3 + Element Plus + Three.js）
├── shm-docs/         # 本项目（VitePress 文档站）
└── shm-mock/         # （可选）前端本地 mock 数据
```

> v0.9 期间 `shm-collector` 与 `shm-backend` 共进程；v1.0 起重新独立为独立仓，详见 [数据采集器](/developer/collector/)。

## 1. 克隆仓库

```bash
git clone https://github.com/zhuoju36/zhiwei-shm.git
cd zhiwei
```

## 2. 启动后端基础设施

```bash
cd shm-backend

# 启动 Postgres（带 TimescaleDB 扩展）/ Redis / MinIO
docker compose up -d postgres redis minio

# 等待 Postgres 健康
docker inspect -f '{{.State.Health.Status}}' shm-postgres
# healthy
```

## 3. 安装 Python 依赖与初始化数据库

```bash
# 创建虚拟环境
uv python install 3.12
uv venv --python 3.12 .venv

# 安装依赖（推荐中科大源）
uv pip install -r requirements.txt -i https://mirrors.ustc.edu.cn/pypi/simple

# 应用迁移 + TimescaleDB 初始化
cp .env.example .env
.venv/bin/alembic upgrade head
.venv/bin/python -m scripts.init_db
```

## 4. 启动后端 API

```bash
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

后端默认运行在 `http://localhost:8000`。首次访问 `http://localhost:8000/setup` 创建第一个 admin；或 CLI：

```bash
.venv/bin/python -m scripts.init_admin --base-url http://localhost:8000
```

交互式文档：

- `http://localhost:8000/docs`（Swagger UI）
- `http://localhost:8000/redoc`（ReDoc）

## 5. 启动 Celery Worker（独立进程）

```bash
.venv/bin/celery -A app.tasks.celery_app:celery_app worker \
    -Q alerts,analysis,reports,maintenance -c 4 -l info
```

四个队列分别承担：实时告警评估、异步分析计算、报表生成与模型转换、低优先级维护任务。

## 6. 启动前端

```bash
cd ../shm-frontend
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`。

## 7. 启动文档站

```bash
cd ../shm-docs
npm install
npm run docs:dev
```

文档站默认运行在 `http://localhost:5174`。

## 常用命令

```bash
# 测试
cd shm-backend
.venv/bin/python -m pytest
.venv/bin/python -m pytest tests/test_security.py   # 单文件
.venv/bin/python -m pytest -k "ingest"             # 按关键字

# 数据库
.venv/bin/alembic revision --autogenerate -m "msg"   # 生成迁移（审查后再应用）
.venv/bin/alembic upgrade head
.venv/bin/alembic downgrade -1

# 代码质量
.venv/bin/ruff check --fix .
.venv/bin/ruff format .
```

## 下一步

- [后端模块](/developer/backend/)：后端代码结构与职责
- [接口文档](/developer/api/)：RESTful API 完整参考
- [数据模型](/developer/database/)：关系表与时序表
- [接入协议](/developer/protocol/)：协议适配器开发
- [插件开发](/developer/plugin/)：分析算法插件开发