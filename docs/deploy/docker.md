# Docker 部署

本文介绍如何使用 Docker Compose 部署止危后端。前端 `shm-frontend` 与文档站 `shm-docs` 各自有独立的 Dockerfile（前端最终由 Nginx 静态托管，文档站同样）。

## 环境要求

- Docker Engine >= 24.0
- Docker Compose >= 2.20
- 至少 2 核 CPU、4 GB 内存、50 GB 可用磁盘（生产建议 8 核 / 16 GB / SSD）

## 后端服务清单

`shm-backend/docker-compose.yml` 一并管理五个服务：

| 服务 | 镜像 | 端口 | 说明 |
| --- | --- | --- | --- |
| `postgres` | `timescale/timescaledb:latest-pg15` | 5432 | 主数据库（带 TimescaleDB 扩展） |
| `redis` | `redis:7-alpine` | 6379 | 缓存 / Pub/Sub / Celery broker |
| `minio` | `minio/minio:latest` | 9000 / 9001 | 对象存储（控制台在 9001） |
| `api` | `Dockerfile` | 8000 | FastAPI 主服务（含 WebSocket `/ws/data`） |
| `worker` | `Dockerfile` | — | Celery Worker（`alerts` / `analysis` / `reports` / `maintenance` 4 队列） |

## 1. 准备配置文件

```bash
git clone https://github.com/zhiwei-shm/zhiwei.git
cd zhiwei/shm-backend

cp .env.example .env
```

编辑 `.env`，关键配置：

```dotenv
# 数据库
POSTGRES_USER=shm_user
POSTGRES_PASSWORD=change_me
POSTGRES_DB=shm_db

# JWT 与 API Key（生产必须替换）
SECRET_KEY=please-replace-with-256-bit-random
EDGE_API_KEY=please-replace

# Redis
REDIS_URL=redis://redis:6379/0

# MinIO
MINIO_ROOT_USER=minio_admin
MINIO_ROOT_PASSWORD=change_me
MINIO_BUCKET=shm-models

# CORS（生产禁止 *）
CORS_ORIGINS=["http://localhost:5173"]

# 告警通知（可选）
WEBHOOK_URL=
ALERT_EMAIL_TO=
```

> 容器内 DSN 必须用容器名（如 `postgres:5432`、`redis:6379`），不能用 `localhost`。

## 2. 启动基础设施

首次部署先拉起 Postgres / Redis / MinIO，并跑迁移与 TimescaleDB 初始化：

```bash
docker compose up -d postgres redis minio

# 等待 Postgres 健康
docker inspect -f '{{.State.Health.Status}}' shm-postgres
# healthy

# 应用 Alembic 迁移
docker compose run --rm api alembic upgrade head

# 初始化 TimescaleDB（hypertable / 连续聚合 / 保留策略，幂等）
docker compose run --rm api python -m scripts.init_db
```

## 3. 创建首个管理员

`users` 表为空时，通过 `setup` 端点或 CLI 创建 admin（任选其一）：

**端点方式**：访问 `http://<host>:8000/setup`，按页面提示创建。

**CLI 方式**（适合自动化 / Docker）：

```bash
ADMIN_USERNAME=admin \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD='admin12345' \
  docker compose run --rm api python -m scripts.init_admin --base-url http://api:8000
```

容器启动时由 `docker/entrypoint.sh` 在 uvicorn 起来之前自动调用一次 `init_admin`（取决于环境变量是否提供）。

## 4. 启动 API 与 Worker

```bash
docker compose up -d api worker
```

## 5. 访问平台

| 入口 | 地址 |
| --- | --- |
| Swagger UI | `http://localhost:8000/docs` |
| ReDoc | `http://localhost:8000/redoc` |
| 健康检查 | `http://localhost:8000/health` |
| WebSocket | `ws://localhost:8000/ws/data?token=<JWT>` |
| MinIO 控制台 | `http://localhost:9001` |

## 6. 查看日志

```bash
docker compose logs -f
docker compose logs -f api worker
docker compose logs -f --tail 200 api
```

## 7. 停止与更新

停止服务（保留数据卷）：

```bash
docker compose down
```

停止并删除数据卷（**数据丢失，谨慎**）：

```bash
docker compose down -v
```

更新到新版：

```bash
git pull
docker compose pull
docker compose up -d
```

数据库迁移：

```bash
docker compose run --rm api alembic upgrade head
docker compose run --rm api python -m scripts.init_db
```

## 8. 前端 / 文档站

### 前端（`shm-frontend`）

构建静态产物后由 Nginx 托管，或直接连开发服务器：

```bash
cd shm-frontend
npm install
npm run build      # 产物：dist/
```

### 文档站（`shm-docs`，本仓库）

仓库自带 `Dockerfile`，构建独立的文档站镜像：

```bash
docker build -t zhiwei-docs .
docker run -d --name zhiwei-docs -p 8080:80 zhiwei-docs
```

健康检查：

```bash
docker inspect --format '{{.State.Health.Status}}' zhiwei-docs
```

## 生产环境建议

1. **数据库独立部署**：将 Postgres / Redis / MinIO 放到独立主机或托管服务，便于扩展
2. **HTTPS / WSS 终止**：用 Nginx / Traefik 等反向代理并配置 TLS 证书；Nginx 同时反代 `/api/*` 与 `/ws/*`
3. **配置日志轮转**：避免容器日志无限增长占满磁盘
4. **资源限制**：在 `docker-compose.yml` 中为各服务配置 `mem_limit` 与 `cpus`
5. **敏感信息**：用 Docker Secrets / Vault 注入 `SECRET_KEY` / `EDGE_API_KEY` / 数据库密码
6. **定期备份**：参考 [备份与恢复](/deploy/backup)

## 故障排查

| 现象 | 可能原因 | 解决方法 |
| --- | --- | --- |
| API 启动失败 | 数据库未就绪 | `docker compose logs api` 等待 `pg_isready` |
| 时序写入 503 | `init_db.py` 未执行 | 跑 `python -m scripts.init_db` |
| WebSocket 连不上 | Nginx 缺 `Upgrade` 头 | 配置 `proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";` |
| 告警不触发 | `worker` 服务未启动 | `docker compose up -d worker` |
| 边缘网关 401 | `X-API-Key` 不匹配 | 确认 `.env` 中 `EDGE_API_KEY` 与网关配置一致 |

## 下一步

- [配置项说明](/deploy/config)：详细了解所有环境变量
- [备份与恢复](/deploy/backup)：建立数据保护机制
- [版本升级](/deploy/upgrade)：平滑升级到新版
- [Kubernetes 部署](/deploy/k8s)：生产环境 K8s 部署