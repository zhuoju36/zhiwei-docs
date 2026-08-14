# 配置项说明

本文汇总止危后端可配置的环境变量。所有变量由 Pydantic Settings（`app/config.py`）加载，默认值见 `.env.example`。

## 数据库

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql+asyncpg://shm_user:shm_pass@localhost:5432/shm_db` | SQLAlchemy 异步 DSN；容器内把 `localhost` 换成 `postgres` |
| `TIMESCALE_ENABLED` | `true` | 是否启用 TimescaleDB 特性（hypertable / 连续聚合 / 保留策略） |

`Settings.asyncpg_dsn` 自动把 `postgresql+asyncpg://` 转为 `postgresql://`，供 asyncpg 原生驱动使用。

## 缓存与消息

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `REDIS_URL` | `redis://localhost:6379/0` | 缓存 + Pub/Sub；容器内用 `redis:6379` |
| `CELERY_BROKER_URL` | `redis://localhost:6379/1` | Celery broker（独立 db） |
| `CELERY_RESULT_BACKEND` | `redis://localhost:6379/2` | Celery 结果后端（独立 db） |

## 对象存储（MinIO）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MINIO_ENDPOINT` | `localhost:9000` | 容器内用 `minio:9000` |
| `MINIO_ACCESS_KEY` | `minio_admin` | 与 `MINIO_ROOT_USER` 对齐 |
| `MINIO_SECRET_KEY` | `change_me` | 与 `MINIO_ROOT_PASSWORD` 对齐 |
| `MINIO_BUCKET` | `shm-models` | 3D 模型与分析附件桶 |

## 安全

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SECRET_KEY` | `dev-only-secret-key-change-in-production` | JWT 签名密钥，**生产必须替换为 256 位随机** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | access token 过期时间 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | refresh token 过期时间 |
| `EDGE_API_KEY` | `edge-secret-key` | 边缘网关接入 API Key，**生产必须替换** |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | 前端域名列表，**生产禁止 `["*"]`** |

## 跨域

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | 允许跨域的前端地址列表（JSON 数组） |

## 告警通知（v0.5+，全局配置）

```dotenv
# Webhook 通道
WEBHOOK_URL=                     # 例：https://oapi.dingtalk.com/robot/send?access_token=...
WEBHOOK_HEADERS=                 # JSON 字符串，如 '{"X-Custom":"v1"}'
WEBHOOK_TIMEOUT_SECONDS=10

# Email 通道
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_USE_TLS=true
SMTP_FROM=                        # 默认等于 SMTP_USER
ALERT_EMAIL_TO=                  # 逗号分隔
```

任一通道未配置则跳过；告警新建 / 重开时多通道并发派发，失败隔离。

## 首次部署引导（setup）

```dotenv
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD='admin12345'
```

`docker/entrypoint.sh` 在容器启动时若以上环境变量齐备，会自动调用 `python -m scripts.init_admin`。生产推荐用 Docker Secrets / Kubernetes Secret 注入敏感字段，避免明文写入 compose 文件。

## 监控（v0.5+，可选）

```dotenv
# Prometheus metrics 暴露在 /metrics
METRICS_ENABLED=true
```

## 文档站

`shm-docs`（本仓库）的 `package.json` 仅暴露前端命令：

| 命令 | 说明 |
| --- | --- |
| `npm run docs:dev` | 本地开发（端口 5174） |
| `npm run docs:build` | 生产构建（产出 `docs/.vitepress/dist/`） |
| `npm run docs:preview` | 本地预览生产产物（端口 5174） |

经 `shm-gateway` 网关以 `/docs/` 子路径挂载；`vitepress.config.ts` 中 `base: '/docs/'`。

## 相关链接

- [Docker 部署](/deploy/docker)
- [备份与恢复](/deploy/backup)
- [后端开发环境](https://github.com/zhiwei-shm/zhiwei/tree/main/shm-backend/docs/development/setup.md)